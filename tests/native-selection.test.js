import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { resolveAuditTarget, defaultAlibabaRunner } from '../src/orchestrator.js';
import { runCli } from '../src/cli.js';
import { withTempDir } from './helpers/temp.js';

it.each([',', 'first.js,second.js', ' ', 'file.js ', ' file.js', 'part\\name.js'])('rejects unrepresentable literal OCR target %j before provider checks or execution', async name => withTempDir(async tmp => {
  execFileSync('git', ['init', '-q', tmp]);
  const file = path.join(tmp, name); fs.writeFileSync(file, 'secret source');
  let checks = 0; let calls = 0;
  const code = await runCli([file], { checkEnvironment: async () => { checks++; return { ok: false }; } });
  expect(code).toBe(2); expect(checks).toBe(0);
  await expect(defaultAlibabaRunner(file, { execFileSync: () => { calls++; } })).rejects.toThrow(/path|target/i);
  expect(calls).toBe(0);
}));
it('retains ordinary embedded spaces in a literal target', async () => withTempDir(async tmp => {
  execFileSync('git', ['init', '-q', tmp]);
  const file = path.join(tmp, 'quoted file.js'); fs.writeFileSync(file, '');
  expect(resolveAuditTarget(file).selectedPath).toBe('quoted file.js');
}));
