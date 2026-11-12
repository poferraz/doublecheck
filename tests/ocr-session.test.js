import { it, expect } from 'vitest';
import { recoverScanSession, snapshotSessionIds } from '../src/ocr-session.js';
const root = process.cwd();
const id = '12345678-1234-1234-1234-123456789abc';
const marker = `[ocr] Session: ${id} (retry with: --resume ${id})\n`;
const startedAt = Date.parse('2026-10-25T02:00:00Z');
function recover(overrides = {}, mutate = () => {}) {
  const metadata = { summary: { session_id: id, repo_dir: root, model: 'test-local', review_mode: 'full_scan', start_time: '2026-10-25T02:00:01Z', completed_files: 1, total_comments: 1 }, items: [{ type: 'done', file_path: 'src/a.js' }] };
  const comments = [{ path: 'src/a.js', content: 'Concern', severity: 'medium' }];
  mutate(metadata, comments);
  return recoverScanSession({ target: { targetRoot: root, selectedPath: 'src' }, model: 'test-local', startedAt, finishedAt: startedAt + 10000, before: new Set(), stderr: marker,
    runner: async (_cmd, args, options) => {
      expect(options.timeout).toBe(3000); expect(options.maxBuffer).toBe(16 * 1024 * 1024);
      expect(args).toContain(root);
      return JSON.stringify(args[1] === 'show' ? metadata : comments);
    }, ...overrides });
}
it('recovers the explicitly identified new session with matching metadata', async () => {
  const result = await recover();
  expect(result.sessionId).toBe(id); expect(result.completedFiles).toEqual(['src/a.js']);
  expect(result.findings[0].verdict).toBe('needs_validation');
});
it('rejects missing, conflicting, and stale session identity', async () => {
  for (const options of [{ stderr: '' }, { stderr: marker + marker.replaceAll(id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') }, { before: new Set([id]) }, { before: null }]) expect(await recover(options)).toBeNull();
});
it.each(['model', 'repo', 'time', 'mode', 'id', 'outside', 'count', 'payload'])('rejects mismatching or malformed session %s', async kind => {
  expect(await recover({}, (data, comments) => {
    if (kind === 'model') data.summary.model = 'different';
    if (kind === 'repo') data.summary.repo_dir = '/tmp/other';
    if (kind === 'time') data.summary.start_time = '2020-01-01T00:00:00Z';
    if (kind === 'mode') data.summary.review_mode = 'diff';
    if (kind === 'id') data.summary.session_id = 'other';
    if (kind === 'outside') data.items[0].file_path = '../outside.js';
    if (kind === 'count') data.summary.total_comments = 2;
    if (kind === 'payload') comments[0] = null;
  })).toBeNull();
});
it('fails closed when the pre-run session inventory is unavailable', async () => {
  expect(await snapshotSessionIds(async () => { throw Error('secret'); }, root)).toBeNull();
  expect(await snapshotSessionIds(async () => JSON.stringify([{ session_id: id }]), root)).toEqual(new Set([id]));
});
it.each([{}, { startedAt: undefined }, { startedAt: NaN }, { finishedAt: undefined }, { finishedAt: Infinity }, { startedAt: startedAt + 20000 }])('rejects invalid ownership bounds %j', async options => {
  if (!Object.keys(options).length) options = { startedAt: undefined, finishedAt: undefined };
  expect(await recover(options)).toBeNull();
});
