import { it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

it('converter writes under requested output root', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-convert-'));
  try {
    const instructions = execFileSync('bash', [path.resolve('scripts/convert.sh'), 'review-md', '--output-dir', tmp], { encoding: 'utf8' });
    expect(instructions).toMatch(/Install: .*--init-review/);
    expect(instructions).not.toMatch(/Install: cp /);
    expect(fs.readFileSync(path.join(tmp, 'review-md/REVIEW.md'), 'utf8')).toContain('Review');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

it('refuses a linked existing platform before publishing any member of all', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-export-symlink-'));
  try {
    const out = path.join(tmp, 'out'); fs.mkdirSync(out, { mode: 0o700 });
    fs.mkdirSync(path.join(out, 'codex'));
    const victim = path.join(tmp, 'policy'); fs.writeFileSync(victim, 'keep');
    fs.symlinkSync(victim, path.join(out, 'codex', 'AGENTS.md'));
    const run = spawnSync('bash', ['scripts/convert.sh', 'all', '--output-dir', out]);
    expect(run.status).not.toBe(0);
    expect(fs.readFileSync(victim, 'utf8')).toBe('keep');
    expect(fs.readdirSync(out)).toEqual(['codex']);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
it.each(['symlink', 'writable'])('refuses an unsafe %s ancestor of a new destination', type => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-export-ancestor-'));
  try {
    const base = path.join(tmp, 'target'); fs.mkdirSync(base);
    const ancestor = path.join(tmp, 'elsewhere');
    if (type === 'symlink') fs.symlinkSync(base, ancestor);
    else { fs.mkdirSync(ancestor); fs.chmodSync(ancestor, 0o777); }
    const run = spawnSync('bash', ['scripts/convert.sh', 'codex', '--output-dir', path.join(ancestor, 'exports')]);
    expect(run.status).not.toBe(0);
    expect(fs.existsSync(path.join(ancestor, 'exports'))).toBe(false);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

function copyConverterProject(tmp) {
  fs.mkdirSync(path.join(tmp, 'scripts/helpers'), { recursive: true });
  fs.copyFileSync('scripts/convert.sh', path.join(tmp, 'scripts/convert.sh'));
  fs.copyFileSync('scripts/helpers/export-directory.mjs', path.join(tmp, 'scripts/helpers/export-directory.mjs'));
  fs.cpSync('skills/doublecheck', path.join(tmp, 'skills/doublecheck'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'src/templates'), { recursive: true });
  fs.copyFileSync('src/templates/REVIEW.md', path.join(tmp, 'src/templates/REVIEW.md'));
  return path.join(tmp, 'scripts/convert.sh');
}
it.each(['claude', 'antigravity', 'cursor', 'windsurf', 'codex', 'all'])('refuses incomplete %s exports before creating output', platform => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-missing-manuals-'));
  try {
    const script = copyConverterProject(tmp);
    fs.rmSync(path.join(tmp, 'skills/doublecheck/references'), { recursive: true });
    let failed = false;
    try { execFileSync('bash', [script, platform, '--output-dir', path.join(tmp, 'out')], { stdio: 'pipe' }); } catch { failed = true; }
    expect(failed).toBe(true); expect(fs.existsSync(path.join(tmp, 'out'))).toBe(false);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
it('preserves existing output if a referenced manual is missing, while review-md remains independent', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-missing-manual-'));
  try {
    const script = copyConverterProject(tmp); const refs = path.join(tmp, 'skills/doublecheck/references');
    fs.unlinkSync(path.join(refs, fs.readdirSync(refs).find(p => p.endsWith('.md'))));
    const out = path.join(tmp, 'out'); fs.mkdirSync(out, { mode: 0o700 });
    fs.mkdirSync(path.join(out, 'codex'));
    fs.writeFileSync(path.join(out, 'codex/AGENTS.md'), 'existing export');
    expect(() => execFileSync('bash', [script, 'codex', '--output-dir', out], { stdio: 'pipe' })).toThrow();
    expect(fs.readFileSync(path.join(out, 'codex/AGENTS.md'), 'utf8')).toBe('existing export');
    execFileSync('bash', [script, 'review-md', '--output-dir', out]);
    expect(fs.readFileSync(path.join(out, 'review-md/REVIEW.md'), 'utf8')).toBe(fs.readFileSync('src/templates/REVIEW.md', 'utf8'));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
it('rewrites every accepted manual filename consistently in consolidated and Cursor exports', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-manual-names-'));
  try {
    const script = copyConverterProject(tmp); const name = 'owasp-top10_ABC';
    fs.appendFileSync(path.join(tmp, 'skills/doublecheck/SKILL.md'), `\n[Additional manual](references/${name}.md)\n`);
    fs.writeFileSync(path.join(tmp, `skills/doublecheck/references/${name}.md`), 'Additional reference content');
    const out = path.join(tmp, 'out'); execFileSync('bash', [script, 'all', '--output-dir', out]);
    const consolidated = fs.readFileSync(path.join(out, 'codex/AGENTS.md'), 'utf8');
    expect(consolidated).toContain(`](#doublecheck-${name})`);
    expect(consolidated).toContain(`id="doublecheck-${name}"`);
    const cursor = fs.readFileSync(path.join(out, 'cursor/rules/doublecheck.mdc'), 'utf8');
    expect(cursor).toContain(`](./doublecheck-${name}.md)`);
    expect(fs.existsSync(path.join(out, `cursor/rules/doublecheck-${name}.md`))).toBe(true);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
