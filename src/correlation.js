import { stableSerialize } from './contracts.js';
export function deduplicateFindings(findings) {
  return [...new Map(findings.map(f => [f.id, f])).values()].sort((a, b) => a.id.localeCompare(b.id));
}
export function correlateFindings(adversary, architect) {
  const byPath = new Map(); const correlations = new Map();
  for (const f of deduplicateFindings(architect)) for (const l of f.locations) {
    if (l.startLine === null) continue;
    if (!byPath.has(l.file)) byPath.set(l.file, []);
    byPath.get(l.file).push({ f, l });
  }
  for (const f of deduplicateFindings(adversary)) for (const l of f.locations) {
    if (l.startLine === null) continue;
    for (const other of byPath.get(l.file) || []) {
      const startLine = Math.max(l.startLine, other.l.startLine);
      const endLine = Math.min(l.endLine, other.l.endLine);
      if (startLine > endLine) continue;
      const c = { findingIds: [f.id, other.f.id], file: l.file, startLine, endLine, relation: 'location_overlap' };
      correlations.set(stableSerialize(c), c);
    }
  }
  return [...correlations.values()].sort((a, b) => stableSerialize(a).localeCompare(stableSerialize(b)));
}
