import { it, expect } from 'vitest';
import path from 'node:path';
import { normalizeFindings, canonicalizeFindingPath } from '../src/contracts.js';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { stableSerialize } from '../src/contracts.js';
import { validateCanonicalFinding, validateCustomEngine } from '../src/engine-result.js';
import { runDualAudit } from '../src/orchestrator.js';
import { synthesizeReport, getReviewExitCode } from '../src/reporter.js';
import { completeEngine } from './helpers/results.js';
const root = path.resolve('/tmp/example');
const legacy = (overrides = {}) => ({ title: 'Issue', file: 'src/a.js', line: 10, severity: 'HIGH', description: 'Unsafe boundary', ...overrides });
const norm = records => normalizeFindings('adversary', records, { targetRoot: root });
it('normalizes severity without certifying legacy candidates', () => {
  expect(norm([legacy()]).findings[0]).toMatchObject({ verdict: 'needs_validation', severity: 'high' });
  expect(norm([legacy({ severity: null })]).findings[0].severity).toBeNull();
});
it.each(['confirmed', 'needs-validation', 'rejected'])('preserves upstream %s verdict and all trace locations', name => {
  const input = JSON.parse(fs.readFileSync(`tests/fixtures/findings/cloudflare-${name}.json`));
  const result = norm(input);
  expect(result.invalidRecordCount).toBe(0);
  expect(result.findings[0].verdict).toBe(name.replace('-', '_'));
  expect(result.findings[0].locations.some(l => l.kind === 'sink' && l.startLine === 20)).toBe(true);
});
it('rejects invented confirmed records and preserves valid siblings without leaking data', () => {
  const result = norm([null, legacy(), legacy({ severity: 'secret-marker' }), legacy({ verdict: 'confirmed' }), legacy({ file: '../outside.js' }), legacy({ description: {} })]);
  expect(result.findings).toHaveLength(1);
  expect(result.invalidRecordCount).toBe(5);
  expect(JSON.stringify(result.diagnostics)).not.toContain('secret-marker');
  expect(() => norm({ findings: [] })).toThrow();
});
it('canonicalizes paths without merging file identity or traversal', () => {
  expect(canonicalizeFindingPath('src\\a.js', root)).toBe('src/a.js');
  expect(canonicalizeFindingPath(path.join(root, 'src/a.js'), root)).toBe('src/a.js');
  expect(canonicalizeFindingPath('src/../a.js', root)).toBe('a.js');
  for (const p of ['../../outside.js', '/elsewhere/a.js', 'C:\\elsewhere\\a.js', '']) expect(() => canonicalizeFindingPath(p, root)).toThrow();
});
it('keeps same-title distinct concerns and stable exact duplicate IDs', () => {
  const { findings } = norm([legacy(), legacy(), legacy({ description: 'Other concern' }), legacy({ file: 'src/b.js' })]);
  expect(findings[0].id).toBe(findings[1].id);
  expect(new Set(findings.map(f => f.id)).size).toBe(3);
});
it('handles missing lines and rejects reversed or nonnumeric ranges', () => {
  const result = normalizeFindings('architect', [{ path: 'a.js', content: 'Concern', start_line: 0 }, { path: 'a.js', content: 'Bad', start_line: 4, end_line: 2 }, { path: 'a.js', content: 'Bad', start_line: '4' }], { targetRoot: root });
  expect(result.findings[0].locations[0].startLine).toBeNull();
  expect(result.invalidRecordCount).toBe(2);
});
it.each(['constructor', 'toString', 'valueOf', '__proto__'])('rejects undeclared inherited property %s under the pinned schema', key => {
  const record = JSON.parse(fs.readFileSync('tests/fixtures/findings/cloudflare-confirmed.json'))[0];
  Object.defineProperty(record, key, { value: 'undeclared', enumerable: true });
  expect(norm([record]).invalidRecordCount).toBe(1);
});

function rehash(record, mutation) {
  const { id, ...body } = structuredClone(record);
  Object.assign(body, mutation);
  return { ...body, id: body.source + ':' + createHash('sha256').update(stableSerialize(body)).digest('hex') };
}
it('does not certify an architect comment even with a recomputed content ID', () => {
  const target = {targetRoot: root};
  const candidate = normalizeFindings('architect', [{path:'a.js',content:'Unverified',severity:'high'}],target).findings[0];
  const forged = rehash(candidate,{verdict:'confirmed'});
  expect(() => validateCanonicalFinding('architect',forged,target)).toThrow();
});
it('applies the upstream proof contract to canonical adversary verdicts and preserves valid siblings', () => {
  const target = {targetRoot:root,selectedPath:'',revision:null};
  const confirmed = norm(JSON.parse(fs.readFileSync('tests/fixtures/findings/cloudflare-confirmed.json'))).findings[0];
  const falseClaim = rehash(confirmed, {verification:{...confirmed.verification,execution:null}});
  const inconsistent = rehash(confirmed, {severity:'critical'});
  const engine = validateCustomEngine('adversary',{source:'adversary',status:'complete',coverage:{},provenance:{},findings:[falseClaim,inconsistent,confirmed]},target);
  expect(engine.findings).toEqual([confirmed]);
  expect(engine.status).toBe('partial');
  expect(engine.diagnostics.filter(d=>d.code==='INVALID_FINDING').map(d=>d.recordIndex)).toEqual([0,1]);
});

