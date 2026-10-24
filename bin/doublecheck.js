#!/usr/bin/env node

import { runCli } from '../src/cli.js';

runCli().then(code => {
  if (typeof code === 'number' && code !== 0) {
    process.exit(code);
  }
}).catch(err => {
  console.error('\x1b[31m[FATAL ERROR]\x1b[0m', err);
  process.exit(1);
});
