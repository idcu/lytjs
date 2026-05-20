const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

// Glob 功能实现
function findPackageJson(dir, result = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // 跳过 node_modules 和 .git 等目录
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.pnpm-store') {
        continue;
      }
      findPackageJson(fullPath, result);
    } else if (entry.isFile() && entry.name === 'package.json') {
      const relativePath = fullPath.substring(rootDir.length + 1).replace(/\\/g, '/');
      result.push(relativePath);
    }
  }

  return result;
}

console.log('🔍 正在搜索所有 package.json 文件...\n');

const allPackages = findPackageJson(rootDir);

console.log(`✅ 找到 ${allPackages.length} 个 package.json 文件\n`);
console.log('📋 文件列表：\n');

allPackages.sort().forEach((pkg, index) => {
  console.log(`${String(index + 1).padStart(2, '0')}. ${pkg}`);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📊 详细分析每个 package.json：\n');

let count = 0;
const details = [];

for (const pkgPath of allPackages) {
  count++;
  try {
    const fullPath = path.join(rootDir, pkgPath);
    const pkgJson = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));

    const isPrivate = pkgJson.private === true;
    const isInPackages = pkgPath.startsWith('packages/');

    let category = '其他';
    if (pkgPath.startsWith('packages/common/packages/')) {
      category = 'common 子包';
    } else if (pkgPath.startsWith('packages/plugins/packages/')) {
      category = 'plugins 子包';
    } else if (pkgPath.startsWith('packages/ecosystem/packages/')) {
      category = 'ecosystem 子包';
    } else if (pkgPath.startsWith('packages/tools/packages/')) {
      category = 'tools 子包';
    } else if (
      pkgPath === 'packages/common/package.json' ||
      pkgPath === 'packages/ecosystem/package.json' ||
      pkgPath === 'packages/plugins/package.json' ||
      pkgPath === 'packages/tools/package.json'
    ) {
      category = 'Monorepo 根包';
    } else if (pkgPath.startsWith('packages/')) {
      category = '独立包';
    }

    details.push({
      index: count,
      path: pkgPath,
      name: pkgJson.name || '(无名称)',
      version: pkgJson.version || '(无版本)',
      isPrivate,
      category,
    });
  } catch (e) {
    details.push({
      index: count,
      path: pkgPath,
      name: '(解析错误)',
      version: '',
      isPrivate: false,
      category: '错误',
    });
  }
}

// 输出分类表格
console.log(
  '┌─────┬────────────────────────────────────────┬─────────────────────────┬──────────┬──────────────┐',
);
console.log(
  '│ 序号 │ package.json 路径                     │ 包名                   │ private? │ 分类         │',
);
console.log(
  '├─────┼────────────────────────────────────────┼─────────────────────────┼──────────┼──────────────┤',
);

for (const item of details) {
  const name = item.name.length > 25 ? item.name.substring(0, 22) + '...' : item.name;
  const isPrivate = item.isPrivate ? '   yes   ' : '   no    ';
  const pathShort = item.path.length > 40 ? item.path.substring(0, 37) + '...' : item.path;

  console.log(
    `│ ${String(item.index).padStart(3)} │ ${pathShort.padEnd(40)} │ ${name.padEnd(23)} │ ${isPrivate} │ ${item.category.padEnd(12)} │`,
  );
}
console.log(
  '└─────┴────────────────────────────────────────┴─────────────────────────┴──────────┴──────────────┘',
);

// 统计
const categories = {};
for (const item of details) {
  categories[item.category] = (categories[item.category] || 0) + 1;
}

console.log('\n📊 分类统计：\n');
for (const [cat, count] of Object.entries(categories)) {
  console.log(`   - ${cat}: ${count} 个`);
}

console.log('\n✅ 核查完成！');
console.log(`\n总计 ${details.length} 个 package.json 文件`);
