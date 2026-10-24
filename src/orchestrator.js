import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function defaultAlibabaRunner(targetPath, options = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doublecheck-'));
  const outputFile = path.join(tempDir, 'output.json');

  const resolved = path.resolve(targetPath || '.');
  const isDirectory = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory();

  const args = ['scan'];
  if (isDirectory) {
    args.push('--repo', resolved);
  } else {
    args.push('--path', resolved);
  }
  args.push(
    '--format', 'json',
    '-o', outputFile,
    '--no-plan',
    '--concurrency', String(options.concurrency || 4)
  );

  if (options.model) {
    args.push('--model', options.model);
  }

  const runner = options.execFileSync || execFileSync;

  try {
    runner('ocr', args, {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: options.timeout || 300000
    });

    if (fs.existsSync(outputFile)) {
      const raw = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      return raw.comments || (Array.isArray(raw) ? raw : []);
    }
  } catch (err) {
    throw new Error(`Alibaba OCR scan failed: ${err.message}`);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
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
