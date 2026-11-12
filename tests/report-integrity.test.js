import { it, expect } from 'vitest';
import fs from 'node:fs';
import { synthesizeReport, getReviewExitCode } from '../src/reporter.js';
import { completeEngine } from './helpers/results.js';
import { emptyEngine } from '../src/engine-result.js';

const high = JSON.parse(fs.readFileSync('tests/fixtures/findings/cloudflare-confirmed.json', 'utf8').replaceAll('src/a.js', 'src/cli.js'))[0];
const evidence = () => {
  const engines = [completeEngine('adversary', [high]), completeEngine('architect')];
  engines[1].coverage.selected = engines[1].coverage.reviewed = ['src/cli.js'];
  return { targetPath: 'src/cli.js', status: 'complete', reviewMode: 'dual', engines, findings: engines.flatMap(e => e.findings) };
};

it('derives a blocker from engine evidence when the aggregate is absent', () => {
  const raw = evidence(); delete raw.findings;
  const report = synthesizeReport(raw).json;
  expect(report.p1).toHaveLength(1);
  expect(getReviewExitCode(report)).toBe(1);
});

it.each(['top', 'engine'])('preserves the blocker and fails closed when the %s copy omits it', copy => {
  const raw = evidence();
  if (copy === 'top') raw.findings = []; else raw.engines[0].findings = [];
  const report = synthesizeReport(raw).json;
  expect(report.p1).toHaveLength(1);
  expect(report.status).toBe('partial');
  expect(getReviewExitCode(report)).toBe(2);
});

it.each([null, {}, { status: 'complete' }, evidence()])('rejects non-report exit inputs', input => {
  expect(getReviewExitCode(input)).toBe(2);
});

it.each([
  ['hidden bucket', r => { r.p1 = []; }],
  ['missing bucket', r => { delete r.unresolved; }],
  ['wrong schema', r => { r.schemaVersion = 'v0'; }],
  ['altered engine evidence', r => { r.engines[0].findings = []; }],
  ['missing aggregate', r => { r.findings = []; }],
  ['wrong bucket data', r => { r.p1[0].severity = 'low'; }],
  ['uncovered source', r => { r.engines = []; }],
  ['invalid mode', r => { r.reviewMode = 'off'; }]
])('rejects a serialized report with %s', (_, mutate) => {
  const report = JSON.parse(JSON.stringify(synthesizeReport(evidence()).json));
  expect(getReviewExitCode(report)).toBe(1);
  mutate(report);
  expect(getReviewExitCode(report)).toBe(2);
});

it('does not certify an engine manifest for a file other than the selected one', () => {
  const raw = evidence();
  raw.targetPath = 'src/orchestrator.js'; // Both manifests actually cover src/cli.js.
  const report = synthesizeReport(raw).json;
  expect(report.status).toBe('partial');
  expect(getReviewExitCode(report)).toBe(2);
});

it.each([
  ['lost report diagnostics', r => { r.diagnostics.push({ code: 'INVALID_REPORT_FINDING' }); }],
  ['non-list engine diagnostics', r => { r.engines[0].diagnostics = 123; }],
  ['failed engine execution', r => { r.engines[0].execution = { status: 'failed' }; }],
  ['retargeted summary', r => { r.summary.targetPath = 'some-unreviewed-file'; }],
  ['non-report errors', r => { r.errors = 'failed'; }],
  ['missing correlations', r => { delete r.correlations; }]
])('rejects a supposedly complete report with %s', (_, mutate) => {
  const report = JSON.parse(JSON.stringify(synthesizeReport(evidence()).json));
  mutate(report);
  expect(getReviewExitCode(report)).toBe(2);
});

