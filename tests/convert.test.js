import { it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

it('converter writes under requested output root', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-convert-'));
  try {
    execFileSync('bash', [path.resolve('scripts/convert.sh'), 'review-md', '--output-dir', tmp]);
    expect(fs.readFileSync(path.join(tmp, 'review-md/REVIEW.md'), 'utf8')).toContain('Review');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

function copyConverterProject(tmp) {
  fs.mkdirSync(path.join(tmp, 'scripts'));
  fs.copyFileSync('scripts/convert.sh', path.join(tmp, 'scripts/convert.sh'));
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
    const out = path.join(tmp, 'out'); fs.mkdirSync(path.join(out, 'codex'), { recursive: true });
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
    const cursor = fs.readFileSync(path.join(out, 'cursor/rules/doublecheck.md'), 'utf8');
    expect(cursor).toContain(`](./doublecheck-${name}.md)`);
    expect(fs.existsSync(path.join(out, `cursor/rules/doublecheck-${name}.md`))).toBe(true);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
