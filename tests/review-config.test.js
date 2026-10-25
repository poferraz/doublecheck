import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { initializeReviewConfig, generateDefaultReviewMd } from '../src/review-config.js';
import { withTempDir } from './helpers/temp.js';
it('creates root review instructions and leaves legacy instructions alone', async () => withTempDir(async tmp => {
  fs.mkdirSync(path.join(tmp, '.github')); fs.writeFileSync(path.join(tmp, '.github/REVIEW.md'), 'legacy custom policy');
  expect(initializeReviewConfig(tmp).action).toBe('created');
  expect(initializeReviewConfig(tmp).action).toBe('unchanged');
  expect(fs.readFileSync(path.join(tmp, 'REVIEW.md'), 'utf8')).toBe(generateDefaultReviewMd());
  expect(fs.readFileSync(path.join(tmp, '.github/REVIEW.md'), 'utf8')).toBe('legacy custom policy');
}));
it('preserves custom rules unless force is explicit and rejects symlinks', async () => withTempDir(async tmp => {
  const file = path.join(tmp, 'REVIEW.md'); fs.writeFileSync(file, 'team rules');
  expect(() => initializeReviewConfig(tmp)).toThrow(); expect(fs.readFileSync(file, 'utf8')).toBe('team rules');
  expect(initializeReviewConfig(tmp, { force: true }).action).toBe('replaced');
  fs.unlinkSync(file); fs.writeFileSync(path.join(tmp, 'other'), 'private'); fs.symlinkSync(path.join(tmp, 'other'), file);
  expect(() => initializeReviewConfig(tmp, { force: true })).toThrow(); expect(fs.readFileSync(path.join(tmp, 'other'), 'utf8')).toBe('private');
}));
it('converter and CLI share the packaged generic template', async () => withTempDir(async tmp => {
  execFileSync('bash', [path.resolve('scripts/convert.sh'), 'review-md', '--output-dir', tmp]);
  expect(fs.readFileSync(path.join(tmp, 'review-md/REVIEW.md'), 'utf8')).toBe(generateDefaultReviewMd());
}));
