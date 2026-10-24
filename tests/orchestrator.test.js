import { describe, it, expect, vi } from 'vitest';
import { runDualAudit } from '../src/orchestrator.js';

describe('Dual-Perspective Audit Orchestrator', () => {
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
});
