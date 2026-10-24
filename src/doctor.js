import { execSync } from 'child_process';

const PREFERRED_MODELS = [
  'deepseek-v4.1-flash:1017-cloud',
  'deepseek-v4.1-flash',
  'deepseek-coder',
  'qwen2.5-coder:32b',
  'qwen2.5-coder:14b',
  'qwen2.5-coder:7b',
  'qwen2.5-coder',
  'mistral-large-4:cloud',
  'mistral-large',
  'codestral',
  'llama3.3',
  'llama3'
];

export function selectBestModel(models = []) {
  if (!Array.isArray(models) || models.length === 0) {
    return 'deepseek-v4.1-flash:1017-cloud';
  }

  const modelNames = models.map(m => (typeof m === 'string' ? m : m.name)).filter(Boolean);

  // 1. Check in priority order
  for (const preferred of PREFERRED_MODELS) {
    const match = modelNames.find(name => name === preferred || name.startsWith(preferred));
    if (match) return match;
  }

  // 2. Filter out embedding models
  const chatModels = modelNames.filter(name => !name.includes('embed') && !name.includes('bge'));
  return chatModels[0] || modelNames[0] || 'deepseek-v4.1-flash:1017-cloud';
}

export async function checkEnvironment(options = {}) {
  const endpoint = options.ollamaEndpoint || 'http://localhost:11434';
  const warnings = [];
  const errors = [];
  let ollamaReady = false;
  let activeModel = options.model || '';
  let ocrAvailable = false;

  // 1. Verify Node.js version
  const majorVersion = parseInt(process.versions.node.split('.')[0], 10);
  if (majorVersion < 18) {
    errors.push(`Node.js version 18+ required (detected v${process.versions.node}).`);
  }

  // 2. Check local Ollama readiness
  try {
    const res = await fetch(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      ollamaReady = true;
      if (!activeModel) {
        activeModel = selectBestModel(data.models || []);
      }
    } else {
      errors.push(`Ollama responded with HTTP ${res.status}: ${res.statusText}`);
    }
  } catch (err) {
    errors.push(
      `Could not connect to local Ollama at ${endpoint}. Please ensure Ollama is installed and running ('ollama serve').`
    );
  }

  // 3. Check for Alibaba OCR CLI tool
  if (!options.skipOcrCheck) {
    try {
      execSync('which ocr', { stdio: 'ignore' });
      ocrAvailable = true;
    } catch {
      warnings.push(
        `Alibaba Open Code Review ('ocr' CLI) is not installed globally. Run 'npm install -g @alibaba-group/open-code-review' for full AST analysis.`
      );
    }
  } else {
    ocrAvailable = true;
  }

  const ok = errors.length === 0 && ollamaReady;

  return {
    ok,
    nodeVersion: process.versions.node,
    ollamaReady,
    activeModel,
    ocrAvailable,
    warnings,
    errors
  };
}
