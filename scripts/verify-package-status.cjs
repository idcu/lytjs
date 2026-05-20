const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const publishOrder = [
  // L0: 基础工具层
  'packages/shared-types',
  'packages/common/packages/constants',
  'packages/common/packages/is',
  'packages/common/packages/object',
  'packages/common/packages/string',
  'packages/common/packages/path',
  'packages/common/packages/error',
  'packages/common/packages/warn',
  'packages/common/packages/events',
  'packages/common/packages/cache',
  'packages/common/packages/timing',
  'packages/common/packages/scheduler',
  'packages/common/packages/algorithm',
  'packages/common/packages/vnode',
  'packages/common/packages/env',
  'packages/common/packages/dom',
  'packages/common/packages/dom-helpers',
  'packages/common/packages/query',
  'packages/common/packages/raf',
  'packages/common/packages/security',
  'packages/common/packages/storage',
  'packages/common/packages/validate',
  'packages/common/packages/http',
  'packages/common/packages/keyboard',
  'packages/common/packages/a11y',
  'packages/common/packages/performance',
  'packages/common/packages/assertions',
  'packages/common/packages/async-scheduler',
  'packages/common/packages/event-normalizer',
  'packages/common/packages/node-cache',
  'packages/common/packages/render-queue',
  'packages/common/packages/transition-engine',
  'packages/common/packages/memory',
  'packages/common/packages/common',
  'packages/host-contract',

  // L1: 核心原语层
  'packages/reactivity',
  'packages/vdom',
  'packages/dom-runtime',
  'packages/compiler',

  // L2: 渲染引擎层
  'packages/component',
  'packages/renderer',
  'packages/adapter-web',
  'packages/dom',
  'packages/web',

  // L3: 核心框架层
  'packages/core',
  'packages/core-signal',
  'packages/core-vnode',

  // L4: 生态系统
  'packages/ecosystem/packages/router',
  'packages/ecosystem/packages/router-fs',
  'packages/ecosystem/packages/api',
  'packages/ecosystem/packages/store',
  'packages/ecosystem/packages/ssr',
  'packages/ecosystem/packages/compat',
  'packages/ecosystem/packages/devtools',
  'packages/ecosystem/packages/platform-adapter',
  'packages/ecosystem/packages/bundler',
  'packages/ecosystem/packages/hmr',
  'packages/ecosystem/packages/runtime-edge',

  // L5: UI 组件
  'packages/ecosystem/packages/ui',

  // L6: 插件系统
  'packages/plugins/packages/plugin-vite',
  'packages/plugins/packages/plugin-theme',
  'packages/plugins/packages/plugin-logger',
  'packages/plugins/packages/plugin-auth',
  'packages/plugins/packages/plugin-storage',
  'packages/plugins/packages/plugin-i18n',
  'packages/plugins/packages/plugin-form',
  'packages/plugins/packages/plugin-validation',
  'packages/plugins/packages/plugin-data',
  'packages/plugins/packages/plugin-data-fetch',
  'packages/plugins/packages/plugin-chart',
  'packages/plugins/packages/plugin-animation',
  'packages/plugins/packages/plugin-testing',

  // L7: 工具包
  'packages/tools/packages/cli',
  'packages/tools/packages/devtools',
  'packages/tools/packages/test-utils',
];

const rootDir = process.cwd();
const packagesInfo = [];

console.log('🚀 开始核实所有包...\n');

let index = 1;
for (const pkgPath of publishOrder) {
  const fullPath = path.join(rootDir, pkgPath);
  const pkgJsonPath = path.join(fullPath, 'package.json');

  if (!fs.existsSync(pkgJsonPath)) {
    console.log(`[${index}/${publishOrder.length}] ❌ 包不存在: ${pkgPath}`);
    packagesInfo.push({ path: pkgPath, status: 'missing' });
    index++;
    continue;
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));

  let npmVersion = null;
  try {
    // 使用 --no-color 并抑制 npm 警告
    const result = execSync(
      `npm view ${pkgJson.name} version --registry=https://registry.npmjs.org/ --no-color 2>&1 || echo "not_found"`,
      { encoding: 'utf8', shell: true, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const lines = result.trim().split('\n');
    // 找到不包含警告的最后一行
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line && !line.includes('warn') && !line.includes('npm notice') && line !== 'not_found') {
        npmVersion = line;
        break;
      }
    }
  } catch (error) {
    npmVersion = null;
  }

  const isPublished = npmVersion === pkgJson.version;
  const status = isPublished ? '✅' : npmVersion ? '⚠️' : '❌';

  console.log(
    `[${index}/${publishOrder.length}] ${status} ${pkgJson.name} - ` +
      `本地: ${pkgJson.version}` +
      (npmVersion ? `, npm: ${npmVersion}` : ', npm: 未发布'),
  );

  packagesInfo.push({
    path: pkgPath,
    name: pkgJson.name,
    localVersion: pkgJson.version,
    npmVersion: npmVersion,
    status: isPublished ? 'published' : npmVersion ? 'mismatch' : 'not_published',
    description: pkgJson.description || '',
    keywords: pkgJson.keywords || [],
    dependencies: Object.keys(pkgJson.dependencies || {}),
    devDependencies: Object.keys(pkgJson.devDependencies || {}),
  });

  index++;
}

