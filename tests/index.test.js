import { describe, it, expect } from 'vitest';
import * as doublecheck from '../src/index.js';

describe('Canonical Library Index Export', () => {
  it('exports all core capabilities and functions expected by external consumers', () => {
    expect(doublecheck.checkEnvironment).toBeTypeOf('function');
    expect(doublecheck.selectBestModel).toBeTypeOf('function');
    expect(doublecheck.runDualAudit).toBeTypeOf('function');
    expect(doublecheck.defaultAlibabaRunner).toBeTypeOf('function');
    expect(doublecheck.defaultCloudflareRunner).toBeTypeOf('function');
    expect(doublecheck.detectConvergence).toBeTypeOf('function');
    expect(doublecheck.synthesizeReport).toBeTypeOf('function');
    expect(doublecheck.normalizePath).toBeTypeOf('function');
    expect(doublecheck.parseCliArgs).toBeTypeOf('function');
    expect(doublecheck.runCli).toBeTypeOf('function');
  });
});
