import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runCli } from '../src/cli.js';
import { runDualAudit } from '../src/orchestrator.js';
import { withTempDir } from './helpers/temp.js';
import { completeEngine } from './helpers/results.js';
const ready = async () => ({ ok: true, activeModel: 'test-local', warnings: [], inference: { provider: 'ollama', model: 'test-local' } });
it.each([['complete', false, 0], ['complete', true, 1], ['partial', true, 2]])('CLI %s confirmed-high=%s exits %i with valid artifacts', async (status, high, code) => withTempDir(async tmp => {
  fs.mkdirSync(path.join(tmp, 'src')); fs.writeFileSync(path.join(tmp, 'src/a.js'), '');
  const records = high ? JSON.parse(fs.readFileSync('tests/fixtures/findings/cloudflare-confirmed.json')) : [];
  const cf = completeEngine('adversary', records, tmp, ['src/a.js']); const ali = completeEngine('architect', [], tmp, ['src/a.js']);
  const result = { status, findings: [...cf.findings, ...ali.findings], engines: [cf, ali], reviewMode: 'dual', targetPath: tmp };
  const actual = await runCli([tmp, '-f', 'both', '-o', path.join(tmp, 'review.json')], { checkEnvironment: ready, runDualAudit: async () => result });
  expect(actual).toBe(code); const json = JSON.parse(fs.readFileSync(path.join(tmp, 'review.json')));
  expect(json.status).toBe(status); expect(json.findings).toHaveLength(high ? 1 : 0);
}));
it('failed OCR preserves imported candidate and exits incomplete', async () => withTempDir(async tmp => {
  const input = path.join(tmp, 'input.json'); fs.writeFileSync(input, JSON.stringify([{ title: 'Candidate', file: 'fixture.js', line: 1, severity: 'high' }]));
  const code = await runCli([tmp, '--findings', input, '-f', 'json', '-o', path.join(tmp, 'report.json')], {
    checkEnvironment: ready,
    runDualAudit: (target, options) => runDualAudit(target, { ...options, alibabaRunner: () => { throw Error('private-token'); } })
  });
  expect(code).toBe(2); const report = JSON.parse(fs.readFileSync(path.join(tmp, 'report.json')));
  expect(report.unresolved).toHaveLength(1); expect(JSON.stringify(report)).not.toContain('private-token');
}));
it('the actual executable handles help, invalid flags, and root initialization without inference', async () => withTempDir(async tmp => {
  const bin = path.resolve('bin/doublecheck.js');
  expect(spawnSync(process.execPath, [bin, '--help'], { encoding: 'utf8' }).status).toBe(0);
  expect(spawnSync(process.execPath, [bin, '--unknown'], { encoding: 'utf8' }).status).toBe(2);
  expect(spawnSync(process.execPath, [bin, tmp, '--init-review'], { encoding: 'utf8' }).status).toBe(0);
  fs.writeFileSync(path.join(tmp, 'REVIEW.md'), 'team policy');
  expect(spawnSync(process.execPath, [bin, tmp, '--init-review'], { encoding: 'utf8' }).status).toBe(2);
  expect(fs.readFileSync(path.join(tmp, 'REVIEW.md'), 'utf8')).toBe('team policy');
}), 20000);
it('writes JSON for a valid imported high finding with many remediation backticks', async () => withTempDir(async tmp => {
  const records = JSON.parse(fs.readFileSync('tests/fixtures/findings/cloudflare-confirmed.json'));
  records[0].remediation.strategy = '`x'.repeat(140000);
  const input = path.join(tmp, 'input.json'); fs.writeFileSync(input, JSON.stringify(records));
  const output = path.join(tmp, 'report.json');
  const code = await runCli([tmp, '--findings', input, '-f', 'json', '-o', output], {
    checkEnvironment: ready,
    runDualAudit: (target, options) => runDualAudit(target, { ...options, alibabaRunner: () => [] })
  });
  expect(code).toBe(2);
  const report = JSON.parse(fs.readFileSync(output));
  expect(report.p1).toHaveLength(1); expect(report.p1[0].remediation).toBe(records[0].remediation.strategy);
}));
