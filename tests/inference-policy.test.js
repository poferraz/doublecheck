import { it, expect } from 'vitest';
import { resolveInferencePolicy } from '../src/inference-policy.js';
const config = { custom_providers: { ollama: { url: 'http://127.0.0.1:11434/v1', protocol: 'openai', model: 'qwen:latest', api_key: 'secret-marker' } } };
const resolve = (opts = {}, data = config) => resolveInferencePolicy({ ollamaEndpoint: 'http://127.0.0.1:11434', model: 'qwen:latest', ...opts }, { readOcrConfig: () => data });
it('validates explicit custom provider without claiming model locality', async () => expect(await resolve()).toMatchObject({ provider: 'ollama', endpoint: 'http://127.0.0.1:11434', model: 'qwen:latest', locality: 'unverified', route: 'loopback' }));
it.each(['http://user:secret@localhost:11434', 'http://localhost:11434?key=secret', 'http://localhost:11434/#secret', 'https://remote.example'])('rejects unsafe or unapproved endpoint %s', async url => expect(resolve({ ollamaEndpoint: url })).rejects.toThrow());
it('requires remote opt-in and a matching configured endpoint', async () => {
  await expect(resolve({ model: 'qwen:cloud' })).rejects.toThrow();
  await expect(resolve({ ollamaEndpoint: 'http://localhost:11434' })).rejects.toThrow();
  const remote = { custom_providers: { ollama: { ...config.custom_providers.ollama, url: 'https://remote.example/v1' } } };
  expect(await resolve({ ollamaEndpoint: 'https://remote.example', allowRemote: true }, remote)).toMatchObject({ route: 'remote' });
});
it('rejects ambient cloud providers and credential commands without exposing their values', async () => {
  for (const data of [{ provider: 'openai' }, { custom_providers: { ollama: { ...config.custom_providers.ollama, api_key: '', api_key_cmd: 'secret-marker' } } }]) {
    let error; try { await resolve({}, data); } catch (e) { error = e; }
    expect(error).toBeInstanceOf(Error); expect(error.message).not.toContain('secret-marker');
  }
});
it('accepts only the exact default latest alias, not other model variants', async () => {
  expect(await resolve({ model: 'qwen' })).toMatchObject({ model: 'qwen' });
  await expect(resolve({ model: 'qwen:other' })).rejects.toThrow();
});
