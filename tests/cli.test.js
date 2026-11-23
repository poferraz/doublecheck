import { it, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseCliArgs, runCli } from '../src/cli.js';
import { writeReports } from '../src/output.js';
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
it('keeps default reports in a separate private directory for every run', async () => withTempDir(async tmp => {
  const target = path.join(tmp, 'project');
  const tempRoot = path.join(tmp, 'scratch');
  fs.mkdirSync(target);
  fs.mkdirSync(tempRoot);
  const mockTemp = vi.spyOn(os, 'tmpdir').mockReturnValue(tempRoot);
  const directories = [];
  const writer = (paths, report) => {
    const dir = path.dirname(paths.json);
    expect(path.dirname(dir)).toBe(fs.realpathSync(tempRoot));
    directories.push(dir);
    return writeReports(paths, report);
  };
  try {
    for (let run = 0; run < 2; run++) {
      const code = await runCli([target, '--format', 'both'], {
        checkEnvironment: async () => ({ ok: true }),
        runDualAudit: async () => ({ status: 'partial', findings: [], engines: [] }),
        writeReports: writer
      });
      expect(code).toBe(2);
    }
    expect(fs.readdirSync(target)).toEqual([]);
    expect(new Set(directories).size).toBe(2);
    for (const dir of directories) {
      expect(fs.readdirSync(dir).sort()).toEqual(['doublecheck-report.json', 'doublecheck-report.md']);
      if (process.platform !== 'win32') {
        expect(fs.statSync(dir).mode & 0o777).toBe(0o700);
        for (const file of fs.readdirSync(dir)) expect(fs.statSync(path.join(dir, file)).mode & 0o777).toBe(0o600);
      }
    }
  } finally { mockTemp.mockRestore(); }
}));
it('requests a destination before inference if the system temporary directory is inside the project', async () => withTempDir(async target => {
  const tempRoot = path.join(target, 'scratch');
  fs.mkdirSync(tempRoot);
  const mockTemp = vi.spyOn(os, 'tmpdir').mockReturnValue(tempRoot);
  const doctor = vi.fn();
  try {
    expect(await runCli([target], { checkEnvironment: doctor })).toBe(2);
    expect(doctor).not.toHaveBeenCalled();
    expect(fs.readdirSync(tempRoot)).toEqual([]);
  } finally { mockTemp.mockRestore(); }
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

it('validates and forwards the overall scan deadline in milliseconds', async () => withTempDir(async tmp => {
  expect(parseCliArgs([]).timeout).toBe(1_200_000);
  expect(parseCliArgs(['--scan-timeout', '60']).timeout).toBe(60_000);
  for (const value of ['0', '-1', '1.5', 'NaN', 'Infinity', '2147484', '1e3']) expect(() => parseCliArgs(['--scan-timeout', value])).toThrow();
  const audit = vi.fn(async () => ({ status: 'partial', findings: [], engines: [] }));
  await runCli([tmp, '--scan-timeout', '60', '-o', path.join(tmp, 'r.md')], {
    checkEnvironment: async () => ({ ok: true, activeModel: 'test', inference: {} }), runDualAudit: audit
  });
  expect(audit.mock.calls[0][1].timeout).toBe(60_000);
}));
