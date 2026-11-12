import { it, expect, vi, afterEach } from 'vitest';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { createMockHandler } from '../scripts/helpers/mock-ollama-handler.mjs';
import { waitForMockMessage } from '../scripts/helpers/mock-process.mjs';
afterEach(() => vi.useRealTimers());
function response() {
  return { statusCode: 200, body: '', headers: {}, setHeader(k, v) { this.headers[k] = v; }, writeHead(code) { this.statusCode = code; }, write(text) { this.body += text; }, end(text = '') { this.body += text; this.writableEnded = true; } };
}
async function request(handler, text) {
  const req = Readable.from([text]); req.url = '/v1/chat/completions'; req.method = 'POST';
  const res = response(); await handler(req, res); return res;
}
it.each(['{', '', 'null', '[]'])('returns 400 for malformed or invalid request %s without killing later requests', async text => {
  const handler = createMockHandler();
  expect((await request(handler, text)).statusCode).toBe(400);
  const valid = await request(handler, '{"model":"test-local"}');
  expect(valid.statusCode).toBe(200); expect(JSON.parse(valid.body).choices[0].message.content).toBe('No issues found.');
});
it('handles aborted upload streams and oversized requests', async () => {
  const handler = createMockHandler();
  const req = Readable.from((async function* () { yield '{'; throw Error('aborted'); })());
  req.url = '/v1/chat/completions'; req.method = 'POST';
  const res = response(); await expect(handler(req, res)).resolves.toBeUndefined(); expect(res.statusCode).toBe(400);
  expect((await request(handler, 'a'.repeat(1024 * 1024 + 1))).statusCode).toBe(413);
});
it('retains bounded valid model requests and streaming responses', async () => {
  const seen = []; const handler = createMockHandler({ maxRequests: 2, onRequest: event => seen.push(event) });
  expect((await request(handler, '{"model":"test-local","stream":true}')).body).toContain('[DONE]');
  expect((await request(handler, '{')).statusCode).toBe(400);
  expect((await request(handler, '{"model":"test-local"}')).statusCode).toBe(200);
  expect((await request(handler, '{"model":"test-local"}')).statusCode).toBe(400);
  expect(seen).toHaveLength(2);
});
it.each([false, true])('finishes an OCR scan via the offered task_done tool (stream=%s)', async stream => {
  const req = { model: 'test-local', stream, tools: [{ type: 'function', function: { name: 'task_done' } }] };
  const res = await request(createMockHandler(), JSON.stringify(req));
  expect(res.statusCode).toBe(200);
  let call; let reason;
  if (stream) {
    const events = res.body.trim().split('\n\n').map(s => s.slice('data: '.length));
    expect(events.pop()).toBe('[DONE]');
    const choices = events.map(s => JSON.parse(s).choices[0]);
    call = choices[0].delta.tool_calls?.[0];
    expect(call?.index).toBe(0);
    reason = choices.at(-1).finish_reason;
  } else {
    const choice = JSON.parse(res.body).choices[0];
    call = choice.message.tool_calls?.[0];
    reason = choice.finish_reason;
  }
  expect(reason).toBe('tool_calls');
  expect(call).toMatchObject({ id: expect.any(String), type: 'function', function: { name: 'task_done' } });
  expect(JSON.parse(call.function.arguments)).toEqual({ state: 'DONE' });
});
it('waits for the requested IPC message and cleans listeners/timer', async () => {
  vi.useFakeTimers(); const child = new EventEmitter();
  const waiting = waitForMockMessage(child, 'ready');
  child.emit('message', { type: 'request' }); child.emit('message', { type: 'ready' });
  await expect(waiting).resolves.toEqual({ type: 'ready' });
  expect(child.listenerCount('message')).toBe(0); expect(vi.getTimerCount()).toBe(0);
});
it.each(['exit', 'error', 'message'])('fails immediately on mock startup %s', async event => {
  const child = new EventEmitter(); const waiting = waitForMockMessage(child, 'ready');
  const assertion = expect(waiting).rejects.toThrow();
  child.emit(event, event === 'message' ? { type: 'error', code: 'EADDRINUSE' } : event === 'error' ? Error('spawn failed') : 1);
  await assertion; expect(child.listenerCount('message')).toBe(0);
});
it('rejects a mock startup deadline and releases listeners', async () => {
  vi.useFakeTimers(); const child = new EventEmitter();
  const waiting = waitForMockMessage(child, 'ready', 10); const assertion = expect(waiting).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(10); await assertion;
  expect(child.listenerCount('exit')).toBe(0); expect(vi.getTimerCount()).toBe(0);
});
