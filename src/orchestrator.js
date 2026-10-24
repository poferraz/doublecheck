import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function defaultAlibabaRunner(targetPath, options = {}) {
  const outputFile = path.join(
    options.tempDir || '/tmp',
    `doublecheck_ocr_${Date.now()}.json`
  );

  const modelArg = options.model ? `--model ${options.model}` : '';
  const concurrencyArg = options.concurrency ? `--concurrency ${options.concurrency}` : '--concurrency 4';

  const resolved = path.resolve(targetPath || '.');
  const isDirectory = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory();
  const repoArg = isDirectory ? `--repo "${resolved}"` : '';
  const pathArg = !isDirectory ? `--path "${resolved}"` : '';

  try {
    const cmd = `ocr scan ${repoArg} ${pathArg} --format json -o "${outputFile}" --no-plan ${concurrencyArg} ${modelArg}`.replace(/\s+/g, ' ').trim();
    execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: options.timeout || 300000 });

    if (fs.existsSync(outputFile)) {
      const raw = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      try { fs.unlinkSync(outputFile); } catch {}
      return raw.comments || (Array.isArray(raw) ? raw : []);
    }
  } catch (err) {
    throw new Error(`Alibaba OCR scan failed: ${err.message}`);
  }

  return [];
}

export async function defaultCloudflareRunner(targetPath, options = {}) {
  // In CLI mode, if a pre-computed or agent findings file is supplied:
  if (options.findingsFile && fs.existsSync(options.findingsFile)) {
    return JSON.parse(fs.readFileSync(options.findingsFile, 'utf8'));
  }
  return [];
}

export async function runDualAudit(targetPath, options = {}) {
  const errors = [];
  let cloudflareFindings = [];
  let alibabaComments = [];

  const cfRunner = options.cloudflareRunner || defaultCloudflareRunner;
  const aliRunner = options.alibabaRunner || defaultAlibabaRunner;

  // Run Cloudflare Adversary Lens
  try {
    cloudflareFindings = await cfRunner(targetPath, options);
  } catch (err) {
    errors.push(`Cloudflare Security Audit lens error: ${err.message}`);
  }

  // Run Alibaba Architect Lens
  try {
    alibabaComments = await aliRunner(targetPath, options);
  } catch (err) {
    errors.push(`Alibaba Open Code Review lens error: ${err.message}`);
  }

  return {
    targetPath,
    modelUsed: options.model || 'auto',
    timestamp: new Date().toISOString(),
    cloudflareFindings: Array.isArray(cloudflareFindings) ? cloudflareFindings : [],
    alibabaComments: Array.isArray(alibabaComments) ? alibabaComments : [],
    errors
  };
}
