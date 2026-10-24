import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Repository Review Configuration & CI Workflow', () => {
  const reviewFile = path.resolve(__dirname, '../.github/REVIEW.md');
  const ciFile = path.resolve(__dirname, '../.github/workflows/ci.yml');

  it('contains a valid .github/REVIEW.md file tailored for Claude Code Review', () => {
    expect(fs.existsSync(reviewFile)).toBe(true);
    const content = fs.readFileSync(reviewFile, 'utf8');

    expect(content).toContain('## Focus Areas');
    expect(content).toContain('## Severity Levels');
    expect(content).toContain('## Invariants');
    expect(content).toContain('## Ignored Paths');

    // Security invariants specific to doublecheck
    expect(content).toContain('execFileSync');
    expect(content).toContain('Ollama');
  });

  it('includes pre-flight checks and review file validation in .github/workflows/ci.yml', () => {
    expect(fs.existsSync(ciFile)).toBe(true);
    const content = fs.readFileSync(ciFile, 'utf8');

    expect(content).toContain('--doctor-only');
    expect(content).toContain('.github/REVIEW.md');
  });
});
