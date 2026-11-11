import fs from 'node:fs';
import path from 'node:path';
import { normalizeFindings } from '../../src/contracts.js';
export function completeEngine(source = 'architect', records = [], root = process.cwd(), selectedFiles) {
  root = fs.realpathSync(root);

  const normalized = normalizeFindings(source, records, { targetRoot: root });
  if (normalized.invalidRecordCount) throw Error('Invalid complete-engine fixture records.');
  const paths = [...new Set(normalized.findings.flatMap(f => f.locations.map(l => l.file)))];
  const files = selectedFiles ?? (paths.length ? paths : ['src/cli.js']);
  if (!files.length || !files.every(file => fs.statSync(path.join(root, file)).isFile())) throw Error('Complete-engine fixtures must refer to real files.');
  return { source, status: 'complete', findings: normalized.findings, diagnostics: [], coverage: { selected: [...files], reviewed: [...files], failed: [], excluded: [], origin: 'reported' }, provenance: { targetRoot: root, revision: null, mode: 'custom', tool: 'fixture', version: '1', provider: null, endpoint: null, model: null } };
}
export const comment = { path: 'src/a.js', start_line: 10, end_line: 10, content: 'Synthetic concern', severity: 'low' };
