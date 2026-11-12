import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

// Upstream schema: cloudflare/security-audit-skill@c1c8a8c1471069fb0e188eeaff69b8e8db6564a8 (MIT).
const cloudflareSchema = JSON.parse(fs.readFileSync(new URL('./schemas/cloudflare-findings.json', import.meta.url), 'utf8'));
const severities = new Set(['critical', 'high', 'medium', 'low', 'informational']);
const verdicts = new Set(['confirmed', 'needs_validation', 'rejected']);
export class FindingValidationError extends Error {
  constructor(message = 'Invalid finding data') { super(message); this.name = 'FindingValidationError'; }
}
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const fail = () => { throw new FindingValidationError(); };
function text(v, required = false) {
  if (v == null && !required) return '';
  if (typeof v !== 'string' || v.length > 1_000_000 || (required && !v.trim())) fail();
  return v;
}
export function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableSerialize(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
const uniqueRecords = records => [...new Map(records.map(record => [stableSerialize(record), record])).values()];
// Implements only the vocabulary present in the pinned upstream schema.
function matchesSchema(value, schema) {
  if (schema.oneOf) return schema.oneOf.filter(s => matchesSchema(value, s)).length === 1;
  if (schema.const !== undefined && value !== schema.const) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type === 'object') {
    if (!object(value)) return false;
    if (schema.required?.some(k => !Object.hasOwn(value, k))) return false;
    return Object.entries(value).every(([k, v]) => Object.hasOwn(schema.properties || {}, k) ? matchesSchema(v, schema.properties[k]) : schema.additionalProperties !== false);
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value) || value.length < (schema.minItems || 0)) return false;
    if (schema.uniqueItems && new Set(value.map(stableSerialize)).size !== value.length) return false;
    return value.every(v => matchesSchema(v, schema.items));
  }
  if (schema.type === 'string') return typeof value === 'string' && value.length >= (schema.minLength || 0) && (!schema.visibleContent || /[^\s\p{Cf}]/u.test(value)) && (!schema.pattern || new RegExp(schema.pattern).test(value));
  if (schema.type === 'integer') return Number.isSafeInteger(value) && value >= (schema.minimum ?? -Infinity);
  return true;
}
export function canonicalizeFindingPath(input, targetRoot) {
  if (typeof input !== 'string' || !input.trim() || /[\x00-\x1f]/.test(input)) fail();
  const unified = input.replace(/\\/g, '/');
  if (process.platform !== 'win32' && (/^[A-Za-z]:/.test(unified) || unified.startsWith('//'))) fail();
  const root = path.resolve(targetRoot);
  const resolved = path.resolve(root, unified);
  const relative = path.relative(root, resolved);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) fail();
  return relative.split(path.sep).join('/');
}
function line(v) {
  if (v == null || v === 0) return null;
  if (!Number.isSafeInteger(v) || v < 1) fail();
  return v;
}
function location(file, start, end, kind, root) {
  const startLine = line(start); const endLine = line(end) ?? startLine;
  if ((startLine === null && endLine !== null) || (startLine !== null && endLine < startLine)) fail();
  return { file: canonicalizeFindingPath(file, root), startLine, endLine, kind };
}
function normalizeRecord(source, record, root) {
  if (!object(record)) fail();
  const explicitVerdict = record.verdict;
  if (explicitVerdict != null && !verdicts.has(explicitVerdict)) fail();
  if (source === 'adversary' && explicitVerdict != null) {
    const candidate = structuredClone(record);
    if (object(candidate.severity)) {
      for (const key of ['overall_severity']) if (typeof candidate.severity[key] === 'string') candidate.severity[key] = candidate.severity[key].toLowerCase();
      for (const key of ['likelihood', 'impact']) if (typeof candidate.severity[key]?.score === 'string') candidate.severity[key].score = candidate.severity[key].score.toLowerCase();
    }
    if (!matchesSchema(candidate, cloudflareSchema.items)) fail();
  }
  // OCR outputs are candidates. Confirmation is accepted only in the validated adversary schema.
  const verdict = source === 'architect' ? 'needs_validation' : explicitVerdict || 'needs_validation';
  const rawSeverity = object(record.severity) ? record.severity.overall_severity : record.severity;
  const severity = rawSeverity == null || rawSeverity === '' ? null : text(rawSeverity).toLowerCase();
  if (severity !== null && !severities.has(severity)) fail();
  const title = source === 'architect' ? `[${text(record.category) || 'defect'}] ${text(record.path, true)}` : text(record.title, true);
  const description = source === 'architect' ? text(record.content, true) : text(record.description ?? record.root_cause);
  const locations = [];
  if (source === 'architect') locations.push(location(record.path, record.start_line, record.end_line, 'annotation', root));
  else {
    if (record.file != null) locations.push(location(record.file, record.line, record.end_line, 'annotation', root));
    if (record.trace != null && !Array.isArray(record.trace)) fail();
    for (const loc of record.trace || []) {
      if (!object(loc)) fail();
      locations.push(location(loc.file, loc.line, loc.end_line, text(loc.kind) || 'trace', root));
    }
  }
  if (!locations.length) fail();
  const evidence = record.evidence ?? [];
  if (!Array.isArray(evidence) || evidence.some(v => !object(v) || typeof v.description !== 'string')) fail();
  const canonicalEvidence = uniqueRecords(evidence.map(e => ({ ...location(e.file, e.line, e.line, 'evidence', root), description: text(e.description, true) })));
  const remediation = source === 'architect' ? text(record.suggestion_code) : text(record.remediation?.strategy);
  const reportedConfidence = record.confidence ?? null;
  if (reportedConfidence !== null && (!object(reportedConfidence) || !['low', 'medium', 'high'].includes(reportedConfidence.score) || typeof reportedConfidence.reason !== 'string')) fail();
  // Preserve independently validated context rather than discarding why a verdict was reached.
  const verification = source === 'adversary' && explicitVerdict != null ? {
    rejectionReason: record.reason ?? null,
    blockers: record.blockers ?? [],
    validationPlan: record.validation_plan ?? null,
    rootCause: record.root_cause ?? record.claimed_root_cause ?? null,
    intendedBehavior: record.intended_behavior ?? null,
    conditions: record.conditions ?? [],
    execution: record.execution ?? null,
    severityAssessment: object(record.severity) ? record.severity : null,
    trace: uniqueRecords((record.trace || []).map(t => ({ ...t, file: canonicalizeFindingPath(t.file, root) }))),
    codeChanges: uniqueRecords((record.remediation?.code_changes || []).map(c => ({ file: canonicalizeFindingPath(c.file_name, root), fixedCode: c.fixed_code })))
  } : null;
  const finding = { source, externalId: text(record.fingerprint) || null, verdict, severity, title, description, locations: [...new Map(locations.map(l => [stableSerialize(l), l])).values()].sort((a, b) => stableSerialize(a).localeCompare(stableSerialize(b))), evidence: canonicalEvidence, remediation, reportedConfidence, verification };
  const id = `${source}:${createHash('sha256').update(stableSerialize(finding)).digest('hex')}`;
  return { id, ...finding };
}
export function diagnostic(code, source, recordIndex) {
  return { code, source, message: `Review diagnostic: ${code}`, ...(recordIndex === undefined ? {} : { recordIndex }) };
}
export function normalizeFindings(source, payload, { targetRoot } = {}) {
  if (!['adversary', 'architect'].includes(source) || typeof targetRoot !== 'string' || !Array.isArray(payload) || payload.length > 10000) throw new FindingValidationError('Unsupported findings payload');
  const findings = []; const diagnostics = [];
  for (const [index, record] of payload.entries()) {
    try { findings.push(normalizeRecord(source, record, targetRoot)); }
    catch { diagnostics.push(diagnostic('INVALID_FINDING', source, index)); }
  }
  return { findings, diagnostics, invalidRecordCount: diagnostics.length };
}
