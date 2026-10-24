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

  it('includes all required reference manuals (attack-classes, rulesets, convergence)', () => {
    expect(fs.existsSync(path.join(refDir, 'attack-classes.md'))).toBe(true);
    expect(fs.existsSync(path.join(refDir, 'rulesets.md'))).toBe(true);
    expect(fs.existsSync(path.join(refDir, 'convergence.md'))).toBe(true);
  });
});
