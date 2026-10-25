import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
export function normalizeEndpoint(value) {
  let url;
  try { url = new URL(value); } catch { throw Error('Invalid Ollama endpoint.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw Error('Endpoint must use HTTP(S) without credentials, query, or fragment.');
  url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/v1$/, '');
  return url.href.replace(/\/$/, '');
}
export async function resolveInferencePolicy(options = {}, dependencies = {}) {
  const endpoint = normalizeEndpoint(options.ollamaEndpoint || 'http://localhost:11434');
  const host = new URL(endpoint).hostname;
  const route = ['localhost', '127.0.0.1', '[::1]'].includes(host) ? 'loopback' : 'remote';
  if (!options.allowRemote && (route === 'remote' || /cloud/i.test((options.model || '').split(':').slice(1).join(':')))) throw Error('Remote endpoints and cloud-tagged models require --allow-remote.');
  const provider = options.ocrProvider || 'ollama';
  if (!/^[A-Za-z0-9_-]+$/.test(provider)) throw Error('Invalid OCR provider name.');
  let config;
  try {
    config = await (dependencies.readOcrConfig || (() => JSON.parse(fs.readFileSync(path.join(os.homedir(), '.opencodereview/config.json'), 'utf8'))))();
  } catch { throw Error('OCR configuration could not be read. Configure a custom Ollama provider manually.'); }
  const entry = config?.custom_providers?.[provider];
  if (!entry || entry.protocol !== 'openai' || typeof entry.url !== 'string' || normalizeEndpoint(entry.url) !== endpoint || !entry.url.replace(/\/+$/, '').endsWith('/v1')) throw Error('Selected custom OCR provider must match the requested Ollama endpoint and use OpenAI protocol.');
  if (entry.api_key_cmd || typeof entry.api_key !== 'string' || !entry.api_key.trim()) throw Error('Use a static placeholder credential for the selected Ollama provider; credential commands are not supported.');
  const models = [entry.model, ...(Array.isArray(entry.models) ? entry.models : [])];
  if (!models.includes(options.model)) throw Error('Selected model must be configured for the named OCR provider.');
  return { provider, endpoint, model: options.model, route, locality: 'unverified', warnings: ['Endpoint routing is verified; model locality and daemon forwarding are not verified.'] };
}
