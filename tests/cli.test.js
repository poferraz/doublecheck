import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseCliArgs, runCli } from '../src/cli.js';

describe('CLI Argument Parser', () => {
  it('defaults to current directory and markdown output when no flags supplied', () => {
    const config = parseCliArgs([]);
    expect(config.targetPath).toBe('.');
    expect(config.format).toBe('markdown');
    expect(config.output).toBe('doublecheck-report.md');
    expect(config.ollamaEndpoint).toBe('http://localhost:11434');
  });

  it('correctly parses custom target path, model, and output options', () => {
    const config = parseCliArgs([
      './src',
      '--model',
      'qwen2.5-coder:14b',
      '--format',
      'json',
      '--output',
      'audit.json',
      '--doctor-only'
    ]);

    expect(config.targetPath).toBe('./src');
    expect(config.model).toBe('qwen2.5-coder:14b');
    expect(config.format).toBe('json');
    expect(config.output).toBe('audit.json');
    expect(config.doctorOnly).toBe(true);
  });

  it('correctly parses --init-review flag', () => {
    const config = parseCliArgs(['--init-review']);
    expect(config.initReview).toBe(true);
  });

  it('generates .github/REVIEW.md in target directory when runCli is invoked with --init-review', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-test-init-'));
    try {
      const exitCode = await runCli(['--init-review', tempDir]);
      expect(exitCode).toBe(0);

      const generated = path.join(tempDir, '.github', 'REVIEW.md');
      expect(fs.existsSync(generated)).toBe(true);

      const content = fs.readFileSync(generated, 'utf8');
      expect(content).toContain('Cloudflare Security Audit Standard');
      expect(content).toContain('Alibaba Open Code Review Standard');
      expect(content).toContain('Severity Levels');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
