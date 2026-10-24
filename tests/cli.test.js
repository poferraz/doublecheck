import { describe, it, expect } from 'vitest';
import { parseCliArgs } from '../src/cli.js';

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
});
