import { it, expect } from 'vitest';
import { checkEnvironment, selectBestModel } from '../src/doctor.js';
const model = 'qwen2.5-coder:7b';
const config = () => ({ custom_providers: { ollama: { url: 'http://localhost:11434/v1', protocol: 'openai', model, api_key: 'ollama' } } });
const ready = (options = {}) => checkEnvironment({ model, fetch: async () => ({ ok: true, json: async () => ({ models: [{ name: model }] }) }), readOcrConfig: config, execFileSync: () => 'open-code-review v1.13.3', ...options });
it('selects available non-embedding models, never inventing a model', () => {
  expect(selectBestModel([])).toBeNull(); expect(selectBestModel([{ name: 'nomic-embed-text' }])).toBeNull();
  expect(selectBestModel([{ name: 'embed' }, { name: model }])).toBe(model);
});
it('requires a usable model and exact requested name or latest alias', async () => {
  expect((await ready()).ok).toBe(true);
  expect((await ready({ fetch: async () => ({ ok: true, json: async () => ({ models: [] }) }) })).ok).toBe(false);
  expect((await ready({ model: 'qwen2.5-coder:70b' })).ok).toBe(false);
});
it('missing required OCR makes readiness fail with visible diagnostics', async () => {
  const result = await ready({ execFileSync: () => { throw Error('secret-marker'); } });
  expect(result.ok).toBe(false); expect(result.ocrAvailable).toBe(false);
  expect(result.errors.join('')).not.toContain('secret-marker');
});
it('connection failures and cloud model refusal never report ready', async () => {
  expect((await ready({ fetch: async () => { throw Error('secret-marker'); } })).ok).toBe(false);
  expect((await ready({ model: 'qwen:cloud', fetch: async () => ({ ok: true, json: async () => ({ models: [{ name: 'qwen:cloud' }] }) }) })).ok).toBe(false);
});
it('auto-selects the best installed model permitted by the named provider', async () => {
  const available = ['qwen2.5-coder:32b', model];
  const result = await ready({ model: '', fetch: async () => ({ ok: true, json: async () => ({ models: available.map(name => ({ name })) }) }) });
  expect(result.ok).toBe(true); expect(result.activeModel).toBe(model);
});
it('never substitutes a configured model for an explicit unusable request', async () => {
  const result = await ready({ model: 'qwen2.5-coder:32b', fetch: async () => ({ ok: true, json: async () => ({ models: [{ name: model }, { name: 'qwen2.5-coder:32b' }] }) }) });
  expect(result.ok).toBe(false);
});
it('auto-selection respects cloud consent and skips unusable cloud candidates', async () => {
  const data = { custom_providers: { ollama: { ...config().custom_providers.ollama, models: ['qwen:cloud'] } } };
  const result = await ready({ model: '', readOcrConfig: () => data, fetch: async () => ({ ok: true, json: async () => ({ models: [{ name: 'qwen:cloud' }, { name: model }] }) }) });
  expect(result.ok).toBe(true); expect(result.activeModel).toBe(model);
  const cloudOnly = await ready({ model: '', readOcrConfig: () => data, fetch: async () => ({ ok: true, json: async () => ({ models: [{ name: 'qwen:cloud' }] }) }) });
  expect(cloudOnly.ok).toBe(false);
});
