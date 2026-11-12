import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { defaultAlibabaRunner, defaultCloudflareRunner } from '../src/orchestrator.js';
import { withTempDir } from './helpers/temp.js';
const config = () => ({ custom_providers: { ollama: { protocol: 'openai', url: 'http://localhost:11434/v1', model: 'test-local', api_key: 'placeholder' } } });
const fetchModels = async () => ({ ok: true, json: async () => ({ models: [{ name: 'test-local' }] }) });
it('refuses unsupported OCR before scanning through the public native runner', async () => {
  let scans = 0;
  const result = await defaultAlibabaRunner('.', { model: 'test-local', readOcrConfig: config, fetch: fetchModels, execFileSync: (_cmd, args) => {
    if (args[0] === 'version') return 'open-code-review v9.9.9';
    if (args[0] === 'scan') scans++;
    return '[]';
  } });
  expect(scans).toBe(0); expect(result.status).toBe('failed');
  expect(result.diagnostics.some(d => d.code === 'UNSUPPORTED_OCR_VERSION')).toBe(true);
});
it('suppresses the OCR updater for version, session and scan invocations', async () => {
  const calls = [];
  await defaultAlibabaRunner('.', { model: 'test-local', readOcrConfig: config, fetch: fetchModels, execFileSync: (_cmd, args, options) => {
    calls.push({ args, env: options.env });
    if (args[0] === 'version') return 'open-code-review v1.13.3';
    return '[]';
  } });
  expect(calls.some(c => c.args[0] === 'scan')).toBe(true);
  expect(calls.every(c => c.env?.OCR_NO_UPDATE === '1')).toBe(true);
});
it.skipIf(process.platform === 'win32')('rejects a FIFO findings input promptly without a writer', async () => withTempDir(async tmp => {
  const input = path.join(tmp, 'input'); execFileSync('mkfifo', [input]);
  const source = `import {defaultCloudflareRunner} from ${JSON.stringify(new URL('../src/orchestrator.js', import.meta.url).href)}; const result=await defaultCloudflareRunner(process.argv[1],{findingsFile:process.argv[2],target:{targetRoot:process.argv[1],selectedPath:'',revision:null}});console.log(result.status);`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', source, tmp, input], { encoding: 'utf8', timeout: 10000, killSignal: 'SIGKILL' });
  expect(child.error).toBeUndefined(); expect(child.status).toBe(0); expect(child.stdout.trim()).toBe('failed');
}), 15000);
it('refuses oversized regular imports and retains ordinary JSON input', async () => withTempDir(async tmp => {
  const input = path.join(tmp, 'input'); fs.writeFileSync(input, '[]');
  expect((await defaultCloudflareRunner(tmp, { findingsFile: input })).status).toBe('partial');
  fs.truncateSync(input, 16 * 1024 * 1024 + 1);
  expect((await defaultCloudflareRunner(tmp, { findingsFile: input })).status).toBe('failed');
}));
