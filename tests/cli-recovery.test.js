import { it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { runCli } from '../src/cli.js';
import { runDualAudit } from '../src/orchestrator.js';
import { getReviewExitCode } from '../src/reporter.js';
import { completeEngine } from './helpers/results.js';
import { withTempDir } from './helpers/temp.js';

it('keeps saved CI results in sync with the requested lenses and the latest preflight', async () => withTempDir(async tmp => {
  const file = path.join(tmp, 'sample.txt');
  fs.writeFileSync(file, 'Sample text');
  const output = path.join(tmp, 'review.json');
  const args = [file, '--format', 'json', '--output', output];
  const readReport = () => JSON.parse(fs.readFileSync(output, 'utf8'));
  const checkEnvironment = vi.fn().mockResolvedValue({ ok: true });
  const alibabaRunner = vi.fn(() => completeEngine('architect', [], tmp, ['sample.txt']));
  const dependencies = {
    checkEnvironment,
    runDualAudit: (target, options) => runDualAudit(target, { ...options, alibabaRunner })
  };

  expect(await runCli([...args, '--mode', 'architect'], dependencies)).toBe(0);
  expect(getReviewExitCode(readReport())).toBe(0);
  expect(readReport().diagnostics).toContainEqual(expect.objectContaining({ code: 'LENS_NOT_REQUESTED' }));

  checkEnvironment.mockResolvedValueOnce({ ok: false, errors: ['Unavailable'] });
  expect(await runCli([...args, '--mode', 'architect'], dependencies)).toBe(2);
  expect(alibabaRunner).toHaveBeenCalledTimes(1);
  expect(readReport().status).toBe('failed');
  expect(getReviewExitCode(readReport())).toBe(2);
  expect(readReport().diagnostics).toContainEqual(expect.objectContaining({ code: 'NATIVE_PREFLIGHT_FAILED' }));

  expect(await runCli(args, dependencies)).toBe(2);
  expect(readReport().status).toBe('partial');
  expect(readReport().diagnostics).toContainEqual(expect.objectContaining({ code: 'NO_ADVERSARY_INPUT' }));
  expect(getReviewExitCode(readReport())).toBe(2);
}));

it('preserves independently imported evidence when native preflight fails', async () => withTempDir(async tmp => {
  const input = path.join(tmp, 'findings.json'); const output = path.join(tmp, 'report.json');
  fs.copyFileSync('tests/fixtures/findings/cloudflare-confirmed.json', input);
  let scans = 0;
  const code = await runCli([tmp, '--findings', input, '-f', 'json', '-o', output], {
    checkEnvironment: async () => ({ ok: false, errors: ['Inference unavailable'], warnings: [] }),
    runDualAudit: (p, options) => runDualAudit(p, { ...options, alibabaRunner: () => { scans++; throw Error('must not scan'); } })
  });
  expect(code).toBe(2); expect(scans).toBe(0);
  const report = JSON.parse(fs.readFileSync(output));
  expect(report.p1).toHaveLength(1); expect(report.status).not.toBe('complete');
  expect(report.diagnostics.some(d => d.code === 'NATIVE_PREFLIGHT_FAILED')).toBe(true);
}));
it('rejects doctor/init combinations before writing a team policy', async () => withTempDir(async tmp => {
  const policy = path.join(tmp, 'REVIEW.md'); fs.writeFileSync(policy, 'team policy');
  let checks = 0;
  const code = await runCli([tmp, '--doctor-only', '--init-review', '--force'], { checkEnvironment: async () => { checks++; return { ok: true }; } });
  expect(code).toBe(2); expect(checks).toBe(0); expect(fs.readFileSync(policy, 'utf8')).toBe('team policy');
}));
it('explains unknown native coverage after a successful zero-finding scan', async () => withTempDir(async tmp => {
  const output = vi.spyOn(console, 'log').mockImplementation(() => {});
  try {
    const code = await runCli([tmp, '--mode', 'architect', '-o', path.join(tmp, 'report.md')], {
      checkEnvironment: async () => ({ ok: true, activeModel: 'test', inference: {} }),
      runDualAudit: async () => ({ status: 'partial', reviewMode: 'architect', findings: [], engines: [{ source: 'architect', status: 'partial', findings: [], coverage: { origin: 'unknown' }, provenance: {}, diagnostics: [{ source: 'architect', code: 'UNKNOWN_NATIVE_COVERAGE' }] }] })
    });
    expect(code).toBe(2); const text = output.mock.calls.map(c => c.join(' ')).join('\n');
    expect(text).toMatch(/coverage.*unknown|did not provide.*coverage/i);
    expect(text).toMatch(/exit 2|cannot pass.*gate/i);
  } finally { output.mockRestore(); }
}));
it('keeps safe actionable hints without reflecting raw dependency error text', async () => withTempDir(async tmp => {
  fs.writeFileSync(path.join(tmp, 'REVIEW.md'), 'custom');
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(await runCli([tmp, '--init-review'])).toBe(2);
    expect(error.mock.calls.flat().join(' ')).toMatch(/preserved.*--force/i);
    error.mockClear();
    expect(await runCli([tmp], { checkEnvironment: () => { throw Error('private-token'); } })).toBe(2);
    expect(error.mock.calls.flat().join(' ')).not.toContain('private-token');
  } finally { error.mockRestore(); }
}));
it('identifies an unknown flag without echoing its content', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(await runCli(['--private-token'])).toBe(2);
    const text = error.mock.calls.flat().join(' ');
    expect(text).toMatch(/unknown option/i); expect(text).not.toContain('private-token');
  } finally { error.mockRestore(); }
});
