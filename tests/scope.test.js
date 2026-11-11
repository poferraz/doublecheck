import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { it, expect } from 'vitest';
import { validateCustomEngine, validateEngineScope } from '../src/engine-result.js';
import { normalizeFindings } from '../src/contracts.js';
import { withTempDir } from './helpers/temp.js';
import { runDualAudit } from '../src/orchestrator.js';
import { synthesizeReport, getReviewExitCode } from '../src/reporter.js';

function scope(dir, selectedPath) {
  return { targetRoot: fs.realpathSync(dir), selectedPath, revision: null };
}
function checked(target, files, records = []) {
  const { findings } = normalizeFindings('adversary', records, target);
  return validateCustomEngine('adversary', {
    source: 'adversary', status: 'complete', findings,
    provenance: { targetRoot: target.targetRoot }, diagnostics: [],
    coverage: { selected: files, reviewed: files, failed: [], excluded: [], origin: 'reported' }
  }, target);
}

it('requires the selected file itself to exist and to have been reviewed', () => withTempDir(dir => {
  for (const name of ['request.js','sibling.js']) fs.writeFileSync(path.join(dir, name), '');
  const target = scope(dir, 'request.js');
  expect(checked(target, ['sibling.js']).status).toBe('partial');
  expect(checked(target, ['request.js']).status).toBe('complete');
  fs.unlinkSync(path.join(dir,'request.js'));
  expect(checked(target, ['request.js']).status).toBe('partial');
}));
it('requires every regular file in a selected directory and rejects a sibling with the same prefix', () => withTempDir(dir => {
  for (const name of ['src','src-old']) fs.mkdirSync(path.join(dir,name));
  for (const name of ['src/a','src/b','src-old/z']) fs.writeFileSync(path.join(dir,name),'');
  const target = scope(dir,'src');
  expect(checked(target,['src/a']).status).toBe('partial');
  expect(checked(target,['src-old/z']).status).toBe('partial');
  expect(checked(target,['src/a','src/b']).status).toBe('complete');
}));
it('counts tracked and unignored working files in a Git subtree, not ignored build artifacts', () => withTempDir(dir => {
  fs.mkdirSync(path.join(dir,'src'));
  fs.writeFileSync(path.join(dir,'.gitignore'),'*.tmp\n');
  for (const name of ['src/ignored.tmp','src/tracked.tmp','src/new.js']) fs.writeFileSync(path.join(dir,name),'');
  execFileSync('git',['-C',dir,'init','-q']);
  execFileSync('git',['-C',dir,'add','--force','src/tracked.tmp']);
  const target = scope(dir,'src');
  expect(checked(target,['src/new.js']).status).toBe('partial');
  expect(checked(target,['src/tracked.tmp','src/new.js']).status).toBe('complete');
}));
it('rejects a manifest attributing coverage to a symlink outside the target', () => withTempDir(dir => {
  fs.mkdirSync(path.join(dir,'src')); fs.mkdirSync(path.join(dir,'other'));
  fs.writeFileSync(path.join(dir,'other/z'),'');
  fs.symlinkSync('../other',path.join(dir,'src/link'));
  expect(checked(scope(dir,'src'),['src/link/z']).status).toBe('partial');
}));
it('removes sibling-only findings and identifies supporting locations of a mixed-file trace', () => withTempDir(dir => {
  for (const name of ['a.js','b.js']) fs.writeFileSync(path.join(dir,name),'');
  const result=checked(scope(dir,'a.js'),['a.js'],[
    {title:'Sibling only',file:'b.js',line:1},
    {title:'Not a child of a regular file',file:'a.js/phantom',line:1},
    {title:'Cross-file trace',file:'a.js',line:1,trace:[{file:'b.js',line:1}]}
  ]);
  expect(result.findings.map(f=>f.title)).toEqual(['Cross-file trace']);
  expect(result.status).toBe('partial');
  expect(result.diagnostics.map(d=>d.code)).toContain('OUT_OF_SCOPE_FINDING');
  expect(result.supportingFiles).toEqual([{findingId:result.findings[0].id,files:['b.js']}]);
}));

it('requires a matching provenance root before declaring coverage complete', () => withTempDir(dir => {
  fs.writeFileSync(path.join(dir,'a.js'),'');
  const target = scope(dir,'a.js');
  const confirmed = checked(target,['a.js']);
  expect(confirmed.status).toBe('complete');
  for (const provenance of [{}, {targetRoot: path.dirname(dir)}, {targetRoot: target.targetRoot, revision: 'another-commit'}]) {
    const bounded = validateEngineScope({...confirmed, provenance, diagnostics:[]},target);
    expect(bounded.status).toBe('partial');
    expect(bounded.diagnostics.map(d=>d.code)).toContain('TARGET_MISMATCH');
  }
}));

it.each([
  [{ execution: { status: 'failed', stderr: 'fixture-secret' } }, 'INCOMPLETE_ENGINE_EXECUTION'],
  [{ execution: { status: 'timed_out' } }, 'INCOMPLETE_ENGINE_EXECUTION'],
  [{ diagnostics: [{ code: 'INVALID_FINDING', message: 'fixture-secret' }] }, 'INVALID_FINDING'],
  [{ diagnostics: 'fixture-secret' }, 'INVALID_ENGINE_DIAGNOSTICS'],
  [{ diagnostics: [{ code: 'fixture-secret' }] }, 'ENGINE_WARNING']
])('a custom runner cannot pass the public gate by hiding contradictory metadata: %j', (metadata, code) => withTempDir(async dir => {
  const file = path.join(dir,'a.js'); fs.writeFileSync(file,'');
  const targetRoot = fs.realpathSync(dir);
  const raw = await runDualAudit(file,{ reviewMode: 'architect', alibabaRunner: () => ({
    source: 'architect', status: 'complete', findings: [], diagnostics: [], provenance: { targetRoot },
    coverage: { selected:['a.js'], reviewed:['a.js'], failed:[], excluded:[], origin:'reported' }, ...metadata
  }) });
  const report = synthesizeReport(raw).json;
  expect(getReviewExitCode(report)).toBe(2);
  expect(report.diagnostics.map(d => d.code)).toContain(code);
  if (metadata.execution) expect(report.engines.find(e => e.source === 'architect').execution.status).toBe(metadata.execution.status);
  expect(JSON.stringify(report)).not.toContain('fixture-secret');
}));
