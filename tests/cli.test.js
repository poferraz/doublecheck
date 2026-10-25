import { it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseCliArgs, runCli } from '../src/cli.js';
import { withTempDir } from './helpers/temp.js';
it('parses modes, existing aliases and dash-prefixed targets after --', () => {
  expect(parseCliArgs([])).toMatchObject({ targetPath: '.', format: 'markdown', reviewMode: 'dual' });
  expect(parseCliArgs(['--mode', 'architect', '-m', 'qwen', '--', '-target'])).toMatchObject({ targetPath: '-target', model: 'qwen', reviewMode: 'architect' });
});
it.each([['--formt', 'json'], ['--model'], ['a', 'b'], ['--format', 'bad'], ['--mode', 'architect', '--findings', 'input.json'], ['--force']])('rejects invalid arguments %j before work', async (...args) => {
  expect(() => parseCliArgs(args)).toThrow();
  const doctor = vi.fn();
  expect(await runCli(args, { checkEnvironment: doctor })).toBe(2);
  expect(doctor).not.toHaveBeenCalled();
});
it('invalid target and output fail before inference', async () => withTempDir(async tmp => {
  const doctor = vi.fn();
  expect(await runCli(['/nonexistent/target'], { checkEnvironment: doctor })).toBe(2);
  expect(await runCli([tmp, '-o', path.join(tmp, 'missing/report.md')], { checkEnvironment: doctor })).toBe(2);
  expect(doctor).not.toHaveBeenCalled();
}));
it('writes both formats and returns incomplete status rather than success', async () => withTempDir(async tmp => {
  const code = await runCli([tmp, '--format', 'both', '-o', path.join(tmp, 'report.json')], {
    checkEnvironment: async () => ({ ok: true, activeModel: 'test', warnings: [], inference: {} }),
    runDualAudit: async () => ({ status: 'partial', findings: [], engines: [] })
  });
  expect(code).toBe(2); expect(JSON.parse(fs.readFileSync(path.join(tmp, 'report.json'))).status).toBe('partial');
  expect(fs.readFileSync(path.join(tmp, 'report.md'), 'utf8')).toContain('Review incomplete');
}));
it('initializes without inference', async () => withTempDir(async tmp => {
  expect(await runCli([tmp, '--init-review'])).toBe(0);
  expect(fs.existsSync(path.join(tmp, 'REVIEW.md'))).toBe(true);
}));
it('reports cannot replace source targets or imported finding inputs', async () => withTempDir(async tmp => {
  const source = path.join(tmp, 'fixture.js'); fs.writeFileSync(source, 'source content');
  const findings = path.join(tmp, 'findings.json'); fs.writeFileSync(findings, '[]');
  const doctor = vi.fn();
  expect(await runCli([source, '-o', source], { checkEnvironment: doctor })).toBe(2);
  expect(await runCli([tmp, '--findings', findings, '-f', 'both', '-o', findings], { checkEnvironment: doctor })).toBe(2);
  expect(doctor).not.toHaveBeenCalled();
  expect(fs.readFileSync(source, 'utf8')).toBe('source content'); expect(fs.readFileSync(findings, 'utf8')).toBe('[]');
}));
