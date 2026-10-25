import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { defaultAlibabaRunner as nativeAlibabaRunner, defaultCloudflareRunner, runDualAudit, resolveAuditTarget } from '../src/orchestrator.js';
import { withTempDir } from './helpers/temp.js';
import { completeEngine, comment } from './helpers/results.js';
const fixture = name => JSON.parse(fs.readFileSync(`tests/fixtures/ocr/${name}.json`, 'utf8'));
const defaultAlibabaRunner = (target, options = {}) => nativeAlibabaRunner(target, {
  model: 'test-local',
  readOcrConfig: () => ({ custom_providers: { ollama: { protocol: 'openai', url: 'http://localhost:11434/v1', model: 'test-local', api_key: 'placeholder' } } }),
  ...options
});
function runner(payload, fail = false, capture = () => {}) {
  return (cmd, args) => {
    if (args[0] === 'session') return '[]';
    if (args[0] === 'version') return 'open-code-review v1.13.3 (375f64c)';
    capture(cmd, args);
    if (payload) fs.writeFileSync(args[args.indexOf('-o') + 1], JSON.stringify(payload));
    if (fail) throw Error('secret-marker');
    return '';
  };
}
it('no adversary input is skipped; explicit missing input fails', async () => {
  expect((await defaultCloudflareRunner('.')).status).toBe('skipped');
  expect((await defaultCloudflareRunner('.', { findingsFile: '/nonexistent/findings.json' })).status).toBe('failed');
});
it('legacy import has unknown coverage', async () => withTempDir(async tmp => {
  const file = path.join(tmp, 'findings.json'); fs.writeFileSync(file, '[]');
  const result = await defaultCloudflareRunner('.', { findingsFile: file });
  expect(result.status).toBe('partial'); expect(result.coverage.reviewed).toBeNull();
  expect(result.provenance.model).toBeNull();
}));
it.each([['complete', 'complete'], ['partial', 'partial'], ['failed', 'failed'], ['skipped', 'skipped'], ['legacy', 'partial'], ['malformed', 'failed']])('retains native %s completion metadata', async (name, status) => {
  const result = await defaultAlibabaRunner('.', { execFileSync: runner(fixture(name)) });
  expect(result.status).toBe(status);
});
it('nonzero process retains usable findings and cleans scratch output', async () => {
  let output;
  const result = await defaultAlibabaRunner('.', { execFileSync: runner(fixture('complete'), true, (_, args) => { output = args[args.indexOf('-o') + 1]; }) });
  expect(result.status).toBe('partial'); expect(result.findings).toHaveLength(1);
  expect(fs.existsSync(path.dirname(output))).toBe(false);
  expect(JSON.stringify(result.diagnostics)).not.toContain('secret-marker');
});
it('missing output fails and invalid sibling makes native result partial', async () => {
  expect((await defaultAlibabaRunner('.', { execFileSync: runner(null) })).status).toBe('failed');
  const payload = fixture('complete'); payload.comments.push(null);
  const result = await defaultAlibabaRunner('.', { execFileSync: runner(payload) });
  expect(result.status).toBe('partial'); expect(result.findings).toHaveLength(1);
});
it('aggregates required engine status without certifying raw arrays', async () => {
  const ok = () => completeEngine();
  expect((await runDualAudit('.', { alibabaRunner: ok })).status).toBe('partial');
  expect((await runDualAudit('.', { reviewMode: 'architect', alibabaRunner: ok })).status).toBe('complete');
  expect((await runDualAudit('.', { reviewMode: 'architect', alibabaRunner: () => [comment] })).status).toBe('partial');
  const bad = () => { throw Error('secret-marker'); };
  const result = await runDualAudit('.', { alibabaRunner: bad, cloudflareRunner: bad });
  expect(result.status).toBe('failed'); expect(result.errors).toHaveLength(2);
  expect(JSON.stringify(result.errors)).not.toContain('secret-marker');
});
it('revision mismatches and malformed custom results are incomplete', async () => {
  const engine = completeEngine(); engine.provenance.revision = 'different-revision';
  expect((await runDualAudit('.', { reviewMode: 'architect', alibabaRunner: () => engine })).status).toBe('partial');
  expect((await runDualAudit('.', { reviewMode: 'architect', alibabaRunner: () => ({ status: 'complete', findings: [] }) })).status).toBe('failed');
});
it('subtree selection preserves Git root and literal subprocess arguments', async () => withTempDir(async tmp => {
  execFileSync('git', ['init', '-q', tmp]); fs.mkdirSync(path.join(tmp, 'src'));
  const file = path.join(tmp, 'src', 'quoted file.js'); fs.writeFileSync(file, '');
  const target = resolveAuditTarget(file);
  expect(fs.realpathSync(target.targetRoot)).toBe(fs.realpathSync(tmp));
  expect(target.selectedPath).toBe('src/quoted file.js');
  let args;
  await defaultAlibabaRunner(file, { execFileSync: runner(fixture('complete'), false, (_, a) => { args = a; }) });
  expect(args[args.indexOf('--path') + 1]).toBe('src/quoted file.js');
}));
it('explicitly unknown custom coverage cannot become a complete review', async () => {
  const engine = completeEngine(); engine.coverage.origin = 'unknown';
  const result = await runDualAudit('.', { reviewMode: 'architect', alibabaRunner: () => engine });
  expect(result.status).toBe('partial'); expect(result.engines.find(e => e.source === 'architect').coverage.origin).toBe('unknown');
});
it('direct native library calls refuse ambient provider selection before launching OCR', async () => {
  let calls = 0;
  const result = await nativeAlibabaRunner('.', { model: 'test-local', readOcrConfig: () => ({ provider: 'remote' }), execFileSync: () => { calls++; return ''; } });
  expect(result.status).toBe('failed'); expect(calls).toBe(0);
});

