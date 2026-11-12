import fs from 'node:fs';
import path from 'node:path';
import { it, expect } from 'vitest';
import { completeEngine } from './helpers/results.js';
import { withTempDir } from './helpers/temp.js';
it('fails immediately for invalid complete-engine fixture records', () => {
  expect(() => completeEngine('architect', [null])).toThrow();
});
it('requires real files in complete-engine fixtures, including clean scans', () => withTempDir(dir => {
  expect(() => completeEngine('architect', [{ path: 'other.js', content: 'Concern' }], dir)).toThrow();
  expect(() => completeEngine('architect', [], dir, ['gone.js'])).toThrow();
  fs.writeFileSync(path.join(dir, 'other.js'), '');
  expect(completeEngine('architect', [], dir, ['other.js']).coverage.reviewed).toEqual(['other.js']);
  expect(completeEngine().coverage.selected).toEqual(['src/cli.js']);
}));
