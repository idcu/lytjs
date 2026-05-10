/**
 * 循环依赖检测脚本
 *
 * 用途：使用 madge 检测 packages/ 下所有包的循环依赖。
 *
 * 扫描路径：
 *   - packages/*/dist/index.js（顶层包）
 *   - packages/common/packages/*/dist/index.js（common 子包）
 *
 * 用法：
 *   pnpm run check-circular        # 扫描 dist 目录
 *   pnpm run check-circular:src    # 扫描 src 目录
 */

import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import madge from 'madge';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 解析 --src 参数
const useSrc = process.argv.includes('--src');

/**
 * 收集所有需要检测的入口文件路径
 */
function collectEntryPoints(): string[] {
  const entries: string[] = [];
  const suffix = useSrc ? 'src/index.ts' : 'dist/index.js';

  // 扫描 packages/*/dist/index.js（或 src/index.ts）
  const topPackagesDir = join(ROOT, 'packages');
  if (existsSync(topPackagesDir)) {
    const topEntries = readdirSync(topPackagesDir, { withFileTypes: true });
    for (const entry of topEntries) {
      if (!entry.isDirectory()) continue;
      // 跳过 _templates 和 common（common 的子包在下面单独扫描）
      if (entry.name === '_templates' || entry.name === 'common') continue;
      // 跳过 ecosystem、plugins、tools（它们是聚合目录，子包在子目录中）
      if (entry.name === 'ecosystem' || entry.name === 'plugins' || entry.name === 'tools') continue;

      const entryPath = join(topPackagesDir, entry.name, suffix);
      if (existsSync(entryPath)) {
        entries.push(entryPath);
      }
    }
  }

  // 扫描 packages/ecosystem/packages/*/dist/index.js
  const ecosystemDir = join(ROOT, 'packages', 'ecosystem', 'packages');
  if (existsSync(ecosystemDir)) {
    const ecoEntries = readdirSync(ecosystemDir, { withFileTypes: true });
    for (const entry of ecoEntries) {
      if (!entry.isDirectory()) continue;
      const entryPath = join(ecosystemDir, entry.name, suffix);
      if (existsSync(entryPath)) {
        entries.push(entryPath);
      }
    }
  }

  // 扫描 packages/plugins/packages/*/dist/index.js
  const pluginsDir = join(ROOT, 'packages', 'plugins', 'packages');
  if (existsSync(pluginsDir)) {
    const pluginEntries = readdirSync(pluginsDir, { withFileTypes: true });
    for (const entry of pluginEntries) {
      if (!entry.isDirectory()) continue;
      const entryPath = join(pluginsDir, entry.name, suffix);
      if (existsSync(entryPath)) {
        entries.push(entryPath);
      }
    }
  }

  // 扫描 packages/tools/packages/*/dist/index.js
  const toolsDir = join(ROOT, 'packages', 'tools', 'packages');
  if (existsSync(toolsDir)) {
    const toolEntries = readdirSync(toolsDir, { withFileTypes: true });
    for (const entry of toolEntries) {
      if (!entry.isDirectory()) continue;
      const entryPath = join(toolsDir, entry.name, suffix);
      if (existsSync(entryPath)) {
        entries.push(entryPath);
      }
    }
  }

  // 扫描 packages/common/packages/*/dist/index.js
  const commonPackagesDir = join(ROOT, 'packages', 'common', 'packages');
  if (existsSync(commonPackagesDir)) {
    const commonEntries = readdirSync(commonPackagesDir, { withFileTypes: true });
    for (const entry of commonEntries) {
      if (!entry.isDirectory()) continue;
      const entryPath = join(commonPackagesDir, entry.name, suffix);
      if (existsSync(entryPath)) {
        entries.push(entryPath);
      }
    }
  }

  return entries;
}

async function main(): Promise<void> {
  const mode = useSrc ? 'src' : 'dist';
  console.log(`🔍 检测循环依赖（${mode} 模式）...\n`);

  const entryPoints = collectEntryPoints();

  if (entryPoints.length === 0) {
    console.log('⚠️  未找到任何入口文件，请先构建项目。\n');
    process.exit(1);
  }

  console.log(`📦 扫描 ${entryPoints.length} 个包：\n`);
  for (const entry of entryPoints) {
    // 显示相对于项目根目录的路径
    const relative = entry.replace(ROOT, '.').replace(/\\/g, '/');
    console.log(`  - ${relative}`);
  }
  console.log('');

  try {
    const result = await madge(entryPoints, {
      // 使用 TypeScript 解析器（src 模式下需要）
      tsConfig: join(ROOT, 'tsconfig.base.json'),
      // 不检测 CommonJS 内置模块
      detectiveOptions: {
        es6: { mixedImports: true },
      },
      // 基础目录
      baseDir: ROOT,
    });

    const circularDependencies = result.circular();

    if (circularDependencies.length === 0) {
      console.log('✅ 未发现循环依赖，所有包依赖关系正常。\n');
      process.exit(0);
    }

    console.log(`❌ 发现 ${circularDependencies.length} 个循环依赖：\n`);

    for (let i = 0; i < circularDependencies.length; i++) {
      const cycle = circularDependencies[i]!;
      // 将路径转换为相对路径以便阅读
      const readable = cycle.map((p) => {
        const relative = p.replace(ROOT, '.').replace(/\\/g, '/');
        return relative;
      });
      console.log(`  ${i + 1}. ${readable.join(' → ')} → ${readable[0]}`);
    }

    console.log('\n请修复以上循环依赖后重新运行检查。');
    process.exit(1);
  } catch (err) {
    console.error('❌ 检测过程中出错：');
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
