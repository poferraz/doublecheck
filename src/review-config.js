import fs from 'node:fs';
import path from 'node:path';
export function generateDefaultReviewMd() { return fs.readFileSync(new URL('./templates/REVIEW.md', import.meta.url), 'utf8'); }
export function initializeReviewConfig(targetDir, { force = false } = {}) {
  if (!fs.statSync(targetDir).isDirectory()) throw Error('Review target must be a directory.');
  const file = path.resolve(targetDir, 'REVIEW.md'); const content = generateDefaultReviewMd();
  let exists = false;
  try {
    const stat = fs.lstatSync(file); exists = true;
    if (stat.isSymbolicLink() || !stat.isFile()) throw Error('Review instructions must be a regular file.');
    if (fs.readFileSync(file, 'utf8') === content) return { path: file, action: 'unchanged' };
    if (!force) throw Error('Existing root review instructions preserved. Use --force to replace them.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!exists) fs.writeFileSync(file, content, { flag: 'wx', mode: 0o644 });
  else {
    const tmp = fs.mkdtempSync(path.join(targetDir, '.doublecheck-review-'));
    try { const staged = path.join(tmp, 'REVIEW.md'); fs.writeFileSync(staged, content, { flag: 'wx', mode: 0o644 }); fs.renameSync(staged, file); }
    finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  return { path: file, action: exists ? 'replaced' : 'created' };
}
