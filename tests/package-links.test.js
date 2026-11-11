import { afterAll, beforeAll, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
let scratch, packed, tarball, pkg, manifest;
beforeAll(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'doublecheck-tarball-'));
  [packed] = JSON.parse(execFileSync('npm', ['pack', '--offline', '--json', '--ignore-scripts',
    '--pack-destination', scratch, '--cache', path.join(scratch, 'cache')], { encoding: 'utf8' }));
  tarball = path.join(scratch, packed.filename);
  execFileSync('tar', ['-xzf', tarball, '-C', scratch]);
  pkg = path.join(scratch, 'package');
  manifest = json(path.join(pkg, 'package.json'));
}, 30000);
afterAll(() => { if (scratch) fs.rmSync(scratch, { recursive: true, force: true }); });

it('packs the candidate version recorded in the manifest and both lockfile roots', () => {
  const source = json('package.json'); const lock = json('package-lock.json');
  expect([source.version, lock.version, lock.packages[''].version, packed.version, manifest.version])
    .toEqual(Array(5).fill('0.2.0'));
  expect(packed.id).toBe(`${manifest.name}@${manifest.version}`);
  expect(packed.integrity).toBe('sha512-' + createHash('sha512').update(fs.readFileSync(tarball)).digest('base64'));
});

it('resolves local file links in every shipped Markdown document from its installed location', () => {
  const missing = [];
  for (const { path: relative } of packed.files.filter(f => f.path.endsWith('.md'))) {
    const file = path.join(pkg, relative);
    for (const [, href] of fs.readFileSync(file, 'utf8').matchAll(/\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      const target = href.replace(/^<|>$/g, '').split('#')[0];
      if (!target || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue;
      const dest = path.resolve(path.dirname(file), decodeURIComponent(target));
      if (!dest.startsWith(pkg + path.sep) || !fs.existsSync(dest)) missing.push(`${relative} → ${href}`);
    }
  }
  expect(missing).toEqual([]);
});

it('ships executable consumer tooling, release notes and licenses without development or private artifacts', () => {
  for (const relative of ['LICENSE', 'src/schemas/CLOUDFLARE-LICENSE', `docs/RELEASE_${manifest.version}.md`]) {
    expect(fs.existsSync(path.join(pkg, relative)), 'absent: ' + relative).toBe(true);
  }
  const unexpected = packed.files.map(f => f.path).filter(name =>
    /(?:^|\/)(?:node_modules|\.git|\.codex|\.agents|artifacts|tests)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|^docs\/(?:verification|superpowers)\//.test(name));
  expect(unexpected).toEqual([]);
  expect(Object.keys(manifest.dependencies || {})).toEqual([]);
  const executable = path.resolve(pkg, manifest.bin.doublecheck);
  fs.accessSync(executable, fs.constants.X_OK);
  expect(execFileSync(executable, ['--help'], { cwd: scratch, encoding: 'utf8', timeout: 5000 })).toContain('Usage:');
  // Exercise the helper from the tarball, where resolving it from the source checkout would mask omissions.
  const output = path.join(scratch, 'export');
  execFileSync('bash', [path.join(pkg, 'scripts/convert.sh'), 'codex', '--output-dir', output], { cwd: scratch });
  expect(fs.statSync(path.join(output, 'codex/AGENTS.md')).size).toBeGreaterThan(0);
});
