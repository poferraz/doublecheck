import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
export async function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doublecheck-test-'));
  try { return await fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
