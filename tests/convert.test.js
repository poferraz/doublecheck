import { it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

it('converter writes under requested output root', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-convert-'));
  try {
    execFileSync('bash', [path.resolve('scripts/convert.sh'), 'review-md', '--output-dir', tmp]);
    expect(fs.readFileSync(path.join(tmp, 'review-md/REVIEW.md'), 'utf8')).toContain('Review');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
