import { it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resolveOutputPaths, writeReports } from '../src/output.js';
import { withTempDir } from './helpers/temp.js';
it('both formats remain distinct for JSON, Markdown, and extensionless destinations', async () => withTempDir(async tmp => {
  for (const suffix of ['.json', '.MD', '']) {
    const paths = resolveOutputPaths({ format: 'both', output: path.join(tmp, `report${suffix}`) });
    expect(paths).toEqual({ markdown: path.join(tmp, 'report.md'), json: path.join(tmp, 'report.json') });
    const result = writeReports(paths, { markdown: '# Report', json: { status: 'partial' } });
    expect(result.diagnostics).toEqual([]);
    expect(JSON.parse(fs.readFileSync(paths.json)).status).toBe('partial');
    expect(fs.readFileSync(paths.markdown, 'utf8')).toBe('# Report');
  }
}));
it('rejects symlinks, directories and output hardlink collisions', async () => withTempDir(async tmp => {
  const base = path.join(tmp, 'report'); fs.writeFileSync(`${base}.json`, 'old'); fs.linkSync(`${base}.json`, `${base}.md`);
  expect(() => resolveOutputPaths({ format: 'both', output: base })).toThrow();
  fs.unlinkSync(`${base}.md`); fs.symlinkSync(`${base}.json`, `${base}.md`);
  expect(() => resolveOutputPaths({ format: 'markdown', output: `${base}.md` })).toThrow();
  expect(() => resolveOutputPaths({ format: 'markdown', output: tmp })).toThrow();
}));
it('retains information about a successful artifact when a later rename fails', async () => withTempDir(async tmp => {
  const paths = resolveOutputPaths({ format: 'both', output: path.join(tmp, 'report') });
  const rename = fs.renameSync; let calls = 0;
  const spy = vi.spyOn(fs, 'renameSync').mockImplementation((...args) => { if (++calls === 2) throw Error('secret-marker'); return rename(...args); });
  try {
    const result = writeReports(paths, { markdown: '# Report', json: {} });
    expect(result.written).toHaveLength(1); expect(result.diagnostics).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain('secret-marker');
    expect(fs.readdirSync(tmp)).toHaveLength(1);
  } finally { spy.mockRestore(); }
}));
