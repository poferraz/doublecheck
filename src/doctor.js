import { createOcrRunner } from './ocr-process.js';
import { listInstalledModels, resolveInferencePolicy } from './inference-policy.js';
const preferred = ['qwen2.5-coder:32b', 'qwen2.5-coder:14b', 'qwen2.5-coder:7b', 'deepseek-coder', 'codestral', 'llama3'];
export const isSupportedOcrVersion = output => /^open-code-review v1\.13\.3(?:\s|$)/.test(String(output));
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
    const installedModels = await listInstalledModels(options);
    const names = installedModels.map(m => m.name);
    const requested = names.find(n => n === options.model || n === `${options.model}:latest`);
    const candidates = options.model ? [requested].filter(Boolean) : [...new Set(names)];
    ollamaReady = names.length > 0;
    while (candidates.length) {
      const candidate = options.model ? candidates[0] : selectBestModel(candidates);
      try {
        inference = await resolveInferencePolicy({ ...options, model: candidate }, { readOcrConfig: options.readOcrConfig, installedModels });
        activeModel = candidate;
        break;
      } catch (error) {
        if (options.model) throw error;
        candidates.splice(candidates.indexOf(candidate), 1);
      }
    }
    if (!inference) throw Error('No configured usable model is installed.');
    warnings.push(...inference.warnings);
  } catch (error) {
    // Errors produced by dependencies may contain credentials or response content.
    errors.push('Inference preflight failed. Check the endpoint, installed model, --allow-remote, and matching custom OCR provider configuration.');
  }
  try {
    const version = await createOcrRunner(options.execFileSync)('ocr', ['version'], { stdio: 'pipe', encoding: 'utf8', timeout: 3000, maxBuffer: 65536 });
    if (!isSupportedOcrVersion(version)) throw Error('Unsupported version');
    ocrAvailable = true;
  } catch { errors.push('Alibaba OCR 1.13.3 is required; other versions need conformance verification.'); }
  return { ok: errors.length === 0 && ollamaReady && ocrAvailable && !!inference, nodeVersion: process.versions.node, ollamaReady, activeModel, ocrAvailable, inference, warnings, errors };
}
