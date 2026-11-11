import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { normalizeFindings, diagnostic } from './contracts.js';
import { isSupportedOcrVersion } from './doctor.js';
import { resolveInferencePolicy } from './inference-policy.js';
import { recoverScanSession, snapshotSessionIds } from './ocr-session.js';
import { emptyEngine, parseCoverage, validateCustomEngine, validateEngineScope } from './engine-result.js';

export const DEFAULT_SCAN_TIMEOUT_MS = 1_200_000;
export function validateScanTimeout(value = DEFAULT_SCAN_TIMEOUT_MS) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 2_147_483_647) throw Error('Invalid scan timeout.');
  return value;
}
export function resolveAuditTarget(targetPath = '.') {
  const resolved = fs.realpathSync(path.resolve(targetPath));
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory() && !stat.isFile()) throw Error('Target must be a file or directory');
  const directory = stat.isDirectory() ? resolved : path.dirname(resolved);
  let targetRoot = directory; let revision = null;
  try { targetRoot = fs.realpathSync(execFileSync('git', ['-C', directory, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).trim()); } catch {}
  try { revision = execFileSync('git', ['-C', targetRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).trim(); } catch {}
  const selectedPath = path.relative(targetRoot, resolved).split(path.sep).join('/');
  // OCR interprets --path as a trimmed comma list, not a literal filename.
  // Backslashes also disagree with canonical finding identity on POSIX.
  if (selectedPath.includes(',') || selectedPath.includes('\\') || selectedPath !== selectedPath.trim() || /[\x00-\x1f]/.test(selectedPath)) throw Error('Target path cannot be represented literally by OCR.');
  return { targetRoot, selectedPath, revision };
}
function readJson(file) {
  const limit = 16 * 1024 * 1024;
  // O_NONBLOCK makes opening a FIFO safe; validate the opened object, not a
  // pathname that could change between stat and read.
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > limit) throw Error('Invalid findings file');
    const chunks = []; let total = 0;
    while (total <= limit) {
      const chunk = Buffer.alloc(Math.min(65536, limit + 1 - total));
      const count = fs.readSync(fd, chunk, 0, chunk.length, null);
      if (!count) return JSON.parse(Buffer.concat(chunks).toString('utf8'));
      chunks.push(chunk.subarray(0, count)); total += count;
    }
    throw Error('Oversized findings file');
  } finally { fs.closeSync(fd); }
}
export async function defaultAlibabaRunner(targetPath, options = {}) {
  const target = options.target || resolveAuditTarget(targetPath);
  const result = emptyEngine('architect', 'failed', null, target, 'native');
  const timeout = validateScanTimeout(options.timeout);
  result.execution = { status: 'not_started', timeoutMs: timeout, elapsedMs: 0, sessionId: null, completedFiles: null };
  result.provenance.revision = target.revision;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doublecheck-'));
  const outputFile = path.join(tmp, 'output.json');
  const execute = options.execFileSync || execFileSync;
  const runner = (cmd, args, settings) => execute(cmd, args, { ...settings, env: { ...process.env, OCR_NO_UPDATE: '1' } });
  try {
    const inference = await resolveInferencePolicy(options, { readOcrConfig: options.readOcrConfig });
    result.requestedInference = inference;
    const versionText = runner('ocr', ['version'], { encoding: 'utf8', stdio: 'pipe', timeout: 3000 });
    result.provenance.version = String(versionText).match(/v(\d+\.\d+\.\d+)/)?.[1] ?? null;
    if (!isSupportedOcrVersion(versionText)) {
      result.diagnostics.push(diagnostic('UNSUPPORTED_OCR_VERSION', 'architect'));
      return result;
    }
    const args = ['scan', '--repo', target.targetRoot];
    if (target.selectedPath) args.push('--path', target.selectedPath);
    args.push('--format', 'json', '-o', outputFile, '--no-plan', '--concurrency', String(options.concurrency || 4));
    args.push('--model', inference.model, '--provider', inference.provider);
    const before = snapshotSessionIds(runner, target.targetRoot);
    const startedAt = Date.now();
    let processFailed = false; let failureStderr = '';
    try {
      runner('ocr', args, { stdio: 'pipe', encoding: 'utf8', timeout, maxBuffer: 1024 * 1024 });
      result.execution.status = 'succeeded';
    } catch (error) {
      processFailed = true; failureStderr = error.stderr;
      const timedOut = error.code === 'ETIMEDOUT';
      result.execution.status = timedOut ? 'timed_out' : 'failed';
      result.diagnostics.push(diagnostic(timedOut ? 'OCR_PROCESS_TIMEOUT' : 'OCR_PROCESS_FAILED', 'architect'));
    }
    const finishedAt = Date.now(); result.execution.elapsedMs = finishedAt - startedAt;
    const recoverSaved = (preserveFailure = false) => {
      const recovered = recoverScanSession({ runner, target, model: inference.model, before, stderr: failureStderr, startedAt, finishedAt });
      if (recovered) {
        result.findings = recovered.findings; result.status = preserveFailure ? 'failed' : 'partial';
        Object.assign(result.execution, { sessionId: recovered.sessionId, completedFiles: recovered.completedFiles });
        result.provenance.model = inference.model;
        result.diagnostics.push(diagnostic('OCR_SESSION_RECOVERED', 'architect'), diagnostic('UNKNOWN_NATIVE_COVERAGE', 'architect'));
      }
      return validateEngineScope(result, target);
    };
    if (!fs.existsSync(outputFile)) {
      result.diagnostics.push(diagnostic('MISSING_OCR_OUTPUT', 'architect'));
      return recoverSaved();
    }
    let raw; let normalized;
    try {
      raw = readJson(outputFile);
      normalized = normalizeFindings('architect', Array.isArray(raw) ? raw : raw?.comments, target);
    } catch {
      result.diagnostics.push(diagnostic('INVALID_OCR_RESULT', 'architect'));
      return processFailed ? recoverSaved(raw?.status === 'failed' || !!raw?.manifest?.run_failure) : result;
    }
    result.findings = normalized.findings;
    result.diagnostics.push(...normalized.diagnostics);
    result.status = ['complete', 'partial', 'failed', 'skipped'].includes(raw.status) ? raw.status : 'partial';
    if (raw.manifest?.schema_version === 'ocr.run-manifest/v1') {
      result.coverage = parseCoverage(raw.manifest.coverage, target.targetRoot, true);
      if (raw.manifest.terminal_state !== raw.status && result.status !== 'failed') result.status = 'partial';
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
    if (processFailed && result.status !== 'failed') result.status = result.findings.length ? 'partial' : 'failed';
    if (result.provenance.provider !== inference.provider || result.provenance.model !== inference.model) {
      if (result.status !== 'failed') result.status = 'partial';
      result.diagnostics.push(diagnostic('INFERENCE_IDENTITY_MISMATCH', 'architect'));
    }
    return validateEngineScope(result, target);
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
  return validateEngineScope(result, target);
}
export async function runDualAudit(targetPath, options = {}) {
  const target = resolveAuditTarget(targetPath);
  const reviewMode = options.reviewMode || 'dual';
  if (!['dual', 'architect'].includes(reviewMode)) throw Error('Invalid review mode');
  const requiredSources = reviewMode === 'dual' ? ['adversary', 'architect'] : ['architect'];
  const engines = [];
  for (const [source, custom, native] of [['adversary', options.cloudflareRunner, defaultCloudflareRunner], ['architect', options.alibabaRunner, defaultAlibabaRunner]]) {
    if (!requiredSources.includes(source)) { engines.push(emptyEngine(source, 'skipped', 'LENS_NOT_REQUESTED', target)); continue; }
    if (source === 'architect' && options.nativePreflightFailed) { engines.push(emptyEngine(source, 'failed', 'NATIVE_PREFLIGHT_FAILED', target)); continue; }
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
  return { targetPath: path.resolve(targetPath), reviewMode, requiredSources, timestamp: new Date().toISOString(), status, engines, findings, errors: engines.filter(e => e.status === 'failed').map(e => `${e.source} review failed`), cloudflareFindings: findings.filter(f => f.source === 'adversary'), alibabaComments: findings.filter(f => f.source === 'architect') };
}