it('classifies timeouts and preserves requested context before output exists', async () => {
  const result = await defaultAlibabaRunner('.', { timeout: 900000, execFileSync: (_cmd, args, opts) => {
    if (args[0] === 'version') return 'open-code-review v1.13.3';
    if (args[0] === 'session') return '[]';
    expect(opts.timeout).toBe(900000);
    throw Object.assign(Error('secret-marker'), { code: 'ETIMEDOUT' });
  } });
  expect(result.status).toBe('failed');
  expect(result.execution).toMatchObject({ status: 'timed_out', timeoutMs: 900000 });
  expect(result.requestedInference).toMatchObject({ provider: 'ollama', model: 'test-local', endpoint: 'http://localhost:11434' });
  expect(result.provenance.revision).toBe(resolveAuditTarget('.').revision);
  expect(result.diagnostics.some(d => d.code === 'OCR_PROCESS_TIMEOUT')).toBe(true);
  expect(JSON.stringify(result)).not.toContain('secret-marker');
});
it('preserves explicit native failure despite process errors or identity mismatch', async () => {
  const raw = fixture('complete'); raw.status = 'failed'; raw.manifest.terminal_state = 'failed'; raw.manifest.run_failure = { code: 'FAIL' }; raw.llm.model = 'wrong';
  const result = await defaultAlibabaRunner('.', { execFileSync: runner(raw, true) });
  expect(result.status).toBe('failed');
});
it('automatically recovers owned saved comments after a timeout without certifying coverage', async () => {
  const id = '12345678-1234-1234-1234-123456789abc';
  const startTime = new Date().toISOString();
  const result = await defaultAlibabaRunner('.', { execFileSync: (_cmd, args) => {
    if (args[0] === 'version') return 'open-code-review v1.13.3';
    if (args[0] === 'scan') throw Object.assign(Error('secret-marker'), { code: 'ETIMEDOUT', stderr: `[ocr] Session: ${id} (retry with: --resume ${id})\n` });
    if (args[1] === 'list') return '[]';
    if (args[1] === 'show') return JSON.stringify({ summary: { session_id: id, model: 'test-local', review_mode: 'full_scan', repo_dir: resolveAuditTarget('.').targetRoot, start_time: startTime, completed_files: 1, total_comments: 1 }, items: [{ type: 'done', file_path: 'src/a.js' }] });
    return JSON.stringify([comment]);
  } });
  expect(result.status).toBe('partial'); expect(result.findings).toHaveLength(1);
  expect(result.coverage.origin).toBe('unknown');
  expect(result.execution).toMatchObject({ status: 'timed_out', sessionId: id, completedFiles: ['src/a.js'] });
  expect(result.diagnostics.some(d => d.code === 'OCR_SESSION_RECOVERED')).toBe(true);
  expect(JSON.stringify(result)).not.toContain('secret-marker');
});
