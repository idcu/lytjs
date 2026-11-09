#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * `lyt create` 的等价入口（N15，2026-11-10）。
 *
 * 此前 `require('./dist/create.js')` 指向一个**不存在**的文件（tsup 只产出
 * `create.cjs` / `create.mjs`），而且 `create.*` 只是命令模块、不会自己跑 CLI。
 * 这里改为复用 `dist/index.cjs` 的 `runCli`，并显式注入 `create` 子命令，
 * 让 `npx create-lyt my-app` 与 `lyt create my-app` 等价。
 *
 * 注意：`npx create-lyt` 从 npm 解析**名为 `create-lyt` 的包**；本文件目前
 * 只作为 `@lytjs/cli` 的 bin 别名存在，独立包需 N14 首次发布后才可解析。
 */
const { runCli } = require('./dist/index.cjs');
runCli(['create', ...process.argv.slice(2)]).catch(console.error);
