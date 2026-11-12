import http from 'node:http';
import { createMockHandler } from './mock-ollama-handler.mjs';
const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw Error('Invalid mock server port.');
const server = http.createServer(createMockHandler({ onRequest: event => process.send?.(event) }));
server.on('error', error => {
  process.send?.({ type: 'error', code: error.code || 'MOCK_SERVER_FAILED' });
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => process.send?.({ type: 'ready' }));
process.on('disconnect', () => { server.closeAllConnections(); server.close(() => process.exit()); });
