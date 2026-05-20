 
/**
 * 零依赖规范校验脚本
 *
 * 检查 LytJS 项目中所有包是否遵循运行时零第三方依赖原则
 * 仅允许 devDependencies 中使用第三方依赖，dependencies 必须只包含 @lytjs/* 包
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

interface PackageInfo {
  name: string;
  path: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface Violation {
  packageName: string;
  packagePath: string;
  violations: string[];
}

const INTERNAL_PREFIX = '@lytjs/';
const EXEMPT_PACKAGES = new Set(['@lytjs/test-utils']);

const SCAN_TARGETS = [
  'packages/common/packages',
  'packages/plugins/packages',
  'packages/ecosystem/packages',
];

function isInternalPackage(name: string): boolean {
  return name.startsWith(INTERNAL_PREFIX);
}

function parsePackageJson(dirPath: string): PackageInfo | null {
  try {
    const packageJsonPath = join(dirPath, 'package.json');
    const content = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);

    return {
      name: pkg.name,
      path: dirPath,
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
    };
  } catch {
    return null;
  }
}

function scanDirectory(dirPath: string): PackageInfo[] {
  const packages: PackageInfo[] = [];

  try {
    const entries = readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          const pkg = parsePackageJson(fullPath);
          if (pkg) {
            packages.push(pkg);
          } else {
            const subPackages = scanDirectory(fullPath);
            packages.push(...subPackages);
          }
        }
      } catch {
        // 跳过无法访问的目录
      }
    }
  } catch {
    // 跳过无法访问的目录
  }

  return packages;
}

function checkPackage(pkg: PackageInfo): Violation | null {
  const violations: string[] = [];

  for (const depName of Object.keys(pkg.dependencies)) {
    if (!isInternalPackage(depName) && !EXEMPT_PACKAGES.has(depName)) {
      violations.push(`第三方运行时依赖: ${depName}@${pkg.dependencies[depName]}`);
    }
  }

  if (violations.length > 0) {
    return {
      packageName: pkg.name,
      packagePath: pkg.path,
      violations,
    };
  }

  return null;
}

function printReport(violations: Violation[]): void {
  console.log('\n========================================');
  console.log('       LytJS 零依赖规范校验报告');
  console.log('========================================\n');

  if (violations.length === 0) {
    console.log('✅ 所有包均符合零依赖规范！');
    console.log('   - 所有运行时 dependencies 均为内部包 (@lytjs/*)');
    console.log('   - 无第三方运行时依赖\n');
    return;
  }

  console.log(`❌ 发现 ${violations.length} 个包违反零依赖规范：\n`);

  for (const violation of violations) {
    console.log(`📦 ${violation.packageName}`);
    console.log(`   路径: ${relative(process.cwd(), violation.packagePath)}`);

    for (const v of violation.violations) {
      console.log(`   ❌ ${v}`);
    }
    console.log();
  }

  console.log('----------------------------------------');
  console.log('规范说明：');
  console.log('  - 所有 L0-L6 层包的 dependencies 必须只包含 @lytjs/* 内部包');
  console.log('  - 仅允许 devDependencies 中使用第三方依赖');
  console.log('  - 第三方工具请使用 @lytjs/common-* 系列工具包替代');
  console.log('----------------------------------------\n');
}

function main(): void {
  console.log('开始扫描包...\n');

  const allPackages: PackageInfo[] = [];

  for (const target of SCAN_TARGETS) {
    const targetPath = join(process.cwd(), target);

    try {
      const packages = scanDirectory(targetPath);
      allPackages.push(...packages);
    } catch {
      console.warn(`警告: 无法扫描目录 ${target}`);
    }
  }

  console.log(`扫描到 ${allPackages.length} 个包\n`);

  const violations: Violation[] = [];

  for (const pkg of allPackages) {
    const violation = checkPackage(pkg);
    if (violation) {
      violations.push(violation);
    }
  }

  printReport(violations);

  if (violations.length > 0) {
    process.exit(1);
  }
}

main();
