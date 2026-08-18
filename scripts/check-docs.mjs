#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */

import { existsSync } from 'fs';
import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, relative, dirname } from 'path';

const ROOT = process.cwd();
const VERSION = '6.9.6';

/**
 * 动态扫描 packages/ 下所有含 package.json 的包目录（相对 ROOT 的相对路径）。
 * 自动排除容器目录、node_modules、dist 与隐藏目录，天然覆盖全部 86 个包及未来新增包。
 */
async function findPackageDirs(relDir) {
  const abs = join(ROOT, relDir);
  const found = [];

  // 判断当前目录自身是否为包
  let isPkg = false;
  try {
    await stat(join(abs, 'package.json'));
    isPkg = true;
  } catch {
    // 容器目录（无 package.json）
  }

  // 收集子目录
  let childDirs = [];
  try {
    const entries = await readdir(abs, { withFileTypes: true });
    childDirs = entries
      .filter(
        (entry) =>
          entry.isDirectory() &&
          entry.name !== 'node_modules' &&
          entry.name !== 'dist' &&
          !entry.name.startsWith('.'),
      )
      .map((entry) => entry.name);
  } catch {
    // 目录不存在则返回
  }

  for (const name of childDirs) {
    found.push(...(await findPackageDirs(join(relDir, name))));
  }

  // 包的路径放在同层子包之前，便于阅读
  if (isPkg) found.unshift(relative(ROOT, relDir));

  return found;
}

/**
 * 解析 README 中的相对链接并检测断链（相对原理图"/"，依 pkgDir 解析）。
 * 跳过外部 URL、锚点、mailto/tel、图片本地路径与本地可选工具链 .trae。
 */
async function findBrokenLinks(content, pkgDir) {
  const broken = [];
  const linkRe = /!?\[[^\]]*\]\(([^)]+)\)/g;
  let m;
  while ((m = linkRe.exec(content)) !== null) {
    const href = m[1].trim();
    // 跳过外部/锚点/协议链接
    if (
      !href ||
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.includes('://') ||
      href.startsWith('data:')
    ) {
      continue;
    }
    // 跳过本地可选工具链引用（同 AGENTS.md 约定）
    if (href.includes('.trae/') || href.includes('/.trae')) continue;
    // 去掉 anchor 片段
    const clean = href.split('#')[0];
    if (!clean) continue;

    // 以 pkgDir 为基准手动规范化解算相对路径（pkgDir 即文件所在目录的完整相对路径）
    const parts = decodeURIComponent(clean).replace(/\\/g, '/').split('/');
    const stack = pkgDir.replace(/\\/g, '/').split('/');
    for (const p of parts) {
      if (p === '.' || p === '') continue;
      if (p === '..') stack.pop();
      else stack.push(p);
    }
    const resolved = stack.join('/');
    try {
      await stat(join(ROOT, resolved));
    } catch {
      broken.push({ href, resolved });
    }
  }
  return broken;
}

