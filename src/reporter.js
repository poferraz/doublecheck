import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { resolveAuditTarget } from './orchestrator.js';
import { isDeepStrictEqual } from 'node:util';
import { isCompleteCoverage, parseCoverage, validateCanonicalFinding, validateEngineScope } from './engine-result.js';
import { normalizeFindings, diagnostic } from './contracts.js';
import { correlateFindings, summarizeCorrelations, deduplicateFindings } from './correlation.js';
export function normalizePath(p = '') { return path.posix.normalize(p.replace(/\\/g, '/')); }
export const detectConvergence = correlateFindings;
const escape = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/([\\`*_{}\[\]()#+.!|~-])/g, '\\$1');
const inline = value => escape(String(value ?? '').replace(/[\r\n\x00-\x1f]/g, ' '));
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function optionalStrings(value, keys) {
  return object(value) && keys.every(key => value[key] == null || typeof value[key] === 'string');
}
function reportEngine(engine, targetRoot) {
  if (!object(engine) || !['architect', 'adversary'].includes(engine.source) || !['complete', 'partial', 'failed', 'skipped'].includes(engine.status) || !object(engine.coverage) || !optionalStrings(engine.provenance, ['tool', 'version', 'mode', 'targetRoot', 'revision', 'provider', 'model', 'endpoint'])) throw Error('Invalid engine.');
  if (engine.requestedInference != null && !optionalStrings(engine.requestedInference, ['provider', 'model', 'endpoint'])) throw Error('Invalid requested inference.');
  if (engine.diagnostics != null && !Array.isArray(engine.diagnostics)) throw Error('Invalid engine diagnostics.');
  const execution = engine.execution;
  if (engine.status === 'complete' && execution && execution.status !== 'succeeded') throw Error('Incomplete execution.');
  if (execution != null && (!object(execution) || !['not_started', 'succeeded', 'timed_out', 'failed'].includes(execution.status) || !optionalStrings(execution, ['sessionId']) || ['timeoutMs', 'elapsedMs'].some(k => execution[k] != null && (!Number.isSafeInteger(execution[k]) || execution[k] < 0)) || execution.completedFiles != null && (!Array.isArray(execution.completedFiles) || execution.completedFiles.some(p => typeof p !== 'string')))) throw Error('Invalid execution.');
  return { ...engine, coverage: parseCoverage(engine.coverage, targetRoot) };
}
const anchor = id => 'finding-' + id.slice(id.indexOf(':') + 1);
const excerpt = text => inline(text.length > 480 ? text.slice(0, 480) + '…' : text);
function renderFinding(f) {
  let out = `<a id="${anchor(f.id)}"></a>\n\n### ${inline(f.title)}\n\n- Source: ${inline(f.source)}\n- Verdict: ${inline(f.verdict)}\n- Severity: ${inline(f.severity || 'Unrated')}\n`;
  for (const l of f.locations) out += `- Location: ${inline(l.file)}:${l.startLine ?? 'unknown'}${l.endLine && l.endLine !== l.startLine ? `–${l.endLine}` : ''}\n`;
  out += `\n${escape(f.description)}\n\n`;
  for (const e of f.evidence) out += `- Evidence: ${inline(e.file)}:${e.startLine ?? 'unknown'} — ${escape(e.description)}\n`;
  if (f.verification) {
    const execution = f.verification.execution;
    if (typeof execution?.observed_result === 'string') out += `- Reported observation: ${excerpt(execution.observed_result)}\n`;
    if (Array.isArray(execution?.instructions)) {
      for (const step of execution.instructions.slice(0, 4)) {
        if (typeof step === 'string') out += `- Reproduction step (reported): ${excerpt(step)}\n`;
      }
      if (execution.instructions.length > 4) out += '- Additional steps omitted; see JSON.\n';
    }
    if (f.verification.rejectionReason) out += `Rejection reason: ${escape(f.verification.rejectionReason)}\n\n`;
    for (const blocker of f.verification.blockers || []) out += `- Validation blocker: ${escape(blocker)}\n`;
    for (const [where, instructions] of Object.entries(f.verification.validationPlan || {})) out += `- Validation plan (${inline(where)}): ${escape(instructions)}\n`;
  }
  if (f.remediation) {
    let longest = 0; let run = 0;
    for (const char of f.remediation) {
      run = char === '`' ? run + 1 : 0;
      if (run > longest) longest = run;
    }
    const fence = '`'.repeat(Math.max(4, longest + 1));
    out += `\nRecommended remediation:\n\n${fence}\n${f.remediation}\n${fence}\n\n`;
  }
  return out;
}
// Validate engine evidence and its aggregate together. A missing aggregate can be
// reconstructed; contradictory copies keep all valid findings and lose gate eligibility.
function informativeDiagnostic(d, requiredSources, engines) {
  if (d.code === 'CORRELATIONS_TRUNCATED') return d.source === 'report';
  return d.code === 'LENS_NOT_REQUESTED' &&
    !requiredSources.includes(d.source) && engines.some(e => e.source === d.source && e.status === 'skipped');
}
const coverageDigest = files => ({ count: files.length, sha256: createHash('sha256').update(JSON.stringify([...files].sort())).digest('hex') });
const isInScope = (file, target) => !target.selectedPath || file === target.selectedPath || target.selectionKind === 'directory' && file.startsWith(target.selectedPath + '/');
function collectEvidence(results, snapshot) {
  const diagnostics = []; const engines = []; const fromEngines = [];
  const mode = results.reviewMode ?? 'dual';
  const requiredSources = mode === 'architect' ? ['architect'] : ['adversary', 'architect'];
  if (Object.hasOwn(results, 'diagnostics')) {
    if (!Array.isArray(results.diagnostics)) diagnostics.push(diagnostic('INVALID_REPORT_DIAGNOSTICS', 'report'));
    else for (const d of results.diagnostics) {
      diagnostics.push(object(d) && typeof d.code === 'string' && typeof d.source === 'string' ? d : diagnostic('INVALID_REPORT_DIAGNOSTICS', 'report'));
    }
  }
  let target = snapshot;
  if (!target) {
    try {
      target = resolveAuditTarget(results.targetPath || '.');
      target.selectionKind = fs.statSync(path.join(target.targetRoot, target.selectedPath)).isDirectory() ? 'directory' : 'file';
      if (results.target && ['targetRoot', 'selectedPath', 'revision'].some(k => results.target[k] !== target[k])) {
        diagnostics.push(diagnostic('TARGET_MISMATCH', 'report'));
      }
    } catch {
      target = { targetRoot: process.cwd(), selectedPath: '', revision: null, selectionKind: 'directory' };
      diagnostics.push(diagnostic('INVALID_REPORT_TARGET', 'report'));
    }
  }
  const { targetRoot } = target;
  const checked = new WeakMap();
  function readFindings(input, source) {
    const records = [];
    if (!Array.isArray(input)) {
      diagnostics.push(diagnostic('INVALID_REPORT_FINDING', source || 'report'));
      return records;
    }
    for (const [index, record] of input.entries()) {
      try {
        if (!object(record) || (source && source !== record.source)) throw Error('Invalid finding source');
        if (!checked.has(record)) checked.set(record, validateCanonicalFinding(record.source, record, target));
        const finding = checked.get(record);
        if (finding.locations.some(l => isInScope(l.file, target))) records.push(finding);
        else diagnostics.push(diagnostic('OUT_OF_SCOPE_FINDING', source || 'report', index));
      } catch { diagnostics.push(diagnostic('INVALID_REPORT_FINDING', source || 'report', index)); }
    }
    return records;
  }
  for (const raw of Array.isArray(results.engines) ? results.engines : []) {
    const records = readFindings(raw?.findings, raw?.source);
    try {
      const engine = reportEngine(raw, targetRoot);
      engine.findings = records;
      engine.diagnostics = Array.isArray(raw.diagnostics) ? [...raw.diagnostics] : [];
      if (engine.status === 'complete' && engine.provenance.targetRoot !== targetRoot || engine.provenance.targetRoot && engine.provenance.targetRoot !== targetRoot ||
          engine.provenance.revision && engine.provenance.revision !== target.revision) {
        engine.diagnostics.push(diagnostic('TARGET_MISMATCH', engine.source));
        if (engine.status === 'complete') engine.status = 'partial';
      }
      if (snapshot) {
        if (engine.status === 'complete' && (engine.coverage.selected?.some(p => !isInScope(p, target)) ||
            !Array.isArray(engine.coverage.selected) || !isDeepStrictEqual(coverageDigest(engine.coverage.selected), target.coverageDigest))) {
          engine.status = 'partial';
          engine.diagnostics.push(diagnostic('COVERAGE_TARGET_MISMATCH', engine.source));
        }
      } else {
        delete engine.supportingFiles;
        validateEngineScope(engine, target);
        // The live binder proved this set against the filesystem. Keep a compact
        // report-time identity so later serialization cannot silently truncate it.
        if (engine.status === 'complete') {
          const digest = coverageDigest(engine.coverage.selected);
          if (target.coverageDigest && !isDeepStrictEqual(target.coverageDigest, digest)) {
            engine.status = 'partial'; engine.diagnostics.push(diagnostic('COVERAGE_TARGET_MISMATCH', engine.source));
          } else target.coverageDigest = digest;
        }
      }
      for (const f of engine.findings) fromEngines.push(f);
      engines.push(engine);
      for (const d of engine.diagnostics) {
        if (object(d) && typeof d.code === 'string' && d.source === engine.source) diagnostics.push(d);
        else diagnostics.push(diagnostic('INVALID_REPORT_ENGINE', 'report'));
      }
    } catch {
      fromEngines.push(...records);
      diagnostics.push(diagnostic('INVALID_REPORT_ENGINE', 'report'));
    }
  }
  let aggregate = [];
  if (Object.hasOwn(results, 'findings')) {
    aggregate = readFindings(results.findings);
    if (engines.length) {
      const engineIds = new Set(fromEngines.map(f => f.id));
      const aggregateIds = new Set(aggregate.map(f => f.id));
      if (engineIds.size !== aggregateIds.size || [...engineIds].some(id => !aggregateIds.has(id))) {
        diagnostics.push(diagnostic('INCONSISTENT_REPORT_FINDINGS', 'report'));
      }
    }
  } else if (!engines.length) {
    for (const [source, raw] of [['adversary', results.cloudflareFindings || []], ['architect', results.alibabaComments || []]]) {
      try {
        const normalized = normalizeFindings(source, raw, target);
        for (const f of readFindings(normalized.findings, source)) aggregate.push(f);
        for (const d of normalized.diagnostics) diagnostics.push(d);
      } catch { diagnostics.push(diagnostic('INVALID_LEGACY_REPORT_INPUT', source)); }
    }
  }
  const findings = deduplicateFindings([...fromEngines, ...aggregate]);
  const hasCompleteEvidence = ['architect', 'dual'].includes(mode) && requiredSources.every(source => {
    const requested = engines.filter(e => e.source === source);
    return requested.length === 1 && requested[0].status === 'complete' && isCompleteCoverage(requested[0].coverage);
  });
  const invalidInput = diagnostics.some(d => !informativeDiagnostic(d, requiredSources, engines)) ||
    results.errors != null && (!Array.isArray(results.errors) || results.errors.length > 0);
  const complete = results.status === 'complete' && hasCompleteEvidence && !invalidInput;
  const status = complete ? 'complete' : results.status === 'failed' ? 'failed' : 'partial';
  return { diagnostics, engines, findings, status, target };
}
function partition(findings) {
  const confirmed = findings.filter(f => f.verdict === 'confirmed');
  const p0 = confirmed.filter(f => f.severity === 'critical');
  const p1 = confirmed.filter(f => f.severity === 'high');
  const p2 = confirmed.filter(f => ['medium', 'low', 'informational'].includes(f.severity));
  const unrated = confirmed.filter(f => f.severity === null);
  const unresolved = findings.filter(f => f.verdict === 'needs_validation');
  const rejected = findings.filter(f => f.verdict === 'rejected');
  return { p0, p1, p2, unrated, unresolved, rejected };
}

// Public gate input is the synthesized v2 JSON report (including after a JSON
// round trip), not an AuditResult. Missing or contradictory evidence is exit 2.
export function getReviewExitCode(report) {
  try {
    if (report?.schemaVersion !== 'doublecheck/report/v2' || report.status !== 'complete' ||
        !['dual', 'architect'].includes(report.reviewMode) || !object(report.summary) ||
        typeof report.summary.targetPath !== 'string' || !Array.isArray(report.findings) ||
        !Array.isArray(report.engines) || !Array.isArray(report.diagnostics) || !object(report.target) ||
        typeof report.target.targetRoot !== 'string' || !path.isAbsolute(report.target.targetRoot) ||
        !['file', 'directory'].includes(report.target.selectionKind) ||
        !object(report.target.coverageDigest) || !Number.isSafeInteger(report.target.coverageDigest.count) || report.target.coverageDigest.count < 1 ||
        !/^[a-f0-9]{64}$/.test(report.target.coverageDigest.sha256) ||
        !Array.isArray(report.errors) || report.errors.length > 0 ||
        !Array.isArray(report.correlations) ||
        typeof report.target.selectedPath !== 'string' || path.isAbsolute(report.target.selectedPath) ||
        report.target.selectedPath.split('/').includes('..')) return 2;
    if (report.summary.targetPath !== path.join(report.target.targetRoot, report.target.selectedPath)) return 2;
    // Read the report-time snapshot. Writing the report itself may have changed the target.
    const evidence = collectEvidence(report, report.target);
    if (evidence.status !== 'complete' || report.findings.length !== evidence.findings.length) return 2;
    const buckets = partition(evidence.findings);
    for (const [name, records] of Object.entries(buckets)) {
      if (!isDeepStrictEqual(report[name], records)) return 2;
    }
    for (const name of ['p0', 'p1', 'p2', 'unresolved', 'rejected']) {
      if (report.summary[name + 'Count'] !== buckets[name].length) return 2;
    }
    if (buckets.unresolved.some(f => f.severity == null || ['critical', 'high'].includes(f.severity))) return 2;
    return buckets.p0.length || buckets.p1.length ? 1 : 0;
  } catch { return 2; }
}
export function synthesizeReport(results = {}, options = {}) {
  const { diagnostics, engines, findings, status, target } = collectEvidence(results);
  const { p0, p1, p2, unrated, unresolved, rejected } = partition(findings);
  const { correlations, correlationSummary } = summarizeCorrelations(findings.filter(f => f.source === 'adversary'), findings.filter(f => f.source === 'architect'));
  if (correlationSummary.truncated) diagnostics.push(diagnostic('CORRELATIONS_TRUNCATED', 'report'));
  const summary = { targetPath: path.join(target.targetRoot, target.selectedPath), timestamp: results.timestamp || new Date().toISOString(), p0Count: p0.length, p1Count: p1.length, p2Count: p2.length, unresolvedCount: unresolved.length, rejectedCount: rejected.length };
  const json = { schemaVersion: 'doublecheck/report/v2', target, status, reviewMode: results.reviewMode || 'dual', summary, engines, findings, correlations, correlationSummary, p0, p1, p2, unrated, unresolved, rejected, diagnostics, errors: results.errors || [] };
  if (options.format === 'json') return { markdown: '', json, p0Count: p0.length, p1Count: p1.length, p2Count: p2.length };
  const label = status === 'complete' ? 'Review complete' : status === 'failed' ? 'Review failed' : 'Review incomplete';
  let markdown = `# \`doublecheck\` Audit Report\n\n**${label}**\n\nTarget: ${inline(summary.targetPath)}  \nScope: ${inline(json.reviewMode)}  \nTimestamp: ${inline(summary.timestamp)}\n\n`;
  markdown += `Confirmed P0: ${p0.length} · P1: ${p1.length} · P2: ${p2.length} · Unresolved: ${unresolved.length} · Rejected: ${rejected.length}\n\n## Engine Coverage\n\n`;
  for (const engine of json.engines) {
    markdown += `- ${inline(engine.source)}: **${inline(engine.status)}**; reviewed: ${engine.coverage.reviewed?.length ?? 'unknown'}; coverage origin: ${inline(engine.coverage.origin)}\n`;
    const p = engine.provenance;
    markdown += `  Tool: ${inline(p.tool || 'unknown')} ${inline(p.version || '')}; mode: ${inline(p.mode)}; provider: ${inline(p.provider || 'unknown')}; model: ${inline(p.model || 'unknown')}; endpoint: ${inline(p.endpoint || 'unknown')}\n`;
    for (const support of engine.supportingFiles || []) markdown += `  Supporting evidence outside selection: ${support.files.map(inline).join(', ')} (finding ${inline(support.findingId)})\n`;
    if (engine.requestedInference) {
      const requested = engine.requestedInference;
      markdown += `  Requested provider: ${inline(requested.provider)}; model: ${inline(requested.model)}; endpoint: ${inline(requested.endpoint)} (requested routing, not proof of execution or locality)\n`;
    }
    if (engine.execution) {
      const execution = engine.execution;
      markdown += `  Execution: ${inline(execution.status)}; elapsed: ${inline(execution.elapsedMs)} ms; deadline: ${inline(execution.timeoutMs)} ms\n`;
      if (execution.sessionId) markdown += `  Recovered session: ${inline(execution.sessionId)}; saved completed files: ${inline(execution.completedFiles?.length ?? 'unknown')} (coverage remains unknown)\n`;
    }
  }
  for (const [title, records] of [['Unresolved Candidates', unresolved], ['Confirmed Priority 0', p0], ['Confirmed Priority 1', p1], ['Confirmed Priority 2', p2], ['Confirmed Unrated', unrated], ['Rejected Findings', rejected]]) {
    if (records.length) markdown += `\n## ${title}\n\n${records.map(renderFinding).join('\n')}`;
  }
  if (correlations.length) {
    markdown += '\n## Location Correlations\n\nLocation overlap does not establish a shared root cause or raise severity.\n\n';
    for (const c of correlations) markdown += `- ${inline(c.file)}:${c.startLine}–${c.endLine}: ${c.findingIds.map(id => `[${inline(id)}](#${anchor(id)})`).join(' / ')}\n`;
  }
  if (correlationSummary.truncated) markdown += '\nAdditional overlaps may have been omitted to bound report size and processing time. All individual findings are retained.\n';
  if (diagnostics.length) markdown += `\n## Diagnostics\n\n${diagnostics.map(d => `- ${inline(d.source)}: ${inline(d.code)}`).join('\n')}\n`;
  return { markdown, json, p0Count: p0.length, p1Count: p1.length, p2Count: p2.length };
}
