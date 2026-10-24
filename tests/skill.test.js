import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Universal Agent Skill Specification', () => {
  const skillFile = path.resolve(__dirname, '../skills/doublecheck/SKILL.md');
  const refDir = path.resolve(__dirname, '../skills/doublecheck/references');

  it('contains valid Agent Skills YAML frontmatter with name and description', () => {
    expect(fs.existsSync(skillFile)).toBe(true);
    const content = fs.readFileSync(skillFile, 'utf8');

    expect(content.startsWith('---\n')).toBe(true);
    const parts = content.split('---\n');
    expect(parts.length).toBeGreaterThanOrEqual(3);

    const frontmatter = parts[1];
    expect(frontmatter).toContain('name: doublecheck');
    expect(frontmatter).toContain('description:');
  });

  it('includes all required reference manuals (attack-classes, rulesets, convergence, defense-in-depth)', () => {
    expect(fs.existsSync(path.join(refDir, 'attack-classes.md'))).toBe(true);
    expect(fs.existsSync(path.join(refDir, 'rulesets.md'))).toBe(true);
    expect(fs.existsSync(path.join(refDir, 'convergence.md'))).toBe(true);
    expect(fs.existsSync(path.join(refDir, 'defense-in-depth.md'))).toBe(true);
  });

  it('references defense-in-depth and Claude Code Review in SKILL.md instructions', () => {
    const content = fs.readFileSync(skillFile, 'utf8');
    expect(content).toContain('references/defense-in-depth.md');
    expect(content).toContain('REVIEW.md');
  });
});