// 生成 Markdown 文档
console.log('\n📝 正在生成完整文档...');

let markdown = `# LytJS v6.5.0 完整包清单

> 生成时间: ${new Date().toLocaleString()}

## 目录

- [📊 发布统计](#发布统计)
- [📦 完整包列表](#完整包列表)
  - [L0: 基础工具层](#l0-基础工具层)
  - [L1: 核心原语层](#l1-核心原语层)
  - [L2: 渲染引擎层](#l2-渲染引擎层)
  - [L3: 核心框架层](#l3-核心框架层)
  - [L4: 生态系统](#l4-生态系统)
  - [L5: UI 组件](#l5-ui-组件)
  - [L6: 插件系统](#l6-插件系统)
  - [L7: 工具包](#l7-工具包)

---

## 发布统计

| 统计项 | 数量 |
|-------|------|
| 总包数 | ${packagesInfo.length} |
| ✅ 已发布 | ${packagesInfo.filter((p) => p.status === 'published').length} |
| ⚠️ 版本不匹配 | ${packagesInfo.filter((p) => p.status === 'mismatch').length} |
| ❌ 未发布 | ${packagesInfo.filter((p) => p.status === 'not_published' || p.status === 'missing').length} |

---

## 完整包列表

`;

// 按层分组
const layers = {
  'L0: 基础工具层': publishOrder.slice(0, 33),
  'L1: 核心原语层': publishOrder.slice(33, 37),
  'L2: 渲染引擎层': publishOrder.slice(37, 42),
  'L3: 核心框架层': publishOrder.slice(42, 45),
  'L4: 生态系统': publishOrder.slice(45, 56),
  'L5: UI 组件': publishOrder.slice(56, 57),
  'L6: 插件系统': publishOrder.slice(57, 71),
  'L7: 工具包': publishOrder.slice(71, 74),
};

for (const [layerName, layerPaths] of Object.entries(layers)) {
  markdown += `### ${layerName}\n\n`;

  for (const pkgPath of layerPaths) {
    const pkg = packagesInfo.find((p) => p.path === pkgPath);
    if (!pkg) continue;

    const statusIcon = pkg.status === 'published' ? '✅' : pkg.status === 'mismatch' ? '⚠️' : '❌';
    const statusText =
      pkg.status === 'published' ? '已发布' : pkg.status === 'mismatch' ? '版本不匹配' : '未发布';

    markdown += `#### ${statusIcon} ${pkg.name}\n\n`;
    markdown += `- **状态**: ${statusText}\n`;
    markdown += `- **本地版本**: ${pkg.localVersion}\n`;
    if (pkg.npmVersion) {
      markdown += `- **npm 版本**: ${pkg.npmVersion}\n`;
    }
    markdown += `- **路径**: \`${pkgPath}\`\n`;

    if (pkg.description) {
      markdown += `- **描述**: ${pkg.description}\n`;
    }

    if (pkg.keywords && pkg.keywords.length > 0) {
      markdown += `- **关键词**: ${pkg.keywords.join(', ')}\n`;
    }

    if (pkg.dependencies && pkg.dependencies.length > 0) {
      markdown += `- **依赖**: ${pkg.dependencies.map((d) => `\`${d}\``).join(', ')}\n`;
    }

    markdown += '\n';
  }
}

// 保存文档
const docPath = path.join(rootDir, 'docs', 'packages-inventory.md');
fs.writeFileSync(docPath, markdown, 'utf-8');

console.log(`✅ 文档已生成: ${docPath}\n`);

const summary = {
  total: packagesInfo.length,
  published: packagesInfo.filter((p) => p.status === 'published').length,
  mismatch: packagesInfo.filter((p) => p.status === 'mismatch').length,
  notPublished: packagesInfo.filter((p) => p.status === 'not_published' || p.status === 'missing')
    .length,
};

if (summary.notPublished === 0 && summary.mismatch === 0) {
  console.log('🎉 所有包都已正确发布！');
} else {
  console.log('⚠️  发现问题，请检查文档详情');
}

module.exports = { packagesInfo, summary };
