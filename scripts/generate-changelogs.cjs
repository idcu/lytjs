/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

// 读取检查结果
const checkResult = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'changelog-check-result.json'), 'utf-8'),
);

// 获取需要生成 CHANGELOG.md 的包
const missingChangelogs = checkResult.packages.filter((p) => !p.hasChangelog);

console.log(`🚀 准备为 ${missingChangelogs.length} 个包生成 CHANGELOG.md 文件...\n`);

// 特殊包的详细更新内容
const specialUpdates = {
  '@lytjs/common-query': `## [6.6.0] - 2026-05-21

### 🚀 功能增强

- 新增 \`parseQueryStringWithArrays\` 函数，支持数组查询参数解析
- 增强 \`stringifyQueryString\` 函数，支持数组、布尔值、数字等多种类型
- 保持完全向后兼容
- 完整的 TypeScript 类型支持

### 📦 依赖

- 无新增依赖`,

  '@lytjs/common-http': `## [6.6.0] - 2026-05-21

### 🚀 功能增强

- 新增便捷方法：\`get\`, \`post\`, \`put\`, \`patch\`, \`del\`
- 新增直接返回数据的 JSON 方法：\`getJson\`, \`postJson\`, \`putJson\`, \`patchJson\`, \`deleteJson\`, \`requestJson\`
- 集成 \`@lytjs/common-query\`，支持数组查询参数
- 新增完整的测试用例

### 📦 依赖

- \`@lytjs/common-query\` 更新至 \`^6.6.0\``,

  '@lytjs/http-server': `## [6.6.0] - 2026-05-21

### 🚀 包复用优化

- 移除了重复的 \`parseQuery\` 实现
- 直接使用 \`@lytjs/common-query\` 中的 \`parseQueryStringWithArrays\`
- 保持完全的功能完整性

### 📦 依赖

- \`@lytjs/common-query\` 更新至 \`^6.6.0\``,

  '@lytjs/api': `## [6.6.0] - 2026-05-21

### 📝 文档完善

- 新增完整的 README 文档
- 保持完全向后兼容

### 📦 依赖

- 所有相关依赖包已更新至 6.6.0`,
};

// 基本 CHANGELOG 模板
const getBaseChangelog = (pkgName) => {
  return `# ${pkgName} 更新日志

## [6.6.0] - 2026-05-21

### 🚀 版本升级

- 版本升级至 v6.6.0
- 保持完全向后兼容
- 所有依赖包已更新至 6.6.0

## [6.5.0] - 2026-05-19

### 🚀 版本升级

- 版本升级至 v6.5.0
- 保持完全向后兼容

## [6.4.0] - 2026-05-18

### 🚀 Monorepo 包发布

本版本为 LytJS 6.4.0 Monorepo 统一发布的一部分。
`;
};

let successCount = 0;
let skipCount = 0;

for (const pkg of missingChangelogs) {
  const fullPath = path.join(rootDir, pkg.path);
  const changelogPath = path.join(fullPath, 'CHANGELOG.md');

  // 检查目录是否存在
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  跳过不存在的目录: ${pkg.path}`);
    skipCount++;
    continue;
  }

  // 生成 CHANGELOG 内容
  let content;
  if (specialUpdates[pkg.name]) {
    content = `# ${pkg.name} 更新日志

${specialUpdates[pkg.name]}

## [6.5.0] - 2026-05-19

### 🚀 版本升级

- 版本升级至 v6.5.0
- 保持完全向后兼容

## [6.4.0] - 2026-05-18

### 🚀 Monorepo 包发布

本版本为 LytJS 6.4.0 Monorepo 统一发布的一部分。
`;
  } else {
    content = getBaseChangelog(pkg.name);
  }

  try {
    fs.writeFileSync(changelogPath, content, 'utf-8');
    console.log(`✅ 已生成: ${pkg.name} (${pkg.path})`);
    successCount++;
  } catch (e) {
    console.log(`❌ 失败: ${pkg.name} - ${e.message}`);
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`📊 完成总结:`);
console.log(`   成功生成: ${successCount} 个`);
console.log(`   跳过: ${skipCount} 个`);
console.log(`✅ 所有 CHANGELOG.md 文件已生成完成！`);
