#!/usr/bin/env node
/**
 * Lyt.js Bundle Analysis Script
 *
 * 分析每个核心包的 dist 产物大小，输出 Markdown 格式报告。
 * 用法: node scripts/analyze-bundle.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');

// 核心包列表
const CORE_PACKAGES = [
  'reactivity', 'vdom', 'compiler', 'renderer', 'component',
  'core', 'router', 'store',
];

// 子路径入口映射
const SUB_ENTRIES = {
  renderer: ['dom', 'ssr', 'native', 'miniapp', 'vapor'],
  compiler: ['sfc', 'wasm'],
  core: ['plugin', 'error', 'web-component', 'shared'],
  component: ['builtins'],
  reactivity: ['signal'],
};

/**
 * 获取文件大小（字节）
 */
function getFileSize(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.size;
  } catch {
    return null;
  }
}

/**
 * 获取 gzip 大小
 */
function getGzipSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return zlib.gzipSync(content, { level: 9 }).length;
  } catch {
    return null;
  }
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '-';
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(2) + ' KB';
}

/**
 * 分析 ESM/CJS 产物
 */
function analyzeDist(pkg) {
  const distDir = path.join(PACKAGES_DIR, pkg, 'dist');
  const result = {
    pkg,
    esm: { size: null, gzip: null, file: null },
    cjs: { size: null, gzip: null, file: null },
    subs: [],
  };

  // 主入口 ESM
  const esmFile = path.join(distDir, 'index.mjs');
  result.esm.size = getFileSize(esmFile);
  result.esm.gzip = getGzipSize(esmFile);
  result.esm.file = 'index.mjs';

  // 主入口 CJS
  const cjsFile = path.join(distDir, 'index.cjs');
  result.cjs.size = getFileSize(cjsFile);
  result.cjs.gzip = getGzipSize(cjsFile);
  result.cjs.file = 'index.cjs';

  // 子路径入口
  const subs = SUB_ENTRIES[pkg] || [];
  for (const sub of subs) {
    const subEsm = path.join(distDir, `${sub}.mjs`);
    const subCjs = path.join(distDir, `${sub}.cjs`);
    result.subs.push({
      name: sub,
      esm: { size: getFileSize(subEsm), gzip: getGzipSize(subEsm) },
      cjs: { size: getFileSize(subCjs), gzip: getGzipSize(subCjs) },
    });
  }

  return result;
}

/**
 * 分析文件内容，估算主要导出的大小占比
 * 通过简单的字符串匹配来识别导出函数/类
 */
