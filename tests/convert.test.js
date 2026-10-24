import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Skill & Configuration Distribution Converter (convert.sh)', () => {
  const scriptPath = path.resolve(__dirname, '../scripts/convert.sh');
  const reviewMdDist = path.resolve(__dirname, '../dist/platforms/review-md/REVIEW.md');

  it('generates Claude Code Review REVIEW.md when running "convert.sh review-md"', () => {
    // Run the shell script target
    execSync(`bash "${scriptPath}" review-md`, { encoding: 'utf8' });

    expect(fs.existsSync(reviewMdDist)).toBe(true);
    const content = fs.readFileSync(reviewMdDist, 'utf8');

    expect(content).toContain('Cloudflare');
    expect(content).toContain('Alibaba');
    expect(content).toContain('Convergence');
    expect(content).toContain('Severity Levels');
  });
});
