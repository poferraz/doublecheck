import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkEnvironment, selectBestModel } from '../src/doctor.js';

describe('Doctor Pre-flight Environment Checks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('selects preferred coding models when available in Ollama model list', () => {
    const models = [
      { name: 'llama3:latest' },
      { name: 'deepseek-v4.1-flash:1017-cloud' },
      { name: 'nomic-embed-text:latest' }
    ];
    const selected = selectBestModel(models);
    expect(selected).toBe('deepseek-v4.1-flash:1017-cloud');
  });

  it('falls back to qwen or first available chat model if preferred model is not present', () => {
    const models = [
      { name: 'nomic-embed-text:latest' },
      { name: 'qwen2.5-coder:7b' }
    ];
    const selected = selectBestModel(models);
    expect(selected).toBe('qwen2.5-coder:7b');
  });

  it('returns ok: true and model details when Ollama is running and responsive', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: 'deepseek-v4.1-flash:1017-cloud' }
        ]
      })
    });

    const result = await checkEnvironment({
      ollamaEndpoint: 'http://localhost:11434',
      skipOcrCheck: true
    });

    expect(result.ok).toBe(true);
    expect(result.ollamaReady).toBe(true);
    expect(result.activeModel).toBe('deepseek-v4.1-flash:1017-cloud');
    expect(result.errors).toHaveLength(0);
  });

  it('returns ok: false and helpful setup instructions when Ollama is offline', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await checkEnvironment({
      ollamaEndpoint: 'http://localhost:11434',
      skipOcrCheck: true
    });

    expect(result.ok).toBe(false);
    expect(result.ollamaReady).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining('Could not connect to local Ollama')
    );
  });
});
