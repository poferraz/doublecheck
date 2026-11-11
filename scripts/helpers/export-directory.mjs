import fs from 'node:fs';
import path from 'node:path';

// Keep every destination component under the invoking user's control. A sticky
// system temp directory may be an ancestor, but not the output root itself.
function outputRoot(input, create) {
  const absolute = path.resolve(input);
  let dir = path.parse(absolute).root;
  if (absolute === dir) throw Error('Choose a dedicated output directory.');
  for (const part of absolute.slice(dir.length).split(path.sep)) {
    dir = path.join(dir, part);
    let stat = fs.lstatSync(dir, { throwIfNoEntry: false });
    if (!stat && create) {
      fs.mkdirSync(dir, { mode: 0o700 });
      stat = fs.lstatSync(dir);
    }
    // macOS exposes system temp directories through these root-owned aliases.
    if (process.platform === 'darwin' && stat?.isSymbolicLink() && stat.uid === 0 &&
        ['/var', '/tmp'].includes(dir) && fs.realpathSync(dir) === '/private' + dir) {
      stat = fs.statSync(dir);
    }
    if (!stat?.isDirectory()) throw Error('Export path components must be real directories.');
    if (typeof process.getuid === 'function') {
      const stickySystemAncestor = dir !== absolute && stat.uid === 0 && (stat.mode & 0o1000);
      if ((stat.uid !== process.getuid() && stat.uid !== 0) ||
          ((stat.mode & 0o022) && !stickySystemAncestor)) {
        throw Error('Use an output directory that other users cannot modify.');
      }
    }
  }
  return absolute;
}

function ensureVacant(root, names) {
  for (const name of names) {
    if (!['claude', 'antigravity', 'cursor', 'windsurf', 'codex', 'review-md'].includes(name)) throw Error('Unknown platform.');
    if (fs.lstatSync(path.join(root, name), { throwIfNoEntry: false })) {
      throw Error('Export target already exists; choose a fresh output directory.');
    }
  }
}

try {
  const [action, input, ...args] = process.argv.slice(2);
  if (!['prepare', 'publish'].includes(action) || !input) throw Error('Invalid export action.');
  const root = outputRoot(input, action === 'prepare');
  const staging = action === 'publish' ? args.shift() : null;
  if (!args.length) throw Error('No export selected.');
  ensureVacant(root, args);
  if (action === 'prepare') process.stdout.write(fs.mkdtempSync(path.join(root, '.doublecheck-export-')));
  else {
    if (path.dirname(staging) !== root || !/^\.doublecheck-export-[a-zA-Z0-9]{6}$/.test(path.basename(staging)) || !fs.lstatSync(staging).isDirectory()) throw Error('Invalid export staging directory.');
    for (const name of args) if (!fs.lstatSync(path.join(staging, name)).isDirectory()) throw Error('Missing staged export.');
    const published = [];
    try {
      for (const name of args) {
        fs.renameSync(path.join(staging, name), path.join(root, name));
        published.push(name);
      }
    } catch (error) {
      for (const name of published.reverse()) fs.renameSync(path.join(root, name), path.join(staging, name));
      throw error;
    }
  }
} catch (error) {
  console.error('Cannot export:', error.message);
  process.exitCode = 1;
}
