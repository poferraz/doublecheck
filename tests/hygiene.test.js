import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Repository Hygiene & GitHub Standards', () => {
  const rootDir = path.resolve(__dirname, '..');
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  const releaseDrafterPath = path.join(rootDir, '.github', 'release-drafter.yml');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const readmePath = path.join(rootDir, 'README.md');

  it('contains a valid CHANGELOG.md with Keep a Changelog standards', () => {
    expect(fs.existsSync(changelogPath)).toBe(true);
    const content = fs.readFileSync(changelogPath, 'utf8');

    expect(content).toContain('## [0.1.1]');
    expect(content).toContain('## [0.1.0]');
    expect(content).toContain('Claude Code Review');
    expect(content).toContain('execFileSync');
  });

  it('contains a GitHub Release Drafter configuration file', () => {
    expect(fs.existsSync(releaseDrafterPath)).toBe(true);
    const content = fs.readFileSync(releaseDrafterPath, 'utf8');

    expect(content).toContain('categories:');
    expect(content).toContain('Features');
    expect(content).toContain('Security');
  });

  it('synchronizes package.json version with latest changelog release', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(pkg.version).toBe('0.1.1');
  });

  it('includes Table of Contents, Claude Code Review integration, and comparison tables in README.md', () => {
    expect(fs.existsSync(readmePath)).toBe(true);
    const content = fs.readFileSync(readmePath, 'utf8');

    // Table of contents
    expect(content).toContain('## 📑 Table of Contents');

    // Prominent Claude Code Review integration
    expect(content).toContain('Claude Code Review');
    expect(content).toContain('--init-review');

    // Detailed reference tables
    expect(content).toContain('CLI Arguments & Options Reference');
    expect(content).toContain('Why `doublecheck`?');
    expect(content).toContain('Supported Local Ollama Models');
  });
});
