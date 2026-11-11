import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
const repo = fileURLToPath(new URL('../', import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doublecheck-package-'));
try {
  const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', tmp, '--cache', path.join(tmp, 'cache')], { cwd: repo, encoding: 'utf8' }))[0];
  execFileSync('tar', ['-xzf', path.join(tmp, packed.filename), '-C', tmp]);
  const pkg = path.join(tmp, 'package'); const target = path.join(tmp, 'consumer'); fs.mkdirSync(target);
  assert.equal(fs.existsSync(path.join(pkg, 'node_modules')), false);
  const bin = path.join(pkg, 'bin/doublecheck.js');
  assert.equal(spawnSync(process.execPath, [bin, '--help']).status, 0);
  assert.equal(spawnSync(process.execPath, [bin, '--invalid']).status, 2);
  assert.equal(spawnSync(process.execPath, [bin, target, '--init-review']).status, 0);
  assert.equal(fs.readFileSync(path.join(target, 'REVIEW.md'), 'utf8'), fs.readFileSync(path.join(pkg, 'src/templates/REVIEW.md'), 'utf8'));
  const api = await import(pathToFileURL(path.join(pkg, 'src/index.js')));
  fs.writeFileSync(path.join(target, 'fixture.js'), 'export const fixture = true;\n');
  const engine = { source: 'architect', status: 'complete', findings: [], diagnostics: [], coverage: { selected: ['fixture.js', 'REVIEW.md'], reviewed: ['fixture.js', 'REVIEW.md'], failed: [], excluded: [], origin: 'reported' }, provenance: { targetRoot: fs.realpathSync(target), revision: null, mode: 'custom' } };
  const code = await api.runCli([target, '--mode', 'architect', '-f', 'both', '-o', path.join(target, 'report.json')], {
    checkEnvironment: async () => ({ ok: true, activeModel: 'fixture', inference: {}, warnings: [] }),
    runDualAudit: (p, options) => api.runDualAudit(p, { ...options, alibabaRunner: () => engine })
  });
  assert.equal(code, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(target, 'report.json'))).schemaVersion, 'doublecheck/report/v2');
  console.log(`Packaged consumer smoke passed on ${process.version}; no devDependencies installed.`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
