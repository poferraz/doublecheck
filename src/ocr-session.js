import fs from 'node:fs';
import { canonicalizeFindingPath, normalizeFindings } from './contracts.js';
const uuid = '[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}';
function sessionJson(runner, root, args) {
  const output = runner('ocr', ['session', ...args, '--repo', root, '--json'], { encoding: 'utf8', stdio: 'pipe', timeout: 3000, maxBuffer: 16 * 1024 * 1024 });
  return JSON.parse(output);
}
export function snapshotSessionIds(runner, root) {
  try {
    const sessions = sessionJson(runner, root, ['list', '--limit', '0']);
    if (!Array.isArray(sessions) || sessions.some(s => typeof s?.session_id !== 'string')) return null;
    return new Set(sessions.map(s => s.session_id));
  } catch { return null; }
}
export function recoverScanSession({ runner, target, model, before, stderr, startedAt, finishedAt }) {
  try {
    // Only the ID emitted by this process can establish ownership. Never guess
    // from the most recent session: another scan may share the same repo/model.
    const markers = [...String(stderr || '').matchAll(new RegExp(`^\\[ocr\\] Session: (${uuid}) \\(retry with: --resume (${uuid})\\)\\r?$`, 'gm'))];
    if (!markers.length || markers.some(m => m[1] !== m[2]) || new Set(markers.map(m => m[1])).size !== 1) return null;
    const sessionId = markers[0][1];
    if (!(before instanceof Set) || before.has(sessionId)) return null;
    const data = sessionJson(runner, target.targetRoot, ['show', sessionId]);
    const s = data.summary; const time = Date.parse(s?.start_time);
    if (s?.session_id !== sessionId || s.model !== model || s.review_mode !== 'full_scan' || fs.realpathSync(s.repo_dir) !== target.targetRoot || !Number.isFinite(time) || time < startedAt - 1000 || time > finishedAt || !Array.isArray(data.items)) return null;
    const completedFiles = [...new Set(data.items.filter(i => i?.type === 'done').map(i => canonicalizeFindingPath(i.file_path, target.targetRoot)))];
    if (!completedFiles.length || completedFiles.length !== s.completed_files || target.selectedPath && completedFiles.some(p => p !== target.selectedPath && !p.startsWith(`${target.selectedPath}/`))) return null;
    const comments = sessionJson(runner, target.targetRoot, ['comments', sessionId]);
    if (!Array.isArray(comments) || comments.length !== s.total_comments) return null;
    const normalized = normalizeFindings('architect', comments, target);
    if (normalized.invalidRecordCount || normalized.findings.some(f => f.locations.some(l => !completedFiles.includes(l.file)))) return null;
    return { sessionId, completedFiles, findings: normalized.findings };
  } catch { return null; }
}
