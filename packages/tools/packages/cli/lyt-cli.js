#!/usr/bin/env node
const { runCli } = require('./dist/index.cjs');
runCli().catch(console.error);
