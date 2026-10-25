#!/usr/bin/env node

import { runCli } from '../src/cli.js';

runCli().then(code => {
  if (typeof code === 'number' && code !== 0) {
    process.exit(code);
  }
}).catch(err => {
  console.error('Review failed due to an unexpected operational error.');
  process.exit(2);
});
