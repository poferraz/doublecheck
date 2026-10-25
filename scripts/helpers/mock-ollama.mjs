import http from 'node:http';
const port = Number(process.argv[2]); let requests = 0;
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/tags') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ models: [{ name: 'test-local' }] })); return; }
  if (req.url !== '/v1/chat/completions' || req.method !== 'POST') { res.writeHead(404); res.end(); return; }
  let text = ''; for await (const chunk of req) { text += chunk; if (text.length > 1024 * 1024) { res.writeHead(413); res.end(); return; } }
  const body = JSON.parse(text); requests++;
  if (body.model !== 'test-local' || requests > 30) { res.writeHead(400); res.end(); return; }
  process.send?.({ type: 'request', model: body.model });
  const base = { id: `fixture-${requests}`, object: 'chat.completion', created: 0, model: 'test-local' };
  if (body.stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ ...base, object: 'chat.completion.chunk', choices: [{ index: 0, delta: { role: 'assistant', content: 'No issues found.' }, finish_reason: null }] })}\n\n`);
    res.end(`data: ${JSON.stringify({ ...base, object: 'chat.completion.chunk', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 } })}\n\ndata: [DONE]\n\n`);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ...base, choices: [{ index: 0, message: { role: 'assistant', content: 'No issues found.' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 } }));
  }
});
server.listen(port, '127.0.0.1', () => process.send?.({ type: 'ready' }));
process.on('disconnect', () => server.close(() => process.exit()));
