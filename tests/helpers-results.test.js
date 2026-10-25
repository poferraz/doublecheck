import { it, expect } from 'vitest';
import { completeEngine } from './helpers/results.js';
it('fails immediately for invalid complete-engine fixture records', () => {
  expect(() => completeEngine('architect', [null])).toThrow();
});
it('declares coverage for fixture finding files while retaining an explicit clean-file default', () => {
  const engine = completeEngine('architect', [{ path: 'other.js', content: 'Concern' }]);
  expect(engine.coverage.selected).toEqual(['other.js']);
  expect(engine.coverage.reviewed).toEqual(['other.js']);
  expect(completeEngine().coverage.selected).toEqual(['src/a.js']);
});
