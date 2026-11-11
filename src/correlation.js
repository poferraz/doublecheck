import { stableSerialize } from './contracts.js';
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
export function deduplicateFindings(findings) {
  return [...new Map(findings.map(f => [f.id, f])).values()].sort((a, b) => a.id.localeCompare(b.id));
}

// An overlap is supplemental evidence. Bound work and output without dropping
// any findings, even when thousands of records all point to the same line.
const LIMIT = 1000;
const COMPARISON_LIMIT = 10_000;
export function summarizeCorrelations(adversary, architect) {
  const events = [];
  for (const [side, findings] of [adversary, architect].entries()) {
    for (const f of deduplicateFindings(findings)) for (const l of f.locations) {
      if (l.startLine == null) continue;
      const interval = { side, id: f.id, location: l };
      events.push({ interval, line: l.startLine, end: 0 }, { interval, line: l.endLine, end: 1 });
    }
  }
  // Inclusive endpoints: all starts on a line must precede all ends on it.
  events.sort((a, b) => compare(a.interval.location.file, b.interval.location.file) ||
    a.line - b.line || a.end - b.end || a.interval.id.localeCompare(b.interval.id));
  const active = [new Set(), new Set()]; const overlaps = new Map();
  let comparisons = 0; let truncated = false;
  scan: for (const { interval, end } of events) {
    const { side, location, id } = interval;
    if (end) { active[side].delete(interval); continue; }
    for (const other of active[1 - side]) {
      if (++comparisons > COMPARISON_LIMIT) { truncated = true; break scan; }
      const findingIds = side ? [other.id, id] : [id, other.id];
      const c = { findingIds, file: location.file, startLine: Math.max(location.startLine, other.location.startLine),
        endLine: Math.min(location.endLine, other.location.endLine), relation: 'location_overlap' };
      const key = JSON.stringify([findingIds, c.file, c.startLine, c.endLine]);
      if (overlaps.has(key)) continue;
      if (overlaps.size === LIMIT) { truncated = true; break scan; }
      overlaps.set(key, c);
    }
    active[side].add(interval);
  }
  const correlations = [...overlaps.values()].sort((a, b) => stableSerialize(a).localeCompare(stableSerialize(b)));
  return { correlations, correlationSummary: { truncated, limit: LIMIT, comparisonLimit: COMPARISON_LIMIT } };
}
export function correlateFindings(adversary, architect) {
  const { correlations, correlationSummary } = summarizeCorrelations(adversary, architect);
  if (correlationSummary.truncated) throw new RangeError('Correlation limit reached. Use synthesizeReport for a bounded subset and its truncation status.');
  return correlations;
}
