import { execFileSync } from 'node:child_process';
import { normalizeEndpoint, resolveInferencePolicy } from './inference-policy.js';
const preferred = ['qwen2.5-coder:32b', 'qwen2.5-coder:14b', 'qwen2.5-coder:7b', 'deepseek-coder', 'codestral', 'llama3'];
export function selectBestModel(models = []) {
  if (!Array.isArray(models)) return null;
  const names = models.map(m => typeof m === 'string' ? m : m?.name).filter(n => typeof n === 'string' && n && !/embed|bge/i.test(n));
  for (const tag of preferred) { const found = names.find(n => n === tag || n === `${tag}:latest`); if (found) return found; }
  return names.find(n => !/cloud/i.test(n.split(':').slice(1).join(':'))) || names[0] || null;
}
export async function checkEnvironment(options = {}) {
  const errors = []; const warnings = []; let activeModel = null; let inference = null; let ollamaReady = false; let ocrAvailable = false;
  if (Number(process.versions.node.split('.')[0]) < 20) errors.push('Node.js 20+ is required.');
  try {
    const endpoint = normalizeEndpoint(options.ollamaEndpoint || 'http://localhost:11434');
    if (!options.allowRemote && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(endpoint).hostname)) throw Error('Remote endpoint requires --allow-remote.');
    const response = await (options.fetch || globalThis.fetch)(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(3000), redirect: 'error' });
    if (!response.ok) throw Error('Ollama readiness request failed.');
    const data = await response.json();
    if (!Array.isArray(data.models)) throw Error('Ollama returned an invalid model list.');
    const names = data.models.map(m => m?.name).filter(n => typeof n === 'string' && !/embed|bge/i.test(n));
    activeModel = options.model ? names.find(n => n === options.model || n === `${options.model}:latest`) || null : selectBestModel(data.models);
    if (!activeModel) throw Error('Requested usable model is not installed.');
    ollamaReady = true;
    inference = await resolveInferencePolicy({ ...options, model: activeModel }, { readOcrConfig: options.readOcrConfig });
    warnings.push(...inference.warnings);
  } catch (error) {
    // Errors produced by dependencies may contain credentials or response content.
    errors.push('Inference preflight failed. Check the endpoint, installed model, --allow-remote, and matching custom OCR provider configuration.');
  }
  try {
    const version = (options.execFileSync || execFileSync)('ocr', ['version'], { stdio: 'pipe', encoding: 'utf8', timeout: 3000, maxBuffer: 65536 });
    if (!/open-code-review v1\.13\.3\b/.test(String(version))) throw Error('Unsupported version');
    ocrAvailable = true;
  } catch { errors.push('Alibaba OCR 1.13.3 is required; other versions need conformance verification.'); }
  return { ok: errors.length === 0 && ollamaReady && ocrAvailable && !!inference, nodeVersion: process.versions.node, ollamaReady, activeModel, ocrAvailable, inference, warnings, errors };
}
