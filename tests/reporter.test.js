import { it, expect } from 'vitest';
import fs from 'node:fs';
import { synthesizeReport, normalizePath } from '../src/reporter.js';
import { normalizeFindings } from '../src/contracts.js';
const upstream = () => JSON.parse(fs.readFileSync('tests/fixtures/findings/cloudflare-confirmed.json'))[0];
const normalize = records => normalizeFindings('adversary', records, { targetRoot: process.cwd() }).findings;
it('keeps rejected and unverified records outside confirmed buckets', () => {
  const rejected = JSON.parse(fs.readFileSync('tests/fixtures/findings/cloudflare-rejected.json'));
  const findings = [...normalize([upstream()]), ...normalize(rejected), ...normalize([{ title: 'Candidate', file: 'src/a.js', line: 20, severity: 'high' }])];
  const report = synthesizeReport({ status: 'partial', findings, engines: [], targetPath: '.', timestamp: 'test' });
  expect(report.p1Count).toBe(1); expect(report.p0Count).toBe(0);
  expect(report.json.rejected).toHaveLength(1); expect(report.json.unresolved).toHaveLength(1);
  expect(report.json.findings).toHaveLength(3);
  expect(report.markdown).toContain('Review incomplete');
});
it('same title and overlap never drop a distinct critical issue', () => {
  const a = upstream(); const b = upstream(); b.trace[0].file = 'src/b.js'; b.trace[1].file = 'src/b.js'; b.evidence[0].file = 'src/b.js'; b.severity.overall_severity = 'CRITICAL';
  const findings = [...normalize([a, b, a]), ...normalizeFindings('architect', [{ path: 'src/a.js', start_line: 20, content: 'Concern', severity: 'low' }], { targetRoot: process.cwd() }).findings];
  const report = synthesizeReport({ status: 'complete', findings, engines: [] });
  expect(report.p0Count).toBe(1); expect(report.p1Count).toBe(1);
  expect(report.json.findings).toHaveLength(3); expect(report.json.correlations).toHaveLength(1);
  expect(report.json.schemaVersion).toBe('doublecheck/report/v2');
  expect(report.json.summary.convergedDefects).toBeUndefined();
});
it('preserves missing severity and escapes external markup and fenced remediation', () => {
  const records = [{ title: '<img src=x>\n# forged', file: 'src/a.js', line: 10, description: '**fake** | row\n# injected', remediation: { strategy: '```\n# code fence escape' } }];
  const report = synthesizeReport({ status: 'partial', findings: normalize(records), engines: [] });
  expect(report.json.unresolved[0].severity).toBeNull();
  expect(report.markdown).not.toContain('<img'); expect(report.markdown).not.toContain('\n# injected');
  expect(report.markdown).toContain('Unrated'); expect(report.markdown).toContain('````');
});
it('display path normalization is not a containment check', () => {
  expect(normalizePath('src\\a.js')).toBe('src/a.js');
  expect(normalizePath('../../outside.js')).toBe('../../outside.js');
});
it('does not trust a complete label without evidence for the requested engines', () => {
  const report = synthesizeReport({ status: 'complete', findings: [], engines: [] });
  expect(report.json.status).toBe('partial');
});
it('retains rejected reasons and unresolved validation requirements', () => {
  const rejected = JSON.parse(fs.readFileSync('tests/fixtures/findings/cloudflare-rejected.json'));
  const pending = JSON.parse(fs.readFileSync('tests/fixtures/findings/cloudflare-needs-validation.json'));
  const report = synthesizeReport({ status: 'partial', findings: normalize([...rejected, ...pending]), engines: [] });
  expect(report.json.rejected[0].verification.rejectionReason).toBe('Guard prevents access');
  expect(report.json.unresolved[0].verification.blockers).toEqual(['Runtime unknown']);
  expect(report.markdown).toContain('Guard prevents access');
});
