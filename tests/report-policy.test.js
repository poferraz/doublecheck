import fs from 'node:fs';
import { it, expect } from 'vitest';
import { synthesizeReport, getReviewExitCode } from '../src/reporter.js';
import { completeEngine } from './helpers/results.js';
const high = JSON.parse(fs.readFileSync('tests/fixtures/findings/cloudflare-confirmed.json', 'utf8').replaceAll('src/a.js', 'src/cli.js'))[0];
it.each([
  ['complete', [], [], 0], ['complete', [high], [], 1],
  ['partial', [high], [], 2], ['failed', [], [], 2],
  ['complete', [], ['high'], 2], ['complete', [], [null], 2],
  ['complete', [], ['low'], 0]
])('exit policy %s %j %j -> %i', (status, confirmed, pending, code) => {
  const engines = [
    completeEngine('adversary', confirmed),
    completeEngine('architect', pending.map(severity => ({ path: 'src/cli.js', content: 'Candidate', severity })))
  ];
  for (const engine of engines) engine.coverage.selected = engine.coverage.reviewed = ['src/cli.js'];
  const report = synthesizeReport({ targetPath: 'src/cli.js', status, engines, findings: engines.flatMap(e => e.findings) }).json;
  expect(getReviewExitCode(report)).toBe(code);
});