it('labels other files as supporting evidence in the human report for a single-file review', () => {
  const raw = structuredClone(high);
  raw.trace[0].file = 'src/reporter.js';
  const adversary = completeEngine('adversary', [raw], process.cwd(), ['src/cli.js']);
  const report = synthesizeReport({ ...evidence(), engines: [adversary, completeEngine('architect')], findings: adversary.findings });
  expect(report.markdown).toContain('Supporting evidence outside selection');
  expect(report.json.engines[0].supportingFiles[0].files).toEqual(['src/reporter.js']);
  expect(getReviewExitCode(report.json)).toBe(1);
});
it('rejects phantom child findings under a selected regular file', () => {
  const report = synthesizeReport({ status: 'partial', targetPath: 'src/cli.js', cloudflareFindings: [{title:'Phantom',file:'src/cli.js/child',line:1}] });
  expect(report.json.findings).toEqual([]);
  expect(report.json.diagnostics.some(d => d.code === 'OUT_OF_SCOPE_FINDING')).toBe(true);
});
it('builds JSON without rendering an unused Markdown report', () => {
  const report = synthesizeReport(evidence(), { format: 'json' });
  expect(report.markdown).toBe(''); expect(report.json.p1).toHaveLength(1);
  expect(getReviewExitCode(report.json)).toBe(1);
});
it('refuses a truncated directory manifest after a JSON round trip without rescanning report files', async () => {
  const os = await import('node:os'); const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doublecheck-snapshot-'));
  try {
    for (const file of ['a.js', 'b.js']) fs.writeFileSync(path.join(dir, file), '');
    const engine = completeEngine('architect', [], dir, ['a.js', 'b.js']);
    const report = JSON.parse(JSON.stringify(synthesizeReport({status:'complete',reviewMode:'architect',targetPath:dir,engines:[engine],findings:[]}).json));
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report));
    expect(getReviewExitCode(report)).toBe(0);
    report.engines[0].coverage.selected.pop(); report.engines[0].coverage.reviewed.pop();
    expect(getReviewExitCode(report)).toBe(2);
  } finally { fs.rmSync(dir, {recursive:true,force:true}); }
});

const cleanArchitect = () => ({ targetPath: 'src/cli.js', status: 'complete', reviewMode: 'architect', engines: [completeEngine()], findings: [] });

const failureDiagnostics = ['OCR_PROCESS_TIMEOUT', 'ENGINE_WARNING', 'UNRECOGNIZED_REVIEW_FAILURE', 'LENS_NOT_REQUESTED']
  .flatMap(code => ['report', 'engine'].flatMap(where => ['raw', 'serialized'].map(stage => [code, where, stage])));
it.each(failureDiagnostics)('fails closed on %s in %s diagnostics of a %s report', (code, where, stage) => {
  const input = stage === 'raw' ? cleanArchitect() : JSON.parse(JSON.stringify(synthesizeReport(cleanArchitect()).json));
  const owner = where === 'engine' ? input.engines[0] : input;
  owner.diagnostics = [{ code, source: 'architect' }];
  const report = stage === 'raw' ? synthesizeReport(input).json : input;
  if (stage === 'raw') expect(report.status).toBe('partial');
  expect(getReviewExitCode(report)).toBe(2);
});

it.each(['raw', 'serialized'])('fails closed on recorded errors in a %s report', stage => {
  const input = stage === 'raw' ? cleanArchitect() : JSON.parse(JSON.stringify(synthesizeReport(cleanArchitect()).json));
  input.errors = ['architect review failed'];
  const report = stage === 'raw' ? synthesizeReport(input).json : input;
  if (stage === 'raw') expect(report.status).toBe('partial');
  expect(getReviewExitCode(report)).toBe(2);
});

it('keeps correlation truncation and an unrequested skipped lens informational', () => {
  const raw = cleanArchitect();
  raw.diagnostics = [{ code: 'CORRELATIONS_TRUNCATED', source: 'report' }];
  raw.engines.push(emptyEngine('adversary', 'skipped', 'LENS_NOT_REQUESTED', { targetRoot: process.cwd() }));
  const report = JSON.parse(JSON.stringify(synthesizeReport(raw).json));
  expect(report.status).toBe('complete');
  expect(getReviewExitCode(report)).toBe(0);
});

it.each(['LENS_NOT_REQUESTED', 'OPAQUE_FAILURE'])('does not let a skipped lens hide %s on the required engine', code => {
  const raw = cleanArchitect();
  raw.engines.push(emptyEngine('adversary', 'skipped', 'LENS_NOT_REQUESTED', { targetRoot: process.cwd() }));
  raw.engines[0].diagnostics = [{ code, source: 'adversary' }];
  const report = synthesizeReport(raw).json;
  expect(report.status).toBe('partial');
  expect(getReviewExitCode(report)).toBe(2);
});

it('does not treat an engine diagnostic as report correlation metadata', () => {
  const raw = cleanArchitect();
  raw.engines[0].diagnostics = [{ code: 'CORRELATIONS_TRUNCATED', source: 'architect' }];
  const report = synthesizeReport(raw).json;
  expect(report.status).toBe('partial');
  expect(getReviewExitCode(report)).toBe(2);
});
