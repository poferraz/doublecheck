// Bounded synthetic inference responses used only by native contract checks.
export function createMockHandler({ maxRequests = 30, onRequest = () => {} } = {}) {
  let requests = 0;
  return async (req, res) => {
  if (req.url === '/api/tags') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ models: [{ name: 'test-local' }] })); return; }
  if (req.url !== '/v1/chat/completions' || req.method !== 'POST') { res.writeHead(404); res.end(); return; }
  let body;
  try {
    let text = ''; let bytes = 0;
    for await (const chunk of req) {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 1024 * 1024) { res.writeHead(413); res.end(); return; }
      text += chunk;
    }
    body = JSON.parse(text);
  } catch {
    if (!res.destroyed && !res.writableEnded) { res.writeHead(400); res.end(); }
    return;
  }
  if (!body || Array.isArray(body) || body.model !== 'test-local' || requests >= maxRequests) { res.writeHead(400); res.end(); return; }
  requests++;
  onRequest({ type: 'request', model: body.model });
  const base = { id: `fixture-${requests}`, object: 'chat.completion', created: 0, model: 'test-local' };
  // OCR's per-file agent loops until a tool terminates the task. Its summary
  // requests have no task_done tool and expect ordinary assistant text.
  const finishTask = Array.isArray(body.tools) && body.tools.some(t => t?.type === 'function' && t.function?.name === 'task_done');
  const call = { id: `call-${requests}`, type: 'function', function: { name: 'task_done', arguments: '{"state":"DONE"}' } };
  const message = finishTask ? { role: 'assistant', tool_calls: [body.stream ? { index: 0, ...call } : call] } :
    { role: 'assistant', content: 'No issues found.' };
  const reason = finishTask ? 'tool_calls' : 'stop';
  if (body.stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ ...base, object: 'chat.completion.chunk', choices: [{ index: 0, delta: message, finish_reason: null }] })}\n\n`);
    res.end(`data: ${JSON.stringify({ ...base, object: 'chat.completion.chunk', choices: [{ index: 0, delta: {}, finish_reason: reason }], usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 } })}\n\ndata: [DONE]\n\n`);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ...base, choices: [{ index: 0, message, finish_reason: reason }], usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 } }));
  }
  };
}
