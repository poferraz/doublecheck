import { normalizeFindings } from '../../src/contracts.js';
export function completeEngine(source = 'architect', records = [], root = process.cwd()) {
  const normalized = normalizeFindings(source, records, { targetRoot: root });
  if (normalized.invalidRecordCount) throw Error('Invalid complete-engine fixture records.');
  const paths = [...new Set(normalized.findings.flatMap(f => f.locations.map(l => l.file)))];
  const files = paths.length ? paths : ['src/a.js'];
  return { source, status: 'complete', findings: normalized.findings, diagnostics: [], coverage: { selected: [...files], reviewed: [...files], failed: [], excluded: [], origin: 'reported' }, provenance: { targetRoot: root, revision: null, mode: 'custom', tool: 'fixture', version: '1', provider: null, endpoint: null, model: null } };
}
export const comment = { path: 'src/a.js', start_line: 10, end_line: 10, content: 'Synthetic concern', severity: 'low' };
