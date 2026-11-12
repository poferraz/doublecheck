import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// OCR 1.13.3 (375f64cd6f67a48a135da83cfcf59c52669a09cb), `ocr llm providers`.
// internal/llm/resolver.go resolves these names in providers, never custom_providers.
const presetProviders = new Set([
  'anthropic', 'baidu-qianfan', 'bedrock', 'chatgpt', 'dashscope', 'dashscope-tokenplan',
  'deepseek', 'edenai', 'gemini', 'hy-tokenplan', 'iflytek', 'kimi', 'kimi-global',
  'litellm', 'mimo', 'minimax', 'minimax-cn', 'mistral', 'novita', 'ollama-cloud',
  'openai', 'openai-responses', 'openrouter', 'siliconflow', 'siliconflow-cn',
  'tencent-tokenhub', 'volcengine', 'xai', 'z-ai', 'z-ai-coding'
]);
export function normalizeEndpoint(value) {
  let url;
  try { url = new URL(value); } catch { throw Error('Invalid Ollama endpoint.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw Error('Endpoint must use HTTP(S) without credentials, query, or fragment.');
  url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/v1$/, '');
  return url.href.replace(/\/$/, '');
}
function endpointRouting(options) {
  const endpoint = normalizeEndpoint(options.ollamaEndpoint || 'http://localhost:11434');
  const host = new URL(endpoint).hostname;
  const route = ['localhost', '127.0.0.1', '[::1]'].includes(host) ? 'loopback' : 'remote';
  if (route === 'remote' && options.allowRemote !== true) throw Error('Remote endpoint requires --allow-remote.');
  return { endpoint, route };
}
export async function listInstalledModels(options) {
  const { endpoint } = endpointRouting(options);
  const response = await (options.fetch || globalThis.fetch)(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(3000), redirect: 'error' });
  if (!response.ok) throw Error('Ollama readiness request failed.');
  const data = await response.json();
  if (!Array.isArray(data?.models)) throw Error('Ollama returned an invalid model list.');
  return data.models.filter(m => typeof m?.name === 'string' && m.name && !/embed|bge/i.test(m.name));
}
export async function resolveInferencePolicy(options = {}, dependencies = {}) {
  if (typeof options.model !== 'string' || !options.model.trim()) throw Error('An explicit installed model is required.');
  const { endpoint, route } = endpointRouting(options);
  if (options.allowRemote !== true && /cloud/i.test(options.model.split(':').slice(1).join(':'))) throw Error('Cloud-tagged models require --allow-remote.');
  const provider = options.ocrProvider || 'ollama';
  if (typeof provider !== 'string' || !/^[A-Za-z0-9_-]+$/.test(provider)) throw Error('Invalid OCR provider name.');
  if (presetProviders.has(provider.toLowerCase())) throw Error('Built-in OCR provider names cannot select a custom provider. Use a distinct custom name.');
  let config;
  try {
    config = await (dependencies.readOcrConfig || (() => JSON.parse(fs.readFileSync(path.join(os.homedir(), '.opencodereview/config.json'), 'utf8'))))();
  } catch { throw Error('OCR configuration could not be read. Configure a custom Ollama provider manually.'); }
  const entry = config?.custom_providers?.[provider];
  if (!entry || entry.protocol !== 'openai' || typeof entry.url !== 'string' || normalizeEndpoint(entry.url) !== endpoint || !entry.url.replace(/\/+$/, '').endsWith('/v1')) throw Error('Selected custom OCR provider must match the requested Ollama endpoint and use OpenAI protocol.');
  if (entry.api_key_cmd || typeof entry.api_key !== 'string' || !entry.api_key.trim()) throw Error('Use a static placeholder credential for the selected Ollama provider; credential commands are not supported.');
  const models = [entry.model, ...(Array.isArray(entry.models) ? entry.models : [])];
  const modelIdentity = name => name.replace(/:latest$/, '');
  if (!models.some(name => typeof name === 'string' && modelIdentity(name) === modelIdentity(options.model))) throw Error('Selected model must be configured for the named OCR provider.');
  const installed = dependencies.installedModels ?? await listInstalledModels(options);
  const matches = installed.filter(m => m.name === options.model || m.name === `${options.model}:latest`);
  if (!matches.length) throw Error('Selected model must be installed.');
  const remoteModel = matches.some(m => m.remote_model || m.remote_host);
  if (remoteModel && options.allowRemote !== true) throw Error('Ollama reports remote model backing; use --allow-remote.');
  const warning = remoteModel ? 'Ollama reports remote model backing; remote routing was allowed.' : 'Endpoint routing is verified; model locality and daemon forwarding are not verified.';
  return { provider, endpoint, model: options.model, route, locality: 'unverified', warnings: [warning] };
}
