#!/usr/bin/env node
/**
 * 防止「配置存在 ⇒ 以为有 CI 发布」。
 *
 * 规则：
 * - 没有 `.github/workflows/release.yml` ⇒ 通过（不适用）。
 * - origin 指向 github.com ⇒ 通过（workflow 有对应平台）。
 * - origin 指向其他平台（当前为 gitee.com）⇒ 文件头必须带 `[no-ci-release]` 标记，
 *   否则失败；带标记则打印一行提示，说明发布走本地 scripts/release.mjs。
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const FILE = '.github/workflows/release.yml';
const MARKER = '[no-ci-release]';

// `--remote <url>`：负控用 —— 覆盖 origin 探测，使判据在任何远端下都可被注入验证。
const remoteFlag = process.argv.indexOf('--remote');
const remoteOverride = remoteFlag >= 0 ? (process.argv[remoteFlag + 1] ?? '') : null;

if (!existsSync(FILE)) {
  console.log('ℹ️  未配置 release workflow，跳过。');
  process.exit(0);
}

const remote =
  remoteOverride === null
    ? spawnSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf-8' })
    : { stdout: remoteOverride };
const url = (remote.stdout || '').trim();

if (url.includes('github.com')) {
  console.log(`✅ release.yml 有对应平台：${url}`);
  process.exit(0);
}

const src = readFileSync(FILE, 'utf-8');
if (!src.includes(MARKER)) {
  console.error(
    `❌ ${FILE} 存在，但 origin 不是 GitHub（${url || '未配置 origin'}），` +
      `且文件头缺少 ${MARKER} 标记。\n` +
      '   这会让读者误以为发布有 CI 自动化。请在文件头注明：当前远端不触发，' +
      '发布走 scripts/release.mjs。',
  );
  process.exit(1);
}

console.log(
  `ℹ️  release.yml 存在但 origin 为 ${url || '非 GitHub'}，workflow 不会触发；` +
    '发布走 `node scripts/release.mjs`（默认 --dry-run）。',
);
