/**
 * scripts/release-set.mjs
 * 发布集派生（唯一来源：pnpm-workspace.yaml + .changeset/config.json + package.json.private）
 *
 * 为什么需要它：`changesets publish` 会发布工作区内**所有非 private 的包**。
 * 2026-11-14 干跑发现 benchmark fixture `lytjs-npm`（未标 private、且有 workspace 依赖）
 * 会被 `changeset version` 补丁升版并进入发布队列 —— 这类包必须靠 private 挡住，
 * 不能靠人记得标。
 *
 * 口径：
 *   - 发布根 = 工作区 globs 展开后位于 `packages/` 下的包（docs/examples/benchmarks/e2e/playground
 *     是配套工程，不是 npm 发布物）；
 *   - 发布集 = 发布根内 `private !== true` 且不在 changesets `config.ignore` 的包；
 *   - 其余工作区包一律必须 `private: true`。
 *
 * 本文件不做判据，只做派生；判据见 scripts/check-publish-private.mjs。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readWorkspacePatterns(root) {
  const yaml = fs.readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8');
  const patterns = [];
  let inPackages = false;
  for (const raw of yaml.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (!raw.startsWith(' ') && !raw.startsWith('\t')) {
      inPackages = line === 'packages:';
      continue;
    }
    if (!inPackages) continue;
    const m = line.match(/^-\s*['"]?([^'"]+)['"]?$/);
    if (m) patterns.push(m[1]);
  }
  return patterns;
}

/** 展开工作区 globs。现有 globs 都只有末尾一个 `*`，无需引入 glob 依赖。 */
function expandPattern(root, pattern) {
  if (!pattern.includes('*')) {
    return fs.existsSync(path.join(root, pattern, 'package.json')) ? [pattern] : [];
  }
  const star = pattern.indexOf('*');
  const head = pattern.slice(0, star).replace(/\/$/, '');
  const tail = pattern.slice(star + 1).replace(/^\//, '');
  if (tail) return [];
  const base = path.join(root, head);
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => (head ? `${head}/${e.name}` : e.name));
}

export function readChangesetIgnore(root = ROOT) {
  const file = path.join(root, '.changeset', 'config.json');
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(config.ignore) ? config.ignore : [];
}

export function loadWorkspacePackages(root = ROOT) {
  const globs = readWorkspacePatterns(root);
  const dirs = new Set();
  for (const g of globs) {
    for (const d of expandPattern(root, g)) dirs.add(d);
  }
  const seen = new Set();
  const packages = [];
  for (const rel of [...dirs].sort()) {
    const file = path.join(root, rel, 'package.json');
    if (!fs.existsSync(file)) continue;
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!pkg.name || seen.has(pkg.name)) continue;
    seen.add(pkg.name);
    packages.push({
      name: pkg.name,
      version: pkg.version,
      dir: path.join(root, rel),
      rel,
      private: pkg.private === true,
    });
  }
  return packages;
}

/** 发布集：位于 packages/ 下、非 private、且不在 changesets ignore 的包。 */
export function getReleasePackages(root = ROOT) {
  const ignore = new Set(readChangesetIgnore(root));
  return loadWorkspacePackages(root).filter(
    (p) => p.rel.startsWith('packages/') && !p.private && !ignore.has(p.name),
  );
}
