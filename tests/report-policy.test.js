import { it, expect } from 'vitest';
import { getReviewExitCode } from '../src/reporter.js';
it.each([
  ['complete', [], [], 0],
  ['complete', [{ severity: 'high' }], [], 1],
  ['partial', [{ severity: 'critical' }], [], 2],
  ['failed', [], [], 2],
  ['complete', [], [{ severity: 'high' }], 2],
  ['complete', [], [{ severity: null }], 2],
  ['complete', [], [{ severity: 'low' }], 0]
])('exit policy %s %j %j -> %i', (status, confirmed, unresolved, code) => expect(getReviewExitCode({ status, p0: [], p1: confirmed, unresolved })).toBe(code));
