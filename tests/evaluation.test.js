import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { withTempDir } from './helpers/temp.js';
import { runDualAudit } from '../src/orchestrator.js';
import { synthesizeReport, getReviewExitCode } from '../src/reporter.js';
const cases = JSON.parse(fs.readFileSync('tests/fixtures/evaluation/cases.json', 'utf8'));
// Frozen replies test deterministic evidence handling, not live model detection quality.
it.each(cases)('$name retains frozen source evidence without certifying unknown coverage', async c => withTempDir(async tmp => {
  const source = fs.readFileSync(path.join('tests/fixtures/evaluation/source', c.file), 'utf8');
  expect(source.split('\n')[c.line - 1]).toBe(c.sourceLine);
  fs.writeFileSync(path.join(tmp, c.file), source);
  const result = await runDualAudit(tmp, { cloudflareRunner: () => c.records, alibabaRunner: () => [] });
  const report = synthesizeReport(result);
  expect(report.json.status).toBe(c.expected.status);
  expect(report.p0Count + report.p1Count + report.p2Count).toBe(c.expected.confirmed);
  expect(report.json.unresolved).toHaveLength(c.expected.unresolved);
  expect(getReviewExitCode(report.json)).toBe(2);
}));
