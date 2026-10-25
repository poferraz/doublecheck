import { canonicalizeFindingPath, diagnostic, normalizeFindings, stableSerialize, FindingValidationError } from './contracts.js';
import { createHash } from 'node:crypto';
export const unknownCoverage = () => ({ selected: null, reviewed: null, failed: null, excluded: null, origin: 'unknown' });
export function emptyEngine(source, status, code, target, mode = 'custom') {
  return { source, status, findings: [], diagnostics: code ? [diagnostic(code, source)] : [], coverage: unknownCoverage(), provenance: { tool: source === 'architect' ? 'ocr' : 'cloudflare-findings', version: null, mode, targetRoot: target.targetRoot, revision: null, provider: null, endpoint: null, model: null } };
}
export function parseCoverage(value, root, native = false) {
  const keys = native ? ['selected', 'completed', 'reused', 'failed', 'waived'] : ['selected', 'reviewed', 'failed', 'excluded'];
  if (!value || keys.some(k => !Array.isArray(value[k]))) return unknownCoverage();
  const list = k => [...new Set(value[k].map(v => canonicalizeFindingPath(native ? v?.path : v, root)))];
  const selected = list('selected'); const reviewed = native ? [...new Set([...list('completed'), ...list('reused')])] : list('reviewed');
  const failed = list('failed'); const excluded = list(native ? 'waived' : 'excluded');
  if ([...reviewed, ...failed, ...excluded].some(p => !selected.includes(p)) || reviewed.some(p => failed.includes(p) || excluded.includes(p)) || failed.some(p => excluded.includes(p))) throw new FindingValidationError('Inconsistent coverage');
  return { selected, reviewed, failed, excluded, origin: 'reported' };
}
export function constrainCompletion(result) {
  const c = result.coverage;
  if (result.status === 'complete' && (c.origin !== 'reported' || !c.reviewed?.length || c.failed.length || c.excluded.length || c.selected.some(p => !c.reviewed.includes(p)))) {
    result.status = 'partial'; result.diagnostics.push(diagnostic('INCOMPLETE_COVERAGE', result.source));
  }
  return result;
}
export function validateCustomEngine(source, raw, target) {
  if (Array.isArray(raw)) {
    const n = normalizeFindings(source, raw, target);
    return { ...emptyEngine(source, 'partial', 'UNKNOWN_IMPORT_COVERAGE', target), findings: n.findings, diagnostics: [...n.diagnostics, diagnostic('UNKNOWN_IMPORT_COVERAGE', source)] };
  }
  if (!raw || raw.source !== source || !['complete', 'partial', 'skipped', 'failed'].includes(raw.status) || !Array.isArray(raw.findings) || !raw.provenance || !raw.coverage) throw new FindingValidationError();
  const findings = raw.findings.map(f => {
    if (!f || f.source !== source || !['confirmed', 'needs_validation', 'rejected'].includes(f.verdict) || !['critical', 'high', 'medium', 'low', 'informational', null].includes(f.severity) || typeof f.title !== 'string' || typeof f.description !== 'string' || !Array.isArray(f.locations) || !f.locations.length || !Array.isArray(f.evidence) || typeof f.remediation !== 'string') throw new FindingValidationError();
    for (const l of [...f.locations, ...f.evidence]) {
      if (canonicalizeFindingPath(l.file, target.targetRoot) !== l.file || (l.startLine !== null && (!Number.isSafeInteger(l.startLine) || l.startLine < 1)) || (l.startLine === null ? l.endLine !== null : !Number.isSafeInteger(l.endLine) || l.endLine < l.startLine)) throw new FindingValidationError();
    }
    const { id, ...identity } = f;
    if (id !== `${source}:${createHash('sha256').update(stableSerialize(identity)).digest('hex')}`) throw new FindingValidationError();
    return structuredClone(f);
  });
  const result = { ...emptyEngine(source, raw.status, null, target), findings, coverage: parseCoverage(raw.coverage, target.targetRoot), provenance: { ...emptyEngine(source, raw.status, null, target).provenance } };
  for (const key of ['tool', 'version', 'mode', 'targetRoot', 'revision', 'provider', 'endpoint', 'model']) {
    const v = raw.provenance[key]; if (v != null && typeof v !== 'string') throw new FindingValidationError();
    result.provenance[key] = v ?? null;
  }
  if (Array.isArray(raw.diagnostics)) result.diagnostics = raw.diagnostics.map(() => diagnostic('ENGINE_WARNING', source));
  if (raw.provenance.targetRoot && raw.provenance.targetRoot !== target.targetRoot || raw.provenance.revision && raw.provenance.revision !== target.revision) {
    result.status = 'partial'; result.diagnostics.push(diagnostic('TARGET_MISMATCH', source));
  }
  return constrainCompletion(result);
}
