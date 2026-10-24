import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as childProcess from 'child_process';
import { runDualAudit, defaultAlibabaRunner } from '../src/orchestrator.js';

describe('Dual-Perspective Audit Orchestrator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('executes both lenses and collects raw findings from Cloudflare and Alibaba', async () => {
    const mockCloudflareRunner = vi.fn().mockResolvedValue([
      {
        fingerprint: 'test-app:dom-xss',
        title: 'DOM XSS via innerHTML',
        file: 'src/main.js',
        line: 42,
        attack_class: 'CLIENT-SIDE',
        severity: 'high'
      }
    ]);

    const mockAlibabaRunner = vi.fn().mockResolvedValue([
      {
        path: 'src/main.js',
        start_line: 40,
        end_line: 45,
        category: 'security',
        severity: 'critical',
        content: 'Direct innerHTML assignment with unescaped error message'
      }
    ]);

    const results = await runDualAudit('/fake/path', {
      model: 'deepseek-v4.1-flash',
      cloudflareRunner: mockCloudflareRunner,
      alibabaRunner: mockAlibabaRunner
    });

    expect(results.targetPath).toBe('/fake/path');
    expect(results.cloudflareFindings).toHaveLength(1);
    expect(results.alibabaComments).toHaveLength(1);
    expect(mockCloudflareRunner).toHaveBeenCalledTimes(1);
    expect(mockAlibabaRunner).toHaveBeenCalledTimes(1);
  });

  it('handles errors gracefully in either engine without crashing the entire audit', async () => {
    const mockCloudflareRunner = vi.fn().mockResolvedValue([
      {
        fingerprint: 'test-app:ssrf-gateway',
        title: 'Open SSRF Proxy',
        file: 'api/proxy.js',
        line: 12,
        attack_class: 'CLOUD-AND-DEPLOYMENT',
        severity: 'critical'
      }
    ]);

    const mockAlibabaRunner = vi.fn().mockRejectedValue(new Error('OCR engine timeout'));

    const results = await runDualAudit('/fake/path', {
      cloudflareRunner: mockCloudflareRunner,
      alibabaRunner: mockAlibabaRunner
    });

    expect(results.cloudflareFindings).toHaveLength(1);
    expect(results.alibabaComments).toHaveLength(0);
    expect(results.errors).toContainEqual(expect.stringContaining('OCR engine timeout'));
  });

  it('executes Alibaba OCR runner using parameterized arguments without shell interpolation', async () => {
    let capturedCmd = '';
    let capturedArgs = [];

    const mockExecFileSync = vi.fn((cmd, args) => {
      capturedCmd = cmd;
      capturedArgs = args;
      const outIdx = args.indexOf('-o');
      const outputFile = args[outIdx + 1];
      fs.writeFileSync(outputFile, JSON.stringify({
        comments: [{ path: 'test.js', start_line: 1, category: 'security' }]
      }));
      return '';
    });

    const maliciousPath = 'src/test"; rm -rf /; echo "';
    const comments = await defaultAlibabaRunner(maliciousPath, {
      model: 'test-model',
      execFileSync: mockExecFileSync
    });

    expect(mockExecFileSync).toHaveBeenCalled();
    expect(capturedCmd).toBe('ocr');
    // Ensure the malicious string is passed as an isolated literal argument, NOT executed in a shell
    expect(capturedArgs).toContain(path.resolve(maliciousPath));
    expect(comments).toHaveLength(1);
  });

  it('creates secure isolated temporary directories for OCR output and cleans them up', async () => {
    let capturedTempDir = '';

    const mockExecFileSync = vi.fn((cmd, args) => {
      const outIdx = args.indexOf('-o');
      const outputFile = args[outIdx + 1];
      capturedTempDir = path.dirname(outputFile);
      // Temp directory should exist while process runs
      expect(fs.existsSync(capturedTempDir)).toBe(true);
      expect(capturedTempDir).toContain('doublecheck-');

      fs.writeFileSync(outputFile, JSON.stringify({ comments: [] }));
      return '';
    });

    await defaultAlibabaRunner('./src', {
      execFileSync: mockExecFileSync
    });

    // After execution finishes, temp directory should be cleaned up
    expect(fs.existsSync(capturedTempDir)).toBe(false);
  });
});
