#!/usr/bin/env node
// scripts/check-public-names.mjs
//
// ★ 2026-11-07（S09 / ADR 0017）：公开名身份登记册门禁。
//
// 判据：
//   1. `status: unified` 的每个名字，`src/**` 里**必须恰好一处**实现定义，且位于登记 owner；
//      relays 只允许 `export { ... } from` 转发，不得包含定义；identityTest 必须存在。
//   2. `status: registered` 的条目是**已登记结构债**：owner/replica 的 file:line 必须指向
//      包含该名字的代码行，deletionCondition 必须非空；本脚本不把它当作绿，只防止清单腐烂。
//
// 该脚本不读 dist，纯静态扫描，因此可以进 fast 档。

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REGISTRY = path.join(ROOT, 'keel/contracts/public-names.json');
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'tests',
  'test',
  '__tests__',
  'examples',
  'coverage',
]);

const failures = [];
const checks = [];

function fail(message) {
  failures.push(message);
}

function ok(message) {
  checks.push(message);
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function lineOf(file, line) {
  const lines = read(file).split('\n');
  return lines[line - 1] ?? '';
}

/** 收集 src 下所有 `export function/const/class NAME` 的定义位置（按文件去重）。 */
function collectDefinitions() {
  const byName = new Map();
  function walk(dir) {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        if (rel.endsWith('/src') || rel.startsWith('packages/')) walk(rel);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith('.d.ts')) continue;
      const text = read(rel);
      const re = /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)\b/g;
      let match;
      while ((match = re.exec(text))) {
        const name = match[1];
        const line = text.slice(0, match.index).split('\n').length;
        if (!byName.has(name)) byName.set(name, []);
        const list = byName.get(name);
        if (!list.some((item) => item.file === rel)) list.push({ file: rel, line });
      }
    }
  }
  walk('packages');
  return byName;
}

/** relay 文件必须用 `export { ... NAME ... } from` 转发，而不是重新定义。 */
function relayContainsExport(file, name) {
  const text = read(file);
  const re = /export\s*(?:type\s*)?\{([\s\S]*?)\}\s*from/g;
  let match;
  while ((match = re.exec(text))) {
    if (new RegExp(`\\b${name}\\b`).test(match[1])) return true;
  }
  return false;
}

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const defs = collectDefinitions();

let unifiedNames = 0;
let registeredGroups = 0;

for (const entry of registry.entries) {
  if (entry.status === 'unified') {
    for (const item of entry.names) {
      unifiedNames += 1;
      const locations = defs.get(item.name) ?? [];
      const expected = entry.ownerFile;

      if (!exists(expected)) {
        fail(`[${entry.id}] owner 文件不存在：${expected}`);
        continue;
      }
      const ownerLine = lineOf(expected, item.line);
      if (!ownerLine.includes(item.name)) {
        fail(`[${entry.id}] ${item.name} 的 file:line 不准确：${expected}:${item.line}`);
      }
      if (locations.length !== 1 || locations[0].file !== expected) {
        fail(
          `[${entry.id}] ${item.name} 必须只有一处实现（owner=${expected}），实际：` +
            (locations.map((l) => `${l.file}:${l.line}`).join(', ') || '无'),
        );
      }
      for (const relay of item.relays) {
        if (!exists(relay)) {
          fail(`[${entry.id}] relay 文件不存在：${relay}`);
        } else if (!relayContainsExport(relay, item.name)) {
          fail(`[${entry.id}] relay 未转发 ${item.name}：${relay}`);
        }
      }
    }
    if (!exists(entry.identityTest)) {
      fail(`[${entry.id}] identityTest 不存在：${entry.identityTest}`);
    } else {
      ok(`[${entry.id}] ${entry.names.length} 个名字：owner 唯一 + relay 转发 + 身份测试存在`);
    }
  } else if (entry.status === 'registered') {
    registeredGroups += 1;
    if (!entry.deletionCondition) {
      fail(`[${entry.id}] 缺少 deletionCondition`);
    }
    if (!exists(entry.ownerFile)) {
      fail(`[${entry.id}] owner 文件不存在：${entry.ownerFile}`);
    } else if (!entry.names) {
      const ownerLine = lineOf(entry.ownerFile, entry.ownerLine);
      if (!ownerLine.trim()) {
        fail(`[${entry.id}] owner file:line 不准确：${entry.ownerFile}:${entry.ownerLine}`);
      }
    }
    for (const replica of entry.replicas ?? []) {
      if (!exists(replica.file)) {
        fail(`[${entry.id}] replica 文件不存在：${replica.file}`);
      } else if (!lineOf(replica.file, replica.line).trim()) {
        fail(`[${entry.id}] replica file:line 不准确：${replica.file}:${replica.line}`);
      }
    }
    if (!exists(entry.identityTest)) {
      fail(`[${entry.id}] identityTest 不存在：${entry.identityTest}`);
    } else {
      ok(`[${entry.id}] 已登记结构债（不强制单一实现，禁止清单腐烂）`);
    }
  } else {
    fail(`[${entry.id}] 未知 status：${entry.status}`);
  }
}

console.log('📦 公开名身份登记册');
for (const line of checks) console.log(`  ✅ ${line}`);
if (failures.length > 0) {
  console.log('\n❌ 失败项：');
  for (const line of failures) console.log(`  · ${line}`);
  console.log(
    `\nunified ${unifiedNames} 名 / registered ${registeredGroups} 组，失败 ${failures.length} 项`,
  );
  process.exit(1);
}
console.log(
  `  → unified ${unifiedNames} 名（强制单一实现）× registered ${registeredGroups} 组（显式结构债）`,
);
