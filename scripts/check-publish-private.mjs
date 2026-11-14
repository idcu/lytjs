#!/usr/bin/env node
/**
 * scripts/check-publish-private.mjs
 * 发布集私有一致性：工作区内任何**不在 changesets 发布集**的包必须 `private: true`。
 *
 * 背景：`changeset version` 会给依赖了升版包的工作区包补丁升版（即使它自己没有 changeset），
 * `changeset publish` 随后会发布所有非 private 包 —— benchmark fixture `lytjs-npm`
 * 就是这样进入发布队列的（2026-11-14 干跑实证）。
 *
 * 发布集派生见 scripts/release-set.mjs（不写死任何包名）。
 * 负控：去掉任意非发布包的 private ⇒ 本门禁必须 exit 1。
 */
import {
  getReleasePackages,
  loadWorkspacePackages,
  readChangesetIgnore,
  ROOT,
} from './release-set.mjs';

const all = loadWorkspacePackages();
const ignore = new Set(readChangesetIgnore());
const release = new Set(getReleasePackages().map((p) => p.name));

const violations = [];
for (const p of all) {
  if (p.private || release.has(p.name)) continue;
  const reason = !p.rel.startsWith('packages/')
    ? `位于 ${p.rel.split('/')[0]}/（非发布根 packages/）`
    : ignore.has(p.name)
      ? '在 .changeset/config.json 的 ignore 中'
      : '不在 changesets 发布集';
  violations.push({ ...p, reason });
}

const outside = all.filter((p) => !p.rel.startsWith('packages/'));
console.log(
  `工作区 ${all.length} 包；发布集 ${release.size}；配套工程 ${outside.length}（其中 private ${outside.filter((p) => p.private).length}）`,
);
for (const p of all) {
  if (p.private && !p.rel.startsWith('packages/')) {
    console.log(`  [ok] ${p.name} (${p.rel}) private`);
  }
}

if (violations.length > 0) {
  console.error(`\n❌ 发布阻断：${violations.length} 个非发布包缺少 private: true`);
  for (const v of violations) {
    console.error(`  - ${v.name}@${v.version} (${v.rel})：${v.reason}`);
  }
  console.error('\n修法：在这些包的 package.json 增加 "private": true（发布集不要加）。');
  process.exit(1);
}

console.log(`✅ 发布集 ${release.size} 包非 private；其余工作区包均已 private（根 ${ROOT}）`);
