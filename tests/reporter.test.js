import { describe, it, expect } from 'vitest';
import { detectConvergence, synthesizeReport, normalizePath } from '../src/reporter.js';

describe('Convergence Synthesizer & Reporter', () => {
  const sampleCloudflare = [
    {
      fingerprint: 'treeways:dom-xss',
      title: 'DOM XSS via innerHTML in Fatal Handler',
      file: 'src/main.js',
      line: 379,
      attack_class: 'CLIENT-SIDE',
      severity: { overall_severity: 'high' },
      remediation: { strategy: 'Use textContent instead of innerHTML' }
    },
    {
      fingerprint: 'github-stars:open-ssrf',
      title: 'Unrestricted SSRF in AI Gateway',
      file: 'api/ai-proxy.js',
      line: 41,
      attack_class: 'CLOUD-AND-DEPLOYMENT',
      severity: { overall_severity: 'critical' },
      remediation: { strategy: 'Add destination host allowlist' }
    }
  ];

  const sampleAlibaba = [
    {
      path: 'src/main.js',
      start_line: 378,
      end_line: 379,
      category: 'security',
      severity: 'critical',
      content: 'Direct innerHTML assignment with unescaped error message introduces DOM XSS.'
    },
    {
      path: 'src/domain/giant.js',
      start_line: 3,
      end_line: 10,
      category: 'bug',
      severity: 'high',
      content: 'Partial threshold objects not merged with defaults, throwing unhandled TypeError.'
    }
  ];

  it('detects convergence when both engines flag overlapping lines in the same file', () => {
    const converged = detectConvergence(sampleCloudflare, sampleAlibaba);

    expect(converged).toHaveLength(1);
    expect(converged[0].file).toContain('src/main.js');
    expect(converged[0].cfFinding.title).toContain('DOM XSS');
    expect(converged[0].aliComment.content).toContain('DOM XSS');
  });

  it('synthesizes a structured report with P0, P1, and P2 priority categorizations', () => {
    const report = synthesizeReport({
      targetPath: '/my-project',
      modelUsed: 'deepseek-v4.1-flash',
      cloudflareFindings: sampleCloudflare,
      alibabaComments: sampleAlibaba,
      errors: []
    });

    expect(report.convergedCount).toBe(1);
    expect(report.p0Count).toBeGreaterThanOrEqual(1); // Converged + Critical
    expect(report.markdown).toContain('# `doublecheck` Audit Report');
    expect(report.markdown).toContain('Convergence Matrix');
    expect(report.markdown).toContain('Priority 0 (Immediate Fixes)');
    expect(report.json).toBeDefined();
    expect(report.json.summary.convergedDefects).toBe(1);
  });

  it('normalizes paths safely and strips relative path traversal sequences', () => {
    expect(normalizePath('../../etc/passwd')).toBe('etc/passwd');
    expect(normalizePath('..\\..\\secret.js')).toBe('secret.js');
    expect(normalizePath('./src/main.js')).toBe('src/main.js');
    expect(normalizePath('src/../main.js')).toBe('main.js');
  });
});