async function checkPackage(pkgDir) {
  const results = {
    name: '',
    path: pkgDir,
    hasReadme: false,
    hasChangelog: false,
    readmeChinese: false,
    changelogChinese: false,
    versionInReadme: null,
    versionInChangelog: null,
    brokenLinks: [],
    needsUpdate: [],
  };

  // 读取 package.json
  try {
    const pkgPath = join(ROOT, pkgDir, 'package.json');
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    results.name = pkg.name || 'unknown';
  } catch (e) {
    results.name = 'N/A';
  }

  // 检查 README.md
  const readmePath = join(ROOT, pkgDir, 'README.md');
  try {
    await stat(readmePath);
    results.hasReadme = true;
    const content = await readFile(readmePath, 'utf-8');

    // 检查是否中文（按剔除代码块后的正文占比，避免代码/表格英文词导致的误判）
    results.readmeChinese = proseRatio(content) > 0.08;

    if (!results.readmeChinese) {
      results.needsUpdate.push('README.md 需要翻译成中文');
    }

    // 检测 README 内部断链
    results.brokenLinks = await findBrokenLinks(content, pkgDir);
    if (results.brokenLinks.length > 0) {
      results.needsUpdate.push('README.md 内部断链');
    }
  } catch (e) {
    // README 不存在
  }

  // 检查 CHANGELOG.md
  const changelogPath = join(ROOT, pkgDir, 'CHANGELOG.md');
  try {
    await stat(changelogPath);
    results.hasChangelog = true;
    const content = await readFile(changelogPath, 'utf-8');

    // 检查是否中文（同上，按正文占比）
    results.changelogChinese = proseRatio(content) > 0.08;

    // 检查版本号
    const versionMatch = content.match(/#{1,3}\s*\[?(\d+\.\d+\.\d+)\]?/);
    if (versionMatch) {
      results.versionInChangelog = versionMatch[1];
      if (versionMatch[1] !== VERSION) {
        results.needsUpdate.push('CHANGELOG.md 版本号');
      }
    }

    if (!results.changelogChinese) {
      results.needsUpdate.push('CHANGELOG.md 需要翻译成中文');
    }
  } catch (e) {
    // CHANGELOG 不存在
  }

  return results;
}

/**
 * 判断 docs 站点内链接目标是否存在（兼容 VitePress 省略 .md / 目录 index.md / 尾斜杠 惯例）。
 * 返回 { exists, joined }：exists 表示目标是否命中任一候选路径，joined 为规范化目标路径。
 */
function resolveTarget(base, clean) {
  const candidates = [];
  const joined = clean.startsWith('/')
    ? join(ROOT, clean.slice(1))
    : join(base, clean.replace(/\\/g, '/'));
  candidates.push(joined);
  if (!joined.endsWith('.md')) candidates.push(joined + '.md');
  if (!joined.endsWith('/')) candidates.push(joined + '/index.md');
  candidates.push(join(joined, 'index.md'));
  return { exists: candidates.some((c) => existsSync(c)), joined };
}

/**
 * 扫描 docs/ 站点下所有 .md 的内部相对链接并检测断链。
 * 兼容 VitePress 链接惯例（省略 .md / 目录 index.md / 尾斜杠），
 * 并剔除围栏代码块与行内代码，避免把代码示例误判为链接。
 */
async function checkDocsSite() {
  const DOCS = join(ROOT, 'docs');
  const allMd = [];

  async function collect(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      if (entry.name === 'legacy-archive' || entry.name === '.vitepress' || entry.name === 'public')
        continue;
      const p = join(dir, entry.name);
      if (entry.isDirectory()) await collect(p);
      else if (entry.name.endsWith('.md')) allMd.push(p);
    }
  }
  await collect(DOCS);

  const broken = [];
  const linkRe = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const file of allMd) {
    const raw = await readFile(file, 'utf-8');
    // 剔除代码块与行内代码，避免代码示例被当作链接误报
    const content = raw.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ');
    const rel = file.slice(DOCS.length + 1).replace(/\\/g, '/');
    const base = dirname(file);
    let m;
    while ((m = linkRe.exec(content)) !== null) {
      const href = m[1].trim();
      if (
        !href ||
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.includes('://') ||
        href.startsWith('data:') ||
        href.includes('.trae/')
      ) {
        continue;
      }
      const clean = decodeURIComponent(href.split('#')[0]).replace(/[\\/]$/, '');
      if (!clean) continue;
      const { exists, joined } = resolveTarget(base, clean);
      if (!exists) {
        broken.push({ file: rel, href, target: joined.slice(ROOT.length + 1).replace(/\\/g, '/') });
      }
    }
  }
  return { fileCount: allMd.length, broken };
}

/**
 * 扫描 docs/ 下所有 .md 文件，识别「孤立文档」：未被任何其他文档（含 SUMMARY.md）链接引用的文件。
 * 排除 docs 根 index.md（站点首页通常无入链）。
 */
