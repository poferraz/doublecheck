import { it, expect } from 'vitest';
import path from 'node:path';
import { normalizeFindings, canonicalizeFindingPath } from '../src/contracts.js';
import fs from 'node:fs';
const root = path.resolve('/tmp/example');
const legacy = (overrides = {}) => ({ title: 'Issue', file: 'src/a.js', line: 10, severity: 'HIGH', description: 'Unsafe boundary', ...overrides });
const norm = records => normalizeFindings('adversary', records, { targetRoot: root });
it('normalizes severity without certifying legacy candidates', () => {
  expect(norm([legacy()]).findings[0]).toMatchObject({ verdict: 'needs_validation', severity: 'high' });
  expect(norm([legacy({ severity: null })]).findings[0].severity).toBeNull();
});
it.each(['confirmed', 'needs-validation', 'rejected'])('preserves upstream %s verdict and all trace locations', name => {
  const input = JSON.parse(fs.readFileSync(`tests/fixtures/findings/cloudflare-${name}.json`));
  const result = norm(input);
  expect(result.invalidRecordCount).toBe(0);
  expect(result.findings[0].verdict).toBe(name.replace('-', '_'));
  expect(result.findings[0].locations.some(l => l.kind === 'sink' && l.startLine === 20)).toBe(true);
});
it('rejects invented confirmed records and preserves valid siblings without leaking data', () => {
  const result = norm([null, legacy(), legacy({ severity: 'secret-marker' }), legacy({ verdict: 'confirmed' }), legacy({ file: '../outside.js' }), legacy({ description: {} })]);
  expect(result.findings).toHaveLength(1);
  expect(result.invalidRecordCount).toBe(5);
  expect(JSON.stringify(result.diagnostics)).not.toContain('secret-marker');
  expect(() => norm({ findings: [] })).toThrow();
});
it('canonicalizes paths without merging file identity or traversal', () => {
  expect(canonicalizeFindingPath('src\\a.js', root)).toBe('src/a.js');
  expect(canonicalizeFindingPath(path.join(root, 'src/a.js'), root)).toBe('src/a.js');
  expect(canonicalizeFindingPath('src/../a.js', root)).toBe('a.js');
  for (const p of ['../../outside.js', '/elsewhere/a.js', 'C:\\elsewhere\\a.js', '']) expect(() => canonicalizeFindingPath(p, root)).toThrow();
});
it('keeps same-title distinct concerns and stable exact duplicate IDs', () => {
  const { findings } = norm([legacy(), legacy(), legacy({ description: 'Other concern' }), legacy({ file: 'src/b.js' })]);
  expect(findings[0].id).toBe(findings[1].id);
  expect(new Set(findings.map(f => f.id)).size).toBe(3);
});
it('handles missing lines and rejects reversed or nonnumeric ranges', () => {
  const result = normalizeFindings('architect', [{ path: 'a.js', content: 'Concern', start_line: 0 }, { path: 'a.js', content: 'Bad', start_line: 4, end_line: 2 }, { path: 'a.js', content: 'Bad', start_line: '4' }], { targetRoot: root });
  expect(result.findings[0].locations[0].startLine).toBeNull();
  expect(result.invalidRecordCount).toBe(2);
});
