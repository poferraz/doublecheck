import path from 'node:path';
import { isCompleteCoverage } from './engine-result.js';
import { normalizeFindings, diagnostic } from './contracts.js';
import { correlateFindings, deduplicateFindings } from './correlation.js';
export function normalizePath(p = '') { return path.posix.normalize(p.replace(/\\/g, '/')); }
export const detectConvergence = correlateFindings;
const escape = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/([\\`*_{}\[\]()#+.!|~-])/g, '\\$1');
const inline = value => escape(String(value ?? '').replace(/[\r\n\x00-\x1f]/g, ' '));
function renderFinding(f) {
  let out = `### ${inline(f.title)}\n\n- Source: ${inline(f.source)}\n- Verdict: ${inline(f.verdict)}\n- Severity: ${inline(f.severity || 'Unrated')}\n`;
  for (const l of f.locations) out += `- Location: ${inline(l.file)}:${l.startLine ?? 'unknown'}${l.endLine && l.endLine !== l.startLine ? `–${l.endLine}` : ''}\n`;
  out += `\n${escape(f.description)}\n\n`;
  for (const e of f.evidence) out += `- Evidence: ${inline(e.file)}:${e.startLine ?? 'unknown'} — ${escape(e.description)}\n`;
  if (f.verification) {
    if (f.verification.rejectionReason) out += `Rejection reason: ${escape(f.verification.rejectionReason)}\n\n`;
    for (const blocker of f.verification.blockers || []) out += `- Validation blocker: ${escape(blocker)}\n`;
    for (const [where, instructions] of Object.entries(f.verification.validationPlan || {})) out += `- Validation plan (${inline(where)}): ${escape(instructions)}\n`;
  }
  if (f.remediation) {
    const runs = f.remediation.match(/`+/g) || [];
    const fence = '`'.repeat(Math.max(4, ...runs.map(x => x.length + 1)));
    out += `\nRecommended remediation:\n\n${fence}\n${f.remediation}\n${fence}\n\n`;
  }
  return out;
}
export function getReviewExitCode(report) {
  if (report.status !== 'complete') return 2;
  if (report.unresolved?.some(f => f.severity == null || ['critical', 'high'].includes(f.severity))) return 2;
  return report.p0?.length || report.p1?.length ? 1 : 0;
}
export function synthesizeReport(results = {}) {
  const diagnostics = [...(results.engines || []).flatMap(e => e.diagnostics || [])];
  let input = results.findings;
  if (!Array.isArray(input)) {
    input = [];
    for (const [source, raw] of [['adversary', results.cloudflareFindings || []], ['architect', results.alibabaComments || []]]) {
      try {
        const normalized = normalizeFindings(source, raw, { targetRoot: path.resolve(results.targetPath || '.') });
        input.push(...normalized.findings); diagnostics.push(...normalized.diagnostics);
      } catch { diagnostics.push(diagnostic('INVALID_LEGACY_REPORT_INPUT', source)); }
    }
  }
  const findings = deduplicateFindings(input);
  const confirmed = findings.filter(f => f.verdict === 'confirmed');
  const p0 = confirmed.filter(f => f.severity === 'critical');
  const p1 = confirmed.filter(f => f.severity === 'high');
  const p2 = confirmed.filter(f => ['medium', 'low', 'informational'].includes(f.severity));
  const unrated = confirmed.filter(f => f.severity === null);
  const unresolved = findings.filter(f => f.verdict === 'needs_validation');
  const rejected = findings.filter(f => f.verdict === 'rejected');
  const correlations = correlateFindings(findings.filter(f => f.source === 'adversary'), findings.filter(f => f.source === 'architect'));
  const requiredSources = results.reviewMode === 'architect' ? ['architect'] : ['adversary', 'architect'];
  const hasCompleteEvidence = requiredSources.every(source => {
    const engines = (results.engines || []).filter(e => e.source === source);
    return engines.length === 1 && engines[0].status === 'complete' && isCompleteCoverage(engines[0].coverage);
  });
  const status = results.status === 'complete' ? hasCompleteEvidence ? 'complete' : 'partial' : ['partial', 'failed'].includes(results.status) ? results.status : 'partial';
  const summary = { targetPath: results.targetPath || '.', timestamp: results.timestamp || new Date().toISOString(), p0Count: p0.length, p1Count: p1.length, p2Count: p2.length, unresolvedCount: unresolved.length, rejectedCount: rejected.length };
  const json = { schemaVersion: 'doublecheck/report/v2', status, reviewMode: results.reviewMode || 'dual', summary, engines: results.engines || [], findings, correlations, p0, p1, p2, unrated, unresolved, rejected, diagnostics, errors: results.errors || [] };
  const label = status === 'complete' ? 'Review complete' : status === 'failed' ? 'Review failed' : 'Review incomplete';
  let markdown = `# \`doublecheck\` Audit Report\n\n**${label}**\n\nTarget: ${inline(summary.targetPath)}  \nScope: ${inline(json.reviewMode)}  \nTimestamp: ${inline(summary.timestamp)}\n\n`;
  markdown += `Confirmed P0: ${p0.length} · P1: ${p1.length} · P2: ${p2.length} · Unresolved: ${unresolved.length} · Rejected: ${rejected.length}\n\n## Engine Coverage\n\n`;
  for (const engine of json.engines) {
    markdown += `- ${inline(engine.source)}: **${inline(engine.status)}**; reviewed: ${engine.coverage.reviewed?.length ?? 'unknown'}; coverage origin: ${inline(engine.coverage.origin)}\n`;
    const p = engine.provenance;
    markdown += `  Tool: ${inline(p.tool || 'unknown')} ${inline(p.version || '')}; mode: ${inline(p.mode)}; provider: ${inline(p.provider || 'unknown')}; model: ${inline(p.model || 'unknown')}; endpoint: ${inline(p.endpoint || 'unknown')}\n`;
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
    for (const c of correlations) markdown += `- ${inline(c.file)}:${c.startLine}–${c.endLine}: ${c.findingIds.map(inline).join(' / ')}\n`;
  }
  if (diagnostics.length) markdown += `\n## Diagnostics\n\n${diagnostics.map(d => `- ${inline(d.source)}: ${inline(d.code)}`).join('\n')}\n`;
  return { markdown, json, p0Count: p0.length, p1Count: p1.length, p2Count: p2.length };
}