it.each([
  ['trace', 'absolute'], ['trace', 'relative'],
  ['evidence', 'absolute'], ['evidence', 'relative'],
  ['codeChanges', 'absolute and relative']
])('retains confirmed %s through %s path aliases and report serialization', (key, aliasKind) => {
  const raw = JSON.parse(fs.readFileSync('tests/fixtures/findings/cloudflare-confirmed.json'))[0];
  if (key !== 'codeChanges') {
    const alias = { ...raw[key][0], file: aliasKind === 'absolute' ? path.join(process.cwd(), raw[key][0].file) : './' + raw[key][0].file };
    raw[key].push(alias, { ...alias, description: 'Distinct supporting observation' });
  } else {
    raw.remediation.code_changes = [
      { file_name: 'src/a.js', fixed_code: 'first fix' },
      { file_name: path.join(process.cwd(), 'src/a.js'), fixed_code: 'first fix' },
      { file_name: './src/a.js', fixed_code: 'second fix' }
    ];
  }
  const target = { targetRoot: process.cwd() };
  const normalized = normalizeFindings('adversary', [raw], target);
  expect(normalized.invalidRecordCount).toBe(0);
  const finding = normalized.findings[0];
  if (key === 'trace') expect(finding.verification.trace).toHaveLength(3);
  if (key === 'evidence') expect(finding.evidence).toHaveLength(2);
  if (key === 'codeChanges') expect(finding.verification.codeChanges).toEqual([
    { file: 'src/a.js', fixedCode: 'first fix' },
    { file: 'src/a.js', fixedCode: 'second fix' }
  ]);
  expect(() => validateCanonicalFinding('adversary', finding, target)).not.toThrow();
  const report = JSON.parse(JSON.stringify(synthesizeReport({ targetPath: '.', status: 'partial', findings: [finding] }).json));
  expect(report.p1).toHaveLength(1);
  if (key === 'trace') expect(report.p1[0].verification.trace[2].description).toBe('Distinct supporting observation');
  if (key === 'evidence') expect(report.p1[0].evidence[1].description).toBe('Distinct supporting observation');
  if (key === 'codeChanges') expect(report.p1[0].verification.codeChanges[1].fixedCode).toBe('second fix');
});

it.each(['trace', 'evidence'])('still rejects exact upstream duplicates in %s', key => {
  const raw = JSON.parse(fs.readFileSync('tests/fixtures/findings/cloudflare-confirmed.json'))[0];
  raw[key].push({ ...raw[key][0] });
  expect(norm([raw]).invalidRecordCount).toBe(1);
});

it.each([
  ['escaped coverage', e => { e.coverage.selected = ['../outside']; }, 'INVALID_ENGINE_COVERAGE'],
  ['inconsistent coverage', e => { e.coverage.selected = ['src/reporter.js']; }, 'INVALID_ENGINE_COVERAGE'],
  ['missing coverage', e => { delete e.coverage; }, 'INVALID_ENGINE_COVERAGE'],
  ['unknown status', e => { e.status = 'uncertain'; }, 'INVALID_ENGINE_STATUS'],
  ['missing status', e => { delete e.status; }, 'INVALID_ENGINE_STATUS'],
  ['non-object provenance', e => { e.provenance = 'opaque'; }, 'INVALID_ENGINE_PROVENANCE'],
  ['malformed provenance field', e => { e.provenance.model = {}; }, 'INVALID_ENGINE_PROVENANCE'],
  ['missing provenance', e => { delete e.provenance; }, 'INVALID_ENGINE_PROVENANCE']
])('preserves a confirmed blocker despite %s', async (_, mutate, code) => {
  const raw = JSON.parse(fs.readFileSync('tests/fixtures/findings/cloudflare-confirmed.json', 'utf8').replaceAll('src/a.js', 'src/cli.js'))[0];
  const adversary = completeEngine('adversary', [raw]);
  mutate(adversary);
  const audit = await runDualAudit('src/cli.js', {
    cloudflareRunner: async () => adversary,
    alibabaRunner: async () => completeEngine()
  });
  const report = synthesizeReport(audit).json;
  expect(report.p1).toHaveLength(1);
  expect(report.p1[0].title).toBe('Boundary issue');
  expect(report.engines[0].diagnostics.some(d => d.code === code)).toBe(true);
  expect(report.status).toBe('partial');
  expect(getReviewExitCode(report)).toBe(2);
});

it('retains valid provenance fields after an earlier malformed field', () => {
  const raw = completeEngine();
  raw.provenance.tool = {};
  raw.provenance.version = 'known-version';
  const engine = validateCustomEngine('architect', raw, { targetRoot: process.cwd(), selectedPath: 'src/cli.js', revision: null });
  expect(engine.provenance.version).toBe('known-version');
  expect(engine.provenance.targetRoot).toBe(process.cwd());
  expect(engine.status).toBe('partial');
});
