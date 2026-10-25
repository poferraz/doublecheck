import fs from 'node:fs';
import path from 'node:path';
import { diagnostic } from './contracts.js';
function validate(paths, protectedInputs = []) {
  const protectedPaths = new Set(protectedInputs.filter(Boolean).map(file => path.resolve(file)));
  const protectedInodes = new Set();
  for (const file of protectedPaths) {
    try { const stat = fs.statSync(file); protectedInodes.add(`${stat.dev}:${stat.ino}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const seen = new Set(); const inodes = new Set();
  for (const file of Object.values(paths)) {
    const resolved = path.resolve(file);
    if (protectedPaths.has(resolved)) throw Error('Reports cannot replace review inputs.');
    if (seen.has(resolved)) throw Error('Report destinations must be distinct.');
    seen.add(resolved);
    if (!fs.statSync(path.dirname(resolved)).isDirectory()) throw Error('Report parent must be a directory.');
    try {
      const stat = fs.lstatSync(resolved);
      if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Report destination must be a regular file.');
      const inode = `${stat.dev}:${stat.ino}`;
      if (protectedInodes.has(inode)) throw Error('Reports cannot replace review inputs.');
      if (inodes.has(inode)) throw Error('Report destinations must not be hardlinks.');
      inodes.add(inode);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
export function resolveOutputPaths({ format, output, protectedInputs = [] }) {
  if (!['markdown', 'json', 'both'].includes(format) || typeof output !== 'string' || !output) throw Error('Invalid output configuration.');
  const base = output.replace(/\.(md|json)$/i, '');
  const paths = format === 'both' ? { markdown: path.resolve(`${base}.md`), json: path.resolve(`${base}.json`) } : { [format]: path.resolve(output) };
  validate(paths, protectedInputs); return paths;
}
export function writeReports(paths, report) {
  const written = []; const staged = [];
  try {
    validate(paths);
    const serialized = Object.entries(paths).map(([format, file]) => ({ file, content: format === 'json' ? JSON.stringify(report.json, null, 2) + '\n' : report.markdown }));
    for (const { file, content } of serialized) {
      const tmp = fs.mkdtempSync(path.join(path.dirname(file), '.doublecheck-'));
      const entry = { file, tmp, stagedFile: path.join(tmp, 'report') }; staged.push(entry);
      fs.writeFileSync(entry.stagedFile, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    }
    validate(paths);
    for (const entry of staged) { fs.renameSync(entry.stagedFile, entry.file); written.push(entry.file); }
    return { written, diagnostics: [] };
  } catch { return { written, diagnostics: [diagnostic('REPORT_WRITE_FAILED', 'output')] }; }
  finally { for (const entry of staged) fs.rmSync(entry.tmp, { recursive: true, force: true }); }
}
