import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { defaultAlibabaRunner, defaultCloudflareRunner, runDualAudit, resolveAuditTarget } from '../src/orchestrator.js';
import { withTempDir } from './helpers/temp.js';
import { completeEngine, comment } from './helpers/results.js';
const fixture = name => JSON.parse(fs.readFileSync(`tests/fixtures/ocr/${name}.json`, 'utf8'));
function runner(payload, fail = false, capture = () => {}) {
  return (cmd, args) => {
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
