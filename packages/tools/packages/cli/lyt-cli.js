#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { runCli } = require('./dist/index.cjs');
runCli().catch(console.error);
