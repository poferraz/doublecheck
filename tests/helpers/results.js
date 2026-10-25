import { normalizeFindings } from '../../src/contracts.js';
export function completeEngine(source = 'architect', records = [], root = process.cwd()) {
  return { source, status: 'complete', findings: normalizeFindings(source, records, { targetRoot: root }).findings, diagnostics: [], coverage: { selected: ['src/a.js'], reviewed: ['src/a.js'], failed: [], excluded: [], origin: 'reported' }, provenance: { targetRoot: root, revision: null, mode: 'custom', tool: 'fixture', version: '1', provider: null, endpoint: null, model: null } };
}
export const comment = { path: 'src/a.js', start_line: 10, end_line: 10, content: 'Synthetic concern', severity: 'low' };
