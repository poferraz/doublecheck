import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withTempDir } from './helpers/temp.js';
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
it('every exported local Markdown file or explicit anchor link resolves', async () => withTempDir(async tmp => {
  execFileSync('bash', [path.resolve('scripts/convert.sh'), 'all', '--output-dir', tmp]);
  let count = 0;
  for (const file of walk(tmp)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const [, link] of content.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^https?:/.test(link)) continue;
      count++;
      if (link.startsWith('#')) expect(content, `${file}: ${link}`).toContain(`id="${link.slice(1)}"`);
      else expect(fs.existsSync(path.resolve(path.dirname(file), link)), `${file}: ${link}`).toBe(true);
    }
  }
  expect(count).toBeGreaterThan(10);
  const sourceBody = fs.readFileSync('skills/doublecheck/SKILL.md', 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
  const cursorDirectory = path.join(tmp, 'cursor/rules');
  const rules = fs.readdirSync(cursorDirectory).filter(p => p.endsWith('.mdc'));
  expect(rules).toEqual(['doublecheck.mdc']);
  const cursorRule = fs.readFileSync(path.join(cursorDirectory, rules[0]), 'utf8');
  const frontMatter = cursorRule.match(/^---\n([\s\S]*?)\n---\n/);
  expect(frontMatter?.[1]).toMatch(/^description: .+$/m);
  expect(frontMatter?.[1]).toMatch(/^alwaysApply: false$/m);
  expect(cursorRule.slice(frontMatter[0].length)).toBe(sourceBody.replace(/\]\(references\/([a-z-]+)\.md\)/g, '](./doublecheck-$1.md)'));
  expect(fs.existsSync(path.join(tmp, 'claude/references/attack-classes.md'))).toBe(true);
  expect(fs.readFileSync(path.join(tmp, 'claude/SKILL.md'), 'utf8')).not.toContain('# Reference Manuals');
}));
