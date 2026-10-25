import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { normalizeFindings, diagnostic } from './contracts.js';
import { resolveInferencePolicy } from './inference-policy.js';
import { emptyEngine, parseCoverage, constrainCompletion, validateCustomEngine } from './engine-result.js';

export function resolveAuditTarget(targetPath = '.') {
  const resolved = fs.realpathSync(path.resolve(targetPath));
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory() && !stat.isFile()) throw Error('Target must be a file or directory');
  const directory = stat.isDirectory() ? resolved : path.dirname(resolved);
  let targetRoot = directory; let revision = null;
  try { targetRoot = fs.realpathSync(execFileSync('git', ['-C', directory, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).trim()); } catch {}
  try { revision = execFileSync('git', ['-C', targetRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).trim(); } catch {}
  return { targetRoot, selectedPath: path.relative(targetRoot, resolved).split(path.sep).join('/'), revision };
}
function readJson(file) {
  if (fs.statSync(file).size > 16 * 1024 * 1024) throw Error('Oversized findings file');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
export async function defaultAlibabaRunner(targetPath, options = {}) {
  const target = options.target || resolveAuditTarget(targetPath);
  const result = emptyEngine('architect', 'failed', null, target, 'native');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doublecheck-'));
  const outputFile = path.join(tmp, 'output.json');
  const runner = options.execFileSync || execFileSync;
  try {
    const inference = await resolveInferencePolicy(options, { readOcrConfig: options.readOcrConfig });
    const versionText = runner('ocr', ['version'], { encoding: 'utf8', stdio: 'pipe', timeout: 3000 });
    result.provenance.version = String(versionText).match(/v(\d+\.\d+\.\d+)/)?.[1] ?? null;
    const args = ['scan', '--repo', target.targetRoot];
    if (target.selectedPath) args.push('--path', target.selectedPath);
    args.push('--format', 'json', '-o', outputFile, '--no-plan', '--concurrency', String(options.concurrency || 4));
    args.push('--model', inference.model, '--provider', inference.provider);
    let processFailed = false;
    try { runner('ocr', args, { stdio: 'pipe', encoding: 'utf8', timeout: options.timeout || 300000, maxBuffer: 1024 * 1024 }); }
    catch { processFailed = true; result.diagnostics.push(diagnostic('OCR_PROCESS_FAILED', 'architect')); }
    if (!fs.existsSync(outputFile)) { result.diagnostics.push(diagnostic('MISSING_OCR_OUTPUT', 'architect')); return result; }
    const raw = readJson(outputFile);
    const payload = Array.isArray(raw) ? raw : raw?.comments;
    const normalized = normalizeFindings('architect', payload, target);
    result.findings = normalized.findings;
    result.diagnostics.push(...normalized.diagnostics);
    result.status = ['complete', 'partial', 'failed', 'skipped'].includes(raw.status) ? raw.status : 'partial';
    if (raw.manifest?.schema_version === 'ocr.run-manifest/v1') {
      result.coverage = parseCoverage(raw.manifest.coverage, target.targetRoot, true);
      if (raw.manifest.terminal_state !== raw.status) result.status = 'partial';
      if (raw.manifest.run_failure) result.status = 'failed';
    }
    result.provenance.revision = target.revision;
    result.provenance.provider = typeof raw.llm?.provider === 'string' ? raw.llm.provider : null;
    result.provenance.model = typeof raw.llm?.model === 'string' ? raw.llm.model : null;
    result.provenance.endpoint = inference.endpoint;
    if (result.coverage.origin === 'unknown') result.diagnostics.push(diagnostic('UNKNOWN_NATIVE_COVERAGE', 'architect'));
    if (normalized.invalidRecordCount || raw.summary?.budget_exceeded || Array.isArray(raw.warnings) && raw.warnings.length) {
      if (result.status !== 'failed') result.status = 'partial';
      result.diagnostics.push(diagnostic('OCR_PARTIAL_RESULT', 'architect'));
    }
    if (processFailed) result.status = result.findings.length ? 'partial' : 'failed';
    if (result.provenance.provider !== inference.provider || result.provenance.model !== inference.model) {
      result.status = 'partial'; result.diagnostics.push(diagnostic('INFERENCE_IDENTITY_MISMATCH', 'architect'));
    }
    return constrainCompletion(result);
  } catch { result.diagnostics.push(diagnostic('INVALID_OCR_RESULT', 'architect')); result.status = 'failed'; return result; }
  finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
export async function defaultCloudflareRunner(targetPath, options = {}) {
  const target = options.target || resolveAuditTarget(targetPath);
  const result = emptyEngine('adversary', options.findingsFile ? 'failed' : 'skipped', options.findingsFile ? null : 'NO_ADVERSARY_INPUT', target, 'import');
  if (!options.findingsFile) return result;
  try {
    const normalized = normalizeFindings('adversary', readJson(options.findingsFile), target);
    result.findings = normalized.findings; result.status = 'partial';
    result.diagnostics = [...normalized.diagnostics, diagnostic('UNKNOWN_IMPORT_COVERAGE', 'adversary')];
  } catch { result.diagnostics.push(diagnostic('INVALID_ADVERSARY_INPUT', 'adversary')); }
  return result;
}
export async function runDualAudit(targetPath, options = {}) {
  const target = resolveAuditTarget(targetPath);
  const reviewMode = options.reviewMode || 'dual';
  if (!['dual', 'architect'].includes(reviewMode)) throw Error('Invalid review mode');
  const requiredSources = reviewMode === 'dual' ? ['adversary', 'architect'] : ['architect'];
  const engines = [];
  for (const [source, custom, native] of [['adversary', options.cloudflareRunner, defaultCloudflareRunner], ['architect', options.alibabaRunner, defaultAlibabaRunner]]) {
    if (!requiredSources.includes(source)) { engines.push(emptyEngine(source, 'skipped', 'LENS_NOT_REQUESTED', target)); continue; }
    try {
      const raw = await (custom || native)(targetPath, { ...options, target });
      engines.push(custom ? validateCustomEngine(source, raw, target) : raw);
    } catch { engines.push(emptyEngine(source, 'failed', 'ENGINE_FAILED', target)); }
  }
  const required = engines.filter(e => requiredSources.includes(e.source));
  const complete = required.every(e => e.status === 'complete');
  const usable = required.some(e => e.status === 'complete' || e.status === 'partial' || e.findings.length);
  const status = complete ? 'complete' : usable ? 'partial' : 'failed';
  const findings = engines.flatMap(e => e.findings);
  return { targetPath, reviewMode, requiredSources, timestamp: new Date().toISOString(), status, engines, findings, errors: engines.filter(e => e.status === 'failed').map(e => `${e.source} review failed`), cloudflareFindings: findings.filter(f => f.source === 'adversary'), alibabaComments: findings.filter(f => f.source === 'architect') };
}
