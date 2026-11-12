import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { withTempDir } from './helpers/temp.js';
import { createOcrRunner } from '../src/ocr-process.js';
import { checkEnvironment } from '../src/doctor.js';
import { defaultAlibabaRunner } from '../src/orchestrator.js';
import { recoverScanSession, snapshotSessionIds } from '../src/ocr-session.js';

// Catch replacing tree termination with SIGTERM, or killing only the launcher.
it.skipIf(process.platform === 'win32').each(['timeout', 'output-limit'])('terminates an uncooperative OCR launcher and child on %s while retaining imported findings', async failure => withTempDir(async tmp => {
  const executable = path.join(tmp, 'ocr');
  const pids = path.join(tmp, 'pids');
  fs.writeFileSync(executable, `#!${process.execPath}
import fs from 'node:fs';
import { spawn } from 'node:child_process';
if (process.env.OCR_NO_UPDATE !== '1') process.exit(77);
if (process.argv[2] === 'version') console.log('open-code-review v1.13.3');
else if (process.argv[2] === 'session') console.log('[]');
else {
  process.on('SIGTERM', () => {});
  fs.appendFileSync(process.env.OCR_TEST_PIDS, process.pid + '\\n');
  if (process.argv[2] !== '--descendant') {
    const child = spawn(process.execPath, [process.argv[1], '--descendant'], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    if (process.env.OCR_TEST_FAILURE === 'output-limit') child.once('message', () => process.stdout.write('x'.repeat(2 * 1024 * 1024)));
  } else if (process.send) process.send('ready');
  // Independent cleanup even if the implementation or outer watchdog fails.
  setTimeout(() => process.exit(0), 8000);
  setInterval(() => {}, 100);
}
`, { mode: 0o755 });
  fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}');
  fs.copyFileSync('tests/fixtures/findings/cloudflare-confirmed.json', path.join(tmp, 'findings.json'));
  const driver = `
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runDualAudit } from ${JSON.stringify(new URL('../src/orchestrator.js', import.meta.url).href)};
const root = process.argv[1];
const readPids = () => fs.existsSync(process.env.OCR_TEST_PIDS) ? fs.readFileSync(process.env.OCR_TEST_PIDS, 'utf8').trim().split('\\n').map(Number).filter(pid => Number.isSafeInteger(pid) && pid > 1) : [];
try {
  const started = Date.now();
  const audit = await runDualAudit(root, {
    timeout: ${failure === 'timeout' ? 3000 : 5000}, model: 'test-local', findingsFile: root + '/findings.json',
    readOcrConfig: () => ({ custom_providers: { ollama: { protocol: 'openai', url: 'http://localhost:11434/v1', model: 'test-local', api_key: 'placeholder' } } }),
    fetch: async () => ({ ok: true, json: async () => ({ models: [{ name: 'test-local' }] }) })
  });
  const elapsed = Date.now() - started;
  await new Promise(resolve => setTimeout(resolve, 100));
  const running = readPids().filter(pid => {
    try { process.kill(pid, 0); return !/^Z/.test(execFileSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).trim()); }
    catch { return false; }
  });
  const engine = audit.engines.find(e => e.source === 'architect');
  console.log(JSON.stringify({ elapsed, running, processCount: readPids().length, execution: engine.execution, codes: engine.diagnostics.map(d => d.code), imported: audit.cloudflareFindings.length, status: audit.status }));
} finally {
  for (const pid of readPids()) { try { process.kill(pid, 'SIGKILL'); } catch {} }
}
`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', driver, tmp], {
    encoding: 'utf8', timeout: 15000, killSignal: 'SIGKILL',
    env: { ...process.env, PATH: `${tmp}${path.delimiter}${process.env.PATH}`, OCR_TEST_PIDS: pids, OCR_TEST_FAILURE: failure }
  });
  expect(child.error).toBeUndefined();
  expect(child.status, child.stderr).toBe(0);
  const result = JSON.parse(child.stdout);
  expect(result.execution.elapsedMs).toBeLessThan(6000);
  expect(result.processCount).toBe(2);
  expect(result.running).toEqual([]);
  expect(result.execution.status).toBe(failure === 'timeout' ? 'timed_out' : 'failed');
  expect(result.codes).toContain(failure === 'timeout' ? 'OCR_PROCESS_TIMEOUT' : 'OCR_PROCESS_FAILED');
  expect(result.imported).toBe(1);
  expect(result.status).toBe('partial');
}), 20000);

it.skipIf(process.platform === 'win32').each(['doctor-version', 'native-version', 'session-list', 'session-show', 'session-comments'])('bounds the real process used by %s', async phase => withTempDir(async tmp => {
  const file = path.join(tmp, 'probe.mjs'); const pidFile = path.join(tmp, 'pid');
  const root = fs.realpathSync(tmp); const startedAt = Date.now();
  const id = '12345678-1234-1234-1234-123456789abc';
  const metadata = { summary: { session_id: id, model: 'test-local', review_mode: 'full_scan', repo_dir: root, start_time: new Date(startedAt).toISOString(), completed_files: 1, total_comments: 0 }, items: [{ type: 'done', file_path: 'a.js' }] };
  fs.writeFileSync(file, `
import fs from 'node:fs';
if (process.argv[2] === 'session-comments' && process.argv[4] === 'show') {
  console.log(${JSON.stringify(JSON.stringify(metadata))});
} else {
  process.on('SIGTERM', () => {});
  fs.writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));
  setTimeout(() => process.exit(0), 5000);
  setInterval(() => {}, 100);
}
`);
  const calls = [];
  const runner = async (_command, args, settings) => {
    expect(settings.timeout).toBe(3000);
    const call = { args }; calls.push(call);
    try {
      const output = await createOcrRunner()(process.execPath, [file, phase, ...args], { ...settings, timeout: 1000 });
      call.stdout = output;
      return output;
    } catch (error) { call.errorCode = error.code; throw error; }
  };
  const options = {
    model: 'test-local', execFileSync: runner,
    readOcrConfig: () => ({ custom_providers: { ollama: { protocol: 'openai', url: 'http://localhost:11434/v1', model: 'test-local', api_key: 'placeholder' } } }),
    fetch: async () => ({ ok: true, json: async () => ({ models: [{ name: 'test-local' }] }) })
  };
  try {
    if (phase === 'doctor-version') expect((await checkEnvironment(options)).ok).toBe(false);
    else if (phase === 'native-version') expect((await defaultAlibabaRunner(root, options)).status).toBe('failed');
    else if (phase === 'session-list') expect(await snapshotSessionIds(runner, root)).toBeNull();
    else expect(await recoverScanSession({ runner, target: { targetRoot: root, selectedPath: '' }, model: 'test-local', before: new Set(), stderr: `[ocr] Session: ${id} (retry with: --resume ${id})\n`, startedAt, finishedAt: startedAt + 10000 })).toBeNull();
    expect(Date.now() - startedAt).toBeLessThan(3000);
    expect(fs.existsSync(pidFile), JSON.stringify(calls)).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    const pid = Number(fs.readFileSync(pidFile, 'utf8'));
    expect(Number.isSafeInteger(pid) && pid > 1).toBe(true);
    let running = false;
    try { process.kill(pid, 0); running = !/^Z/.test(execFileSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).trim()); } catch {}
    expect(running).toBe(false);
  } finally {
    if (fs.existsSync(pidFile)) {
      const pid = Number(fs.readFileSync(pidFile, 'utf8'));
      if (Number.isSafeInteger(pid) && pid > 1) { try { process.kill(pid, 'SIGKILL'); } catch {} }
    }
  }
}), 8000);