async function checkOrphans() {
  const DOCS = join(ROOT, 'docs');
  const allMd = [];

  async function collect(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      if (entry.name === 'legacy-archive' || entry.name === '.vitepress' || entry.name === 'public')
        continue;
      const p = join(dir, entry.name);
      if (entry.isDirectory()) await collect(p);
      else if (entry.name.endsWith('.md')) allMd.push(p);
    }
  }
  await collect(DOCS);

  const byAbs = new Map(allMd.map((p) => [p, p]));
  const inbound = new Map(allMd.map((p) => [p, 0]));
  const linkRe = /!?\[[^\]]*\]\(([^)]+)\)/g;

  for (const file of allMd) {
    const raw = await readFile(file, 'utf-8');
    const content = raw.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ');
    const base = dirname(file);
    let m;
    while ((m = linkRe.exec(content)) !== null) {
      const href = m[1].trim();
      if (
        !href ||
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.includes('://') ||
        href.startsWith('data:') ||
        href.includes('.trae/')
      ) {
        continue;
      }
      const clean = decodeURIComponent(href.split('#')[0]).replace(/[\\/]$/, '');
      if (!clean) continue;
      const { exists, joined } = resolveTarget(base, clean);
      if (exists && byAbs.has(joined)) inbound.set(joined, (inbound.get(joined) || 0) + 1);
    }
  }

  const orphans = [];
  for (const p of allMd) {
    const rel = p.slice(DOCS.length + 1).replace(/\\/g, '/');
    if (rel === 'index.md') continue;
    if ((inbound.get(p) || 0) === 0) orphans.push(rel);
  }
  return { fileCount: allMd.length, orphans };
}

/**
 * 检测 VitePress .vitepress/config.ts 中 nav/sidebar 的 link 是否指向不存在的文档。
 * link 以 / 开头，按 docs 根解析；兼容 VitePress 省略 .md / 目录 index.md 惯例。
 */
async function checkNavLinks() {
  const configPath = join(ROOT, 'docs', '.vitepress', 'config.ts');
  const navBroken = [];
  try {
    const src = await readFile(configPath, 'utf-8');
    // 提取所有 link: '/xxx/yyy' 形式的导航链接
    const linkRe = /link:\s*['"](\/[^'"]+)['"]/g;
    let m;
    const seen = new Set();
    while ((m = linkRe.exec(src)) !== null) {
      const href = m[1];
      if (!href || href === '/') continue;
      const clean = href.replace(/[\\/]$/, '');
      if (!clean || seen.has(clean)) continue;
      seen.add(clean);
      const joined = join(ROOT, 'docs', clean.slice(1));
      // VitePress 语义：link 指向 .md 文件，或含 index.md/README.md 的目录；仅目录存在而无 index 视为死链
      const ok =
        existsSync(joined + '.md') ||
        (existsSync(joined) &&
          (existsSync(join(joined, 'index.md')) || existsSync(join(joined, 'README.md'))));
      if (!ok) navBroken.push(href);
    }
  } catch {
    // config.ts 不存在则跳过
  }
  return navBroken;
}

/**
 * legacy-archive 隔离与内部快照校验：
 * 1. 隔离性：活跃文档（非 archive）不允许链接指向 archive 内文件；
 * 2. 内部快照：archive 内部相对链接必须能解析到存在的文件（保证归档自成一体）。
 * archive 目录本身在 docs 站点/孤立检测中已被豁免，不影响站点指标。
 */
