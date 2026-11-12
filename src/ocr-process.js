import { spawn } from 'node:child_process';

function terminateTree(child) {
  if (process.platform !== 'win32') {
    try { process.kill(-child.pid, 'SIGKILL'); }
    catch { try { child.kill('SIGKILL'); } catch {} }
    return Promise.resolve();
  }
  return new Promise(resolve => {
    // taskkill /T includes the native binary launched by the npm wrapper.
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    const timer = setTimeout(() => {
      try { killer.kill('SIGKILL'); } catch {}
      finish();
    }, 1000);
    const finish = () => { clearTimeout(timer); try { child.kill('SIGKILL'); } catch {} killer.unref(); resolve(); };
    killer.once('error', finish);
    killer.once('close', finish);
  });
}

async function runProcess(command, args, options) {
  const limit = options.maxBuffer ?? 1024 * 1024;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env, cwd: options.cwd, stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32', windowsHide: true
    });
    const output = { stdout: [], stderr: [] };
    const sizes = { stdout: 0, stderr: 0 };
    let settled = false; let stopping = false;
    const text = stream => Buffer.concat(output[stream]).toString(options.encoding || 'utf8');
    const finish = error => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      child.stdout.destroy(); child.stderr.destroy(); child.unref();
      if (error) reject(Object.assign(error, { stdout: text('stdout'), stderr: text('stderr') }));
      else resolve(text('stdout'));
    };
    const stop = code => {
      if (settled || stopping) return;
      stopping = true;
      const done = () => finish(Object.assign(Error('OCR process terminated.'), { code }));
      terminateTree(child).then(done, done);
    };
    const timer = setTimeout(() => stop('ETIMEDOUT'), options.timeout);
    for (const stream of ['stdout', 'stderr']) child[stream].on('data', chunk => {
      const remaining = Math.max(0, limit - sizes[stream]);
      if (remaining) output[stream].push(chunk.subarray(0, remaining));
      sizes[stream] += chunk.length;
      if (sizes[stream] > limit) stop('ENOBUFS');
    });
    child.once('error', error => finish(error));
    child.once('close', (status, signal) => {
      if (stopping) return;
      finish(status === 0 ? null : Object.assign(Error('OCR process failed.'), { status, signal }));
    });
  });
}

export function createOcrRunner(override) {
  return async (command, args, settings = {}) => {
    const options = { ...settings, env: { ...process.env, OCR_NO_UPDATE: '1' } };
    return override ? override(command, args, options) : runProcess(command, args, options);
  };
}
