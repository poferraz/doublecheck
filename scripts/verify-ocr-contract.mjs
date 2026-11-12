import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, fork } from 'node:child_process';
import { waitForMockMessage } from './helpers/mock-process.mjs';
import { runCli } from '../src/cli.js';
import { runDualAudit } from '../src/orchestrator.js';
const ocrEnvironment = { ...process.env, OCR_NO_UPDATE: '1' };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doublecheck-native-'));
let server;
try {
  const version = execFileSync('ocr', ['version'], { encoding: 'utf8', timeout: 3000, env: ocrEnvironment });
  assert.match(version, /v1\.13\.3\b/);
  fs.writeFileSync(path.join(tmp, 'fixture.js'), 'export function add(a, b) { return a + b; }\n');
  const preview = JSON.parse(execFileSync('ocr', ['scan', '--repo', tmp, '--preview', '--format', 'json'], { encoding: 'utf8', timeout: 10000, env: ocrEnvironment, stdio: ['ignore', 'pipe', 'pipe'] }));
  assert.ok(Array.isArray(preview.files) && preview.files.some(e => e.path === 'fixture.js' && e.will_review));
  if (process.argv.includes('--preview-only')) console.log('OCR 1.13.3 native file-selection preview passed; inference/output conformance was not exercised.');
  else {
    // The selected provider must already be provisioned by a disposable CI job.
    // This script never writes the operator's OCR configuration.
    let requests = 0;
    server = fork(new URL('./helpers/mock-ollama.mjs', import.meta.url), ['18765'], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    const ready = waitForMockMessage(server, 'ready');
    const requestObserved = waitForMockMessage(server, 'request', 45000);
    requestObserved.catch(() => {}); // Keep an early child failure handled until it is awaited below.
    server.on('message', event => { if (event.type === 'request') requests++; });
    await ready;
    const code = await runCli([tmp, '--mode', 'architect', '--model', 'test-local', '--ocr-provider', 'doublecheck-contract', '--ollama', 'http://127.0.0.1:18765', '-f', 'json', '-o', path.join(tmp, 'report.json')], {
      runDualAudit: (target, options) => runDualAudit(target, { ...options, timeout: 30000, concurrency: 1 })
    });
    // Await an actual request notification queued during the synchronous scan.
    await requestObserved;
    const report = JSON.parse(fs.readFileSync(path.join(tmp, 'report.json')));
    const engine = report.engines.find(e => e.source === 'architect');
    assert.ok(requests > 0, 'OCR did not reach the expected mock model server');
    assert.equal(code, 2); assert.equal(engine.status, 'partial');
    assert.equal(engine.provenance.provider, 'doublecheck-contract'); assert.equal(engine.provenance.model, 'test-local');
    assert.ok(engine.diagnostics.some(d => d.code === 'UNKNOWN_NATIVE_COVERAGE'));
    assert.ok(!engine.diagnostics.some(d => d.code === 'OCR_PROCESS_FAILED' || d.code === 'INVALID_OCR_RESULT'));
    console.log('Native OCR routing/output contract passed against loopback mock; scan coverage correctly remains unknown.');
  }
} finally { server?.kill(); fs.rmSync(tmp, { recursive: true, force: true }); }
