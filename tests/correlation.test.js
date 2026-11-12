import { it, expect } from 'vitest';
import { normalizeFindings } from '../src/contracts.js';
import { correlateFindings, deduplicateFindings } from '../src/correlation.js';
const root = process.cwd();
const cf = (v = {}) => normalizeFindings('adversary', [{ title: 'Same title', file: 'src/a.js', line: 10, severity: 'low', description: 'Concern', ...v }], { targetRoot: root }).findings[0];
const ali = (v = {}) => normalizeFindings('architect', [{ path: 'src/a.js', start_line: 10, content: 'Other concern', severity: 'low', ...v }], { targetRoot: root }).findings[0];
it.each([
  ['suffix', { file: 'src/notapi.js' }, { path: 'api.js' }],
  ['missing line', { line: null }, { start_line: 900 }],
  ['adjacent range', { line: 10 }, { start_line: 11 }]
])('%s is not corroboration', (_, c, a) => expect(correlateFindings([cf(c)], [ali(a)])).toEqual([]));
it('retains sink overlap and original severity without changing records', () => {
  const c = cf({ file: undefined, trace: [{ file: 'src/entry.js', line: 1 }, { file: 'src/a.js', line: 10, kind: 'sink' }] });
  const a = ali({ start_line: 9, end_line: 12 });
  const correlations = correlateFindings([c], [a]);
  expect(correlations).toEqual([{ findingIds: [c.id, a.id], file: 'src/a.js', startLine: 10, endLine: 10, relation: 'location_overlap' }]);
  expect(c.severity).toBe('low'); expect(a.severity).toBe('low');
});
it('deduplicates exact records without losing same-title or same-line concerns', () => {
  const a = cf(); const b = cf({ file: 'src/b.js', severity: 'critical' }); const c = ali(); const d = ali({ content: 'Different defect' });
  expect(deduplicateFindings([a, b, a, c, d]).map(x => x.id).sort()).toEqual([a.id, b.id, c.id, d.id].sort());
  expect(correlateFindings([b, a], [d, c])).toEqual(correlateFindings([a, b], [c, d]));
});
