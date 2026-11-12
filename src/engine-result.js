import { canonicalizeFindingPath, diagnostic, normalizeFindings, stableSerialize, FindingValidationError } from './contracts.js';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
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
  return { selected, reviewed, failed, excluded, origin: native || value.origin === 'reported' ? 'reported' : 'unknown' };
}
export function isCompleteCoverage(c) {
  return c?.origin === 'reported' && ['selected', 'reviewed', 'failed', 'excluded'].every(k => Array.isArray(c[k])) &&
    c.selected.length > 0 && c.reviewed.length > 0 && !c.failed.length && !c.excluded.length &&
    c.selected.every(p => c.reviewed.includes(p)) && c.reviewed.every(p => c.selected.includes(p));
}
// Compare a reported manifest to the operator's selection, independently of
// the engine's own list. Never follow a symlink to establish reviewed coverage.
function coversTarget(coverage, target) {
  try {
    const root = fs.realpathSync(target.targetRoot);
    const selection = path.join(root, target.selectedPath);
    if (fs.realpathSync(selection) !== selection) return false;
    const reported = new Set(coverage.reviewed);
    if (fs.statSync(selection).isFile()) return reported.size === 1 && reported.has(target.selectedPath);
    if (!fs.statSync(selection).isDirectory()) return false;
    const remaining = new Set(reported);
    function include(relative) {
      if (!reported.has(relative)) return false;
      remaining.delete(relative);
      return true;
    }
    // Git defines the worktree's file set: include tracked files even when
    // they match ignore rules, and all unignored untracked files.
    if (fs.existsSync(path.join(root, '.git'))) {
      const args = ['-C', root, '--literal-pathspecs', 'ls-files', '--cached', '--others', '--exclude-standard', '-z', '--'];
      if (target.selectedPath) args.push(target.selectedPath);
      const files = execFileSync('git', args, { encoding: 'utf8', timeout: 3000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
      for (const file of new Set(files.split('\0').filter(Boolean))) {
        const full = path.join(root, file);
        const stat = fs.lstatSync(full);
        if (stat.isSymbolicLink()) continue;
        if (!stat.isFile() || !include(file) || fs.realpathSync(full) !== full) return false;
      }
    } else {
      const dirs = [selection]; let entries = 0;
      while (dirs.length) {
        const dir = dirs.pop();
        const handle = fs.opendirSync(dir);
        try {
          let entry;
          while ((entry = handle.readSync()) !== null) {
            if (++entries > 100_000) return false;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory() && entry.name !== '.git') dirs.push(full);
            if (entry.isFile() && !include(path.relative(root, full).split(path.sep).join('/'))) return false;
          }
        } finally { handle.closeSync(); }
      }
    }
    return !remaining.size;
  } catch { return false; }
}
function matchesProvenance(provenance, target) {
  try {
    return path.isAbsolute(provenance.targetRoot) &&
      fs.realpathSync(provenance.targetRoot) === fs.realpathSync(target.targetRoot) &&
      (!provenance.revision || provenance.revision === target.revision);
  } catch { return false; }
}
export function constrainCompletion(result, target) {
  if (result.status !== 'complete') return result;
  const code = !isCompleteCoverage(result.coverage) ? 'INCOMPLETE_COVERAGE'
    : !matchesProvenance(result.provenance, target) ? 'TARGET_MISMATCH'
    : !coversTarget(result.coverage, target) ? 'COVERAGE_TARGET_MISMATCH' : null;
  if (code) {
    result.status = 'partial';
    result.diagnostics.push(diagnostic(code, result.source));
  }
  return result;
}
export function validateEngineScope(result, target) {
  if (result.status === 'complete' && (result.provenance?.targetRoot !== target.targetRoot ||
      result.provenance?.revision && result.provenance.revision !== target.revision)) {
    result.status = 'partial'; result.diagnostics.push(diagnostic('TARGET_MISMATCH', result.source));
  }
  if (target.selectedPath) {
    const selection = target.selectedPath;
    let directory = false;
    try { directory = fs.statSync(path.join(target.targetRoot, selection)).isDirectory(); } catch {}
    const inside = file => file === selection || directory && file.startsWith(selection + '/');
    const supporting = [];
    result.findings = result.findings.filter(finding => {
      if (!finding.locations.some(l => inside(l.file))) {
        result.diagnostics.push(diagnostic('OUT_OF_SCOPE_FINDING', result.source));
        if (result.status === 'complete') result.status = 'partial';
        return false;
      }
      const files = [...new Set([...finding.locations, ...finding.evidence].map(l => l.file).filter(file => !inside(file)))];
      if (files.length) supporting.push({ findingId: finding.id, files });
      return true;
    });
    if (supporting.length) result.supportingFiles = supporting;
  }
  return constrainCompletion(result, target);
}
const publicEngineCodes = new Set(['INVALID_FINDING', 'INCOMPLETE_COVERAGE', 'OUT_OF_SCOPE_FINDING',
  'TARGET_MISMATCH', 'COVERAGE_TARGET_MISMATCH', 'OCR_PROCESS_FAILED', 'OCR_PROCESS_TIMEOUT']);
function retainCustomMetadata(raw, result) {
  function warn(code) {
    result.diagnostics.push(diagnostic(code, result.source));
    if (result.status === 'complete') result.status = 'partial';
  }
  if (Object.hasOwn(raw, 'diagnostics')) {
    if (!Array.isArray(raw.diagnostics)) warn('INVALID_ENGINE_DIAGNOSTICS');
    else for (const d of raw.diagnostics) warn(publicEngineCodes.has(d?.code) ? d.code : 'ENGINE_WARNING');
  }
  if (raw.execution != null) {
    const { status } = raw.execution;
    if (['not_started', 'succeeded', 'timed_out', 'failed'].includes(status)) {
      result.execution = { status };
      for (const key of ['elapsedMs', 'timeoutMs']) {
        const n = raw.execution[key];
        if (Number.isSafeInteger(n) && n >= 0) result.execution[key] = n;
      }
      if (status !== 'succeeded') warn('INCOMPLETE_ENGINE_EXECUTION');
    } else warn('INVALID_ENGINE_EXECUTION');
  }
}
export function validateCustomEngine(source, raw, target) {
  if (Array.isArray(raw)) {
    const n = normalizeFindings(source, raw, target);
    return validateEngineScope({ ...emptyEngine(source, 'partial', 'UNKNOWN_IMPORT_COVERAGE', target), findings: n.findings, diagnostics: [...n.diagnostics, diagnostic('UNKNOWN_IMPORT_COVERAGE', source)] }, target);
  }
  if (!raw || raw.source !== source || !Array.isArray(raw.findings)) throw new FindingValidationError();
  if (raw.findings.length > 10_000) throw new FindingValidationError();
  const findings = []; const invalid = [];
  for (const [index, finding] of raw.findings.entries()) {
    try { findings.push(validateCanonicalFinding(source, finding, target)); }
    catch { invalid.push(diagnostic('INVALID_FINDING', source, index)); }
  }
  const validStatus = ['complete', 'partial', 'skipped', 'failed'].includes(raw.status);
  const result = { ...emptyEngine(source, validStatus ? raw.status : 'partial', null, target), findings };
  const warn = code => {
    result.diagnostics.push(diagnostic(code, source));
    if (result.status !== 'failed') result.status = 'partial';
  };
  if (!validStatus) warn('INVALID_ENGINE_STATUS');
  try {
    if (!raw.coverage || ['selected', 'reviewed', 'failed', 'excluded'].some(k => !Array.isArray(raw.coverage[k]))) throw new FindingValidationError();
    result.coverage = parseCoverage(raw.coverage, target.targetRoot);
  } catch { warn('INVALID_ENGINE_COVERAGE'); }
  const provenance = raw.provenance;
  const validProvenance = provenance && typeof provenance === 'object' && !Array.isArray(provenance);
  let invalidProvenance = !validProvenance;
  for (const key of ['tool', 'version', 'mode', 'targetRoot', 'revision', 'provider', 'endpoint', 'model']) {
    const v = validProvenance ? provenance[key] : null;
    if (v != null && typeof v !== 'string') { invalidProvenance = true; result.provenance[key] = null; }
    else result.provenance[key] = v ?? null;
  }
  if (invalidProvenance) warn('INVALID_ENGINE_PROVENANCE');
  retainCustomMetadata(raw, result);
  if (invalid.length) {
    result.diagnostics.push(...invalid);
    if (result.status !== 'failed') result.status = 'partial';
  }
  if (result.provenance.targetRoot && result.provenance.targetRoot !== target.targetRoot || result.provenance.revision && result.provenance.revision !== target.revision) {
    result.status = 'partial'; result.diagnostics.push(diagnostic('TARGET_MISMATCH', source));
  }
  return validateEngineScope(result, target);
}

// Reuse the pinned raw verdict contract. The content hash detects accidental
// edits; it cannot prove an engine supplied the required evidence.
function verifyAdversaryVerdict(f, target) {
  const v = f.verification;
  if (!v) {
    if (f.verdict !== 'needs_validation') throw new FindingValidationError();
    return; // historical candidate without an explicit upstream verdict
  }
  const record = {
    verdict: f.verdict, fingerprint: f.externalId, title: f.title, description: f.description,
    trace: v.trace, evidence: f.evidence.map(e => ({ file: e.file, line: e.startLine, description: e.description }))
  };
  if (f.verdict === 'confirmed') {
    Object.assign(record, {
      root_cause: v.rootCause, intended_behavior: v.intendedBehavior, conditions: v.conditions,
      execution: v.execution, severity: v.severityAssessment, confidence: f.reportedConfidence,
      remediation: { strategy: f.remediation, code_changes: v.codeChanges.map(c => ({ file_name: c.file, fixed_code: c.fixedCode })) }
    });
  } else {
    record.claimed_root_cause = v.rootCause;
    if (f.verdict === 'rejected') record.reason = v.rejectionReason;
    else Object.assign(record, { blockers: v.blockers, validation_plan: v.validationPlan });
  }
  const rebuilt = normalizeFindings('adversary', [record], target).findings[0];
  if (!rebuilt || rebuilt.id !== f.id) throw new FindingValidationError();
}

export function validateCanonicalFinding(source, f, target) {
    if (!['architect', 'adversary'].includes(source) || !f || f.source !== source || !['confirmed', 'needs_validation', 'rejected'].includes(f.verdict) || !['critical', 'high', 'medium', 'low', 'informational', null].includes(f.severity) || typeof f.title !== 'string' || typeof f.description !== 'string' || !Array.isArray(f.locations) || !f.locations.length || !Array.isArray(f.evidence) || typeof f.remediation !== 'string') throw new FindingValidationError();
    if (f.evidence.some(e => typeof e?.description !== 'string')) throw new FindingValidationError();
    if (f.verification != null) {
      const v = f.verification;
      if (typeof v !== 'object' || Array.isArray(v) || v.rejectionReason != null && typeof v.rejectionReason !== 'string' || !Array.isArray(v.blockers) || v.blockers.some(b => typeof b !== 'string') || v.validationPlan != null && (typeof v.validationPlan !== 'object' || Array.isArray(v.validationPlan) || Object.values(v.validationPlan).some(p => typeof p !== 'string'))) throw new FindingValidationError();
    }
    for (const l of [...f.locations, ...f.evidence]) {
      if (!l || typeof l !== 'object' || canonicalizeFindingPath(l.file, target.targetRoot) !== l.file || (l.startLine !== null && (!Number.isSafeInteger(l.startLine) || l.startLine < 1)) || (l.startLine === null ? l.endLine !== null : !Number.isSafeInteger(l.endLine) || l.endLine < l.startLine)) throw new FindingValidationError();
    }
    const { id, ...identity } = f;
    if (id !== `${source}:${createHash('sha256').update(stableSerialize(identity)).digest('hex')}`) throw new FindingValidationError();
    if (source === 'adversary') verifyAdversaryVerdict(f, target);
    else if (f.verdict !== 'needs_validation') throw new FindingValidationError();
    return structuredClone(f);
}