function analyzeExports(pkg) {
  const distDir = path.join(PACKAGES_DIR, pkg, 'dist');
  const esmFile = path.join(distDir, 'index.mjs');

  try {
    const content = fs.readFileSync(esmFile, 'utf-8');
    const exports = [];

    // 匹配导出的函数名和类名
    // 在 minified 代码中，函数通常以 function xxx( 或 const xxx= 或 var xxx= 形式出现
    // 但 minified 后名称会变短，所以我们从源码分析

    const srcFile = path.join(PACKAGES_DIR, pkg, 'src', 'index.ts');
    if (fs.existsSync(srcFile)) {
      const srcContent = fs.readFileSync(srcFile, 'utf-8');
      const exportMatches = srcContent.matchAll(/export\s+(?:function|const|class|let|var)\s+(\w+)/g);
      const reExportMatches = srcContent.matchAll(/export\s*\{([^}]+)\}/g);

      for (const m of exportMatches) {
        exports.push(m[1]);
      }
      for (const m of reExportMatches) {
        const names = m[1].split(',').map(n => n.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean);
        exports.push(...names);
      }
    }

    // 去重
    return [...new Set(exports)].slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * 生成 Markdown 报告
 */
function generateReport(results) {
  const lines = [];
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  lines.push('# Lyt.js Bundle Analysis Report');
  lines.push('');
  lines.push(`> Generated: ${now}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 总览表
  lines.push('## 1. Core Package Size Overview');
  lines.push('');
  lines.push('| Package | ESM (raw) | ESM (gzip) | CJS (raw) | CJS (gzip) |');
  lines.push('|---------|-----------|------------|-----------|------------|');

  let totalEsm = 0, totalGzip = 0, totalCjs = 0, totalCjsGzip = 0;

  for (const r of results) {
    if (r.esm.size !== null) {
      totalEsm += r.esm.size;
      totalGzip += r.esm.gzip;
    }
    if (r.cjs.size !== null) {
      totalCjs += r.cjs.size;
      totalCjsGzip += r.cjs.gzip;
    }
    lines.push(
      `| @lytjs/${r.pkg} | ${formatBytes(r.esm.size)} | ${formatBytes(r.esm.gzip)} | ${formatBytes(r.cjs.size)} | ${formatBytes(r.cjs.gzip)} |`
    );
  }

  lines.push('|---------|-----------|------------|-----------|------------|');
  lines.push(
    `| **TOTAL** | **${formatBytes(totalEsm)}** | **${formatBytes(totalGzip)}** | **${formatBytes(totalCjs)}** | **${formatBytes(totalCjsGzip)}** |`
  );
  lines.push('');

  // Size Limit 对比
  lines.push('## 2. Size Limit Compliance');
  lines.push('');

  try {
    const sizeLimitConfig = JSON.parse(fs.readFileSync(path.join(ROOT, '.size-limit.json'), 'utf-8'));
    lines.push('| Package | Actual (ESM) | Limit | Status |');
    lines.push('|---------|-------------|-------|--------|');

    for (const entry of sizeLimitConfig) {
      // path like "packages/reactivity/dist/index.mjs"
      const pkgName = entry.path.split('/')[1];
      const limitKB = parseFloat(entry.limit);
      const limitBytes = limitKB * 1024;
      const r = results.find(x => x.pkg === pkgName);
      if (r && r.esm.size !== null) {
        const pass = r.esm.size <= limitBytes;
        lines.push(
          `| @lytjs/${pkgName} | ${formatBytes(r.esm.size)} | ${entry.limit} | ${pass ? 'PASS' : 'FAIL'} |`
        );
      }
    }
    lines.push('');
  } catch (e) {
    lines.push('> .size-limit.json not found or invalid');
    lines.push('');
  }

  // 子路径入口分析
  lines.push('## 3. Sub-path Entry Analysis');
  lines.push('');

  for (const r of results) {
    if (r.subs.length === 0) continue;

    lines.push(`### @lytjs/${r.pkg}`);
    lines.push('');
    lines.push('| Sub-path | ESM (raw) | ESM (gzip) | CJS (raw) | CJS (gzip) |');
    lines.push('|----------|-----------|------------|-----------|------------|');

    for (const sub of r.subs) {
      lines.push(
        `| ${r.pkg}/${sub.name} | ${formatBytes(sub.esm.size)} | ${formatBytes(sub.esm.gzip)} | ${formatBytes(sub.cjs.size)} | ${formatBytes(sub.cjs.gzip)} |`
      );
    }
    lines.push('');
  }

  // 导出分析
  lines.push('## 4. Export Analysis');
  lines.push('');
  lines.push('Main exports from each package (from source index.ts):');
  lines.push('');

  for (const r of results) {
    const exports = analyzeExports(r.pkg);
    if (exports.length > 0) {
      lines.push(`### @lytjs/${r.pkg}`);
      lines.push('');
      lines.push(`Exports: \`${exports.slice(0, 8).join('`, `')}\`${exports.length > 8 ? ' ...' : ''}`);
      lines.push('');
    }
  }

  // 优化建议
  lines.push('## 5. Optimization Notes');
  lines.push('');
  lines.push('- Tree-shaking is enabled via esbuild `--tree-shaking=true`');
  lines.push('- All packages use `--external:@lytjs/*` to avoid bundling cross-package dependencies');
  lines.push('- Sub-path entries (e.g., `@lytjs/renderer/dom`) are built separately to enable fine-grained imports');
  lines.push('- `console` and `debugger` statements are dropped in production builds');
  lines.push('');

  return lines.join('\n');
}

// ============================================================
// Main
// ============================================================

console.log('Analyzing bundle sizes...\n');

const results = CORE_PACKAGES.map(pkg => analyzeDist(pkg));

// 输出到控制台
for (const r of results) {
  const esmInfo = r.esm.size !== null
    ? `ESM: ${formatBytes(r.esm.size)} (gzip: ${formatBytes(r.esm.gzip)})`
    : 'ESM: not found';
  const cjsInfo = r.cjs.size !== null
    ? `CJS: ${formatBytes(r.cjs.size)} (gzip: ${formatBytes(r.cjs.gzip)})`
    : 'CJS: not found';
  console.log(`  @lytjs/${r.pkg}: ${esmInfo} | ${cjsInfo}`);
}

// 生成 Markdown 报告
const report = generateReport(results);
const reportPath = path.join(ROOT, 'docs', 'bundle-analysis.md');

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, report, 'utf-8');

console.log(`\nReport saved to: ${reportPath}`);