async function checkLegacyArchive() {
  const DOCS = join(ROOT, 'docs');
  const ARCHIVE = join(DOCS, 'legacy-archive');

  // 收集 archive 下全部 .md
  const archiveMd = [];
  async function collectArchive(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const p = join(dir, entry.name);
      if (entry.isDirectory()) await collectArchive(p);
      else if (entry.name.endsWith('.md')) archiveMd.push(p);
    }
  }
  await collectArchive(ARCHIVE);

  const linkRe = /!?\[[^\]]*\]\(([^)]+)\)/g;

  // 内部断链（archive 内部相对链接须能解析）
  const broken = [];
  for (const file of archiveMd) {
    const raw = await readFile(file, 'utf-8');
    const content = raw.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ');
    const rel = file.slice(DOCS.length + 1).replace(/\\/g, '/');
    const base = dirname(file);
    let m;
    while ((m = linkRe.exec(content)) !== null) {
      const href = m[1].trim();
      if (
        !href ||
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.includes('://') ||
        href.startsWith('data:') ||
        href.includes('.trae/')
      ) {
        continue;
      }
      const clean = decodeURIComponent(href.split('#')[0]).replace(/[\\/]$/, '');
      if (!clean) continue;
      const { exists, joined } = resolveTarget(base, clean);
      if (!exists) {
        broken.push({ file: rel, href, target: joined.slice(DOCS.length + 1).replace(/\\/g, '/') });
      }
    }
  }

  // 隔离性：活跃文档链接指向 archive
  const leaked = [];
  const leakedRe = /!?\[[^\]]*\]\(([^)]+)\)/g;
  async function checkLeaks(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      if (entry.name === 'legacy-archive' || entry.name === '.vitepress' || entry.name === 'public')
        continue;
      const p = join(dir, entry.name);
      if (entry.isDirectory()) await checkLeaks(p);
      else if (entry.name.endsWith('.md')) {
        const raw = await readFile(p, 'utf-8');
        const content = raw.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ');
        const rel = p.slice(DOCS.length + 1).replace(/\\/g, '/');
        const base = dirname(p);
        let m;
        while ((m = leakedRe.exec(content)) !== null) {
          const href = m[1].trim();
          if (
            !href ||
            href.startsWith('http://') ||
            href.startsWith('https://') ||
            href.startsWith('#') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            href.includes('://') ||
            href.startsWith('data:') ||
            href.includes('.trae/')
          ) {
            continue;
          }
          const clean = decodeURIComponent(href.split('#')[0]).replace(/[\\/]$/, '');
          if (!clean) continue;
          const { joined } = resolveTarget(base, clean);
          if (joined.includes(`\\legacy-archive\\`) || joined.includes('/legacy-archive/')) {
            leaked.push({
              file: rel,
              href,
              target: joined.slice(DOCS.length + 1).replace(/\\/g, '/'),
            });
          }
        }
      }
    }
  }
  await checkLeaks(DOCS);

  return { fileCount: archiveMd.length, broken, leaked };
}

async function main() {
  console.log('📋 LytJS 文档检查报告\n');
  console.log('='.repeat(80));

  // 动态发现全部包（覆盖全部 86 个包）
  const PACKAGE_DIRS = await findPackageDirs('packages');
  const allResults = [];

  // docs 站点内部断链检测
  const docsSite = await checkDocsSite();
  // 孤立文档检测
  const orphans = await checkOrphans();
  // VitePress 导航死链检测
  const navBroken = await checkNavLinks();
  // legacy-archive 隔离与内部快照校验
  const archive = await checkLegacyArchive();

  for (const pkgDir of PACKAGE_DIRS) {
    const result = await checkPackage(pkgDir);
    allResults.push(result);
  }

  // 输出检查结果
  let needsUpdate = 0;

  for (const r of allResults) {
    const status = r.needsUpdate.length > 0 ? '⚠️' : '✅';
    console.log(`\n${status} ${r.name}`);
    console.log(`   路径: ${r.path}`);

    if (r.hasReadme) {
      console.log(
        `   README: ${r.readmeChinese ? '中文' : '英文'} ${r.versionInReadme ? `(v${r.versionInReadme})` : ''}`,
      );
    } else {
      console.log(`   README: ❌ 不存在`);
      r.needsUpdate.push('缺少 README.md');
    }

    if (r.hasChangelog) {
      console.log(
        `   CHANGELOG: ${r.changelogChinese ? '中文' : '英文'} ${r.versionInChangelog ? `(v${r.versionInChangelog})` : ''}`,
      );
    } else {
      console.log(`   CHANGELOG: ❌ 不存在`);
      r.needsUpdate.push('缺少 CHANGELOG.md');
    }

    if (r.needsUpdate.length > 0) {
      needsUpdate++;
      console.log(`   需要更新:`);
      r.needsUpdate.forEach((u) => console.log(`      - ${u}`));
    }
    if (r.brokenLinks.length > 0) {
      console.log(`   断链:`);
      r.brokenLinks.forEach((b) => console.log(`      - ${b.href} → ${b.resolved}`));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 统计:`);
  console.log(`   总包数: ${allResults.length}`);
  console.log(`   需要更新: ${needsUpdate}`);
  console.log(`   无需更新: ${allResults.length - needsUpdate}`);

  // 统计缺少文档的包
  const noReadme = allResults.filter((r) => !r.hasReadme).map((r) => r.name);
  const noChangelog = allResults.filter((r) => !r.hasChangelog).map((r) => r.name);

  if (noReadme.length > 0) {
    console.log(`\n⚠️ 缺少 README.md 的包 (${noReadme.length}):`);
    noReadme.forEach((n) => console.log(`   - ${n}`));
  }

  if (noChangelog.length > 0) {
    console.log(`\n⚠️ 缺少 CHANGELOG.md 的包 (${noChangelog.length}):`);
    noChangelog.forEach((n) => console.log(`   - ${n}`));
  }

  // 冗余文档检测：内容逐字节一致的 README/CHANGELOG
  const brokenForReport = allResults.filter((r) => r.brokenLinks.length > 0);
  console.log(`\n🔗 存在内部断链的包: ${brokenForReport.length} 个`);
  brokenForReport.forEach((r) => {
    console.log(`   - ${r.name} (${r.brokenLinks.length} 条)`);
  });

  const dupGroups = [];
  const contentByHash = new Map();
  for (const r of allResults) {
    for (const kind of ['README.md', 'CHANGELOG.md']) {
      try {
        const p = join(ROOT, r.path, kind);
        const content = await readFile(p, 'utf-8');
        const hash = hashStr(content);
        if (!contentByHash.has(hash)) contentByHash.set(hash, []);
        contentByHash.get(hash).push(`${r.name}/${kind}`);
      } catch {
        // 缺失该文件则跳过
      }
    }
  }
  for (const group of contentByHash.values()) {
    if (group.length > 1) dupGroups.push(group);
  }
  console.log(`\n🗂  逐字节完全一致的文档组: ${dupGroups.length} 组`);
  dupGroups.forEach((g) => console.log(`   - ${g.join(' | ')}`));

  // docs 站点内部断链统计
  console.log(`\n📄 docs 站点 .md 文件数: ${docsSite.fileCount}`);
  console.log(`🔗 docs 站点内部断链: ${docsSite.broken.length} 条`);
  const brokenByFile = new Map();
  for (const b of docsSite.broken) {
    if (!brokenByFile.has(b.file)) brokenByFile.set(b.file, []);
    brokenByFile.get(b.file).push(b);
  }
  for (const [file, list] of brokenByFile) {
    console.log(`   - ${file}`);
    list.forEach((b) => console.log(`     ${b.href} → ${b.target}`));
  }

  // 孤立文档统计
  console.log(`\n🕸️  孤立文档: ${orphans.orphans.length} 个`);
  orphans.orphans.sort().forEach((o) => console.log(`   - ${o}`));

  // VitePress 导航死链统计
  console.log(`\n🧭 VitePress 导航死链: ${navBroken.length} 条`);
  navBroken.forEach((n) => console.log(`   - ${n}`));

  // legacy-archive 隔离与内部快照统计
  // 归档为冻结快照：其相对链接在归档时对"当时"的活跃树有效，后因推荐位/文档重组而指向已迁移文件属预期状态，
  // 故仅输出计数+说明，不作为缺陷门禁；真正需守卫的是"活跃文档不得链入归档"（隔离违规）。
  console.log(`\n🗄️  legacy-archive 归档文件: ${archive.fileCount} 个`);
  console.log(`🔒 冻结快照内部悬空引用(预期状态): ${archive.broken.length} 条`);
  archive.broken.slice(0, 10).forEach((b) => console.log(`   - ${b.file} | ${b.href}`));
  if (archive.broken.length > 10)
    console.log(`   ... 及其他 ${archive.broken.length - 10} 条（冻结快照正常现象）`);
  console.log(`🚪 活跃文档链入归档(隔离违规): ${archive.leaked.length} 条`);
  archive.leaked.forEach((b) => console.log(`   - ${b.file} | ${b.href} → ${b.target}`));

  console.log('\n✅ 检查完成！\n');

  // 支持 --report=<path> 生成 Markdown 汇总报告
  const reportArg = process.argv.find((a) => a.startsWith('--report='));
  if (reportArg) {
    const reportPath = reportArg.slice('--report='.length);
    const lines = [];
    lines.push('# LytJS 文档健康检查报告');
    lines.push('');
    lines.push(`> 生成时间：${new Date().toISOString()}`);
    lines.push('');
    lines.push(`- 总包数：${allResults.length}`);
    lines.push(`- 需更新：${needsUpdate}`);
    lines.push(`- 缺 README：${noReadme.length}`);
    lines.push(`- 缺 CHANGELOG：${noChangelog.length}`);
    lines.push(`- 含内部断链：${brokenForReport.length}`);
    lines.push(`- 完全一致文档组：${dupGroups.length}`);
    lines.push(`- docs 站点断链：${docsSite.broken.length}`);
    lines.push(`- 孤立文档：${orphans.orphans.length}`);
    lines.push(`- VitePress 导航死链：${navBroken.length}`);
    lines.push(`- legacy-archive 归档文件：${archive.fileCount}`);
    lines.push(`- 归档内部断链：${archive.broken.length}`);
    lines.push(`- 活跃文档链入归档(隔离违规)：${archive.leaked.length}`);
    lines.push('');
    if (noReadme.length) {
      lines.push('## 缺失 README.md');
      lines.push('');
      noReadme.forEach((n) => lines.push(`- ${n}`));
      lines.push('');
    }
    if (noChangelog.length) {
      lines.push('## 缺失 CHANGELOG.md');
      lines.push('');
      noChangelog.forEach((n) => lines.push(`- ${n}`));
      lines.push('');
    }
    if (brokenForReport.length) {
      lines.push('## 内部断链');
      lines.push('');
      for (const r of brokenForReport) {
        lines.push(`### ${r.name}`);
        lines.push('');
        r.brokenLinks.forEach((b) => lines.push(`- \`${b.href}\` → 期望路径 \`${b.resolved}\``));
        lines.push('');
      }
    }
    if (dupGroups.length) {
      lines.push('## 完全一致（冗余）文档');
      lines.push('');
      dupGroups.forEach((g) => lines.push(`- ${g.join(' | ')}`));
      lines.push('');
    }
    if (docsSite.broken.length) {
      lines.push('## docs 站点内部断链');
      lines.push('');
      for (const b of docsSite.broken) {
        lines.push(`- \`${b.file}\` → \`${b.href}\`（期望 \`${b.target}\`）`);
      }
      lines.push('');
    }
    if (orphans.orphans.length) {
      lines.push('## 孤立文档（无任何入链）');
      lines.push('');
      orphans.orphans.sort().forEach((o) => lines.push(`- ${o}`));
      lines.push('');
    }
    if (navBroken.length) {
      lines.push('## VitePress 导航死链');
      lines.push('');
      navBroken.forEach((n) => lines.push(`- \`${n}\``));
      lines.push('');
    }
    await writeFile(reportPath, lines.join('\n'), 'utf-8');
    console.log(`📄 报告已写入: ${reportPath}`);
  }
}

/**
 * 计算文档「正文」的中文字符占比：剔除围栏代码块与行内代码后再统计。
 * 用于区分中文文档与仅含大量英文技术词/表格的中文文档，避免代码稀释导致的英文误判。
 */
function proseRatio(content) {
  const prose = content.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ');
  const cjk = (prose.match(/[\u4e00-\u9fa5]/g) || []).length;
  return cjk / (prose.length || 1);
}

/** 简单字符串哈希（FNV-1a），用于逐字节一致检测 */
function hashStr(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `h${h.toString(16)}${str.length}`;
}

main().catch(console.error);
