#!/usr/bin/env node
/**
 * ============================================================
 * Lyt.js Version Manager
 *
 * 统一管理所有包的版本号
 *
 * 用法：
 *   node scripts/version.js <new-version>  # 设置新的版本号
 *   node scripts/version.js current        # 查看当前版本号
 *   node scripts/version.js bump patch     # 升级 patch 版本 (1.0.0 -> 1.0.1)
 *   node scripts/version.js bump minor     # 升级 minor 版本 (1.0.0 -> 1.1.0)
 *   node scripts/version.js bump major     # 升级 major 版本 (1.0.0 -> 2.0.0)
 * ============================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.resolve(ROOT_DIR, 'packages');

const color = {
  green: (text) => `\x1b[0;32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[0;33m${text}\x1b[0m`,
  red: (text) => `\x1b[0;31m${text}\x1b[0m`,
  blue: (text) => `\x1b[0;34m${text}\x1b[0m`,
};

const log = (text) => console.log(`${color.blue('[version]')} ${text}`);
const ok = (text) => console.log(`${color.green('[OK]')} ${text}`);
const warn = (text) => console.log(`${color.yellow('[WARN]')} ${text}`);
const err = (text) => console.log(`${color.red('[ERROR]')} ${text}`);

function readPackageJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writePackageJson(filePath, data) {
  // 保留原始文件格式（缩进、换行、字段顺序），仅替换 version 字段
  const raw = fs.readFileSync(filePath, 'utf8');
  const updated = raw.replace(
    /"version"\s*:\s*"[^"]+"/,
    `"version": "${data.version}"`
  );
  fs.writeFileSync(filePath, updated, 'utf8');
}

function getPackages() {
  const packages = [];
  const dirs = fs.readdirSync(PACKAGES_DIR);

  for (const dir of dirs) {
    const pkgPath = path.join(PACKAGES_DIR, dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = readPackageJson(pkgPath);
      packages.push({
        name: pkg.name,
        dir: dir,
        path: pkgPath,
        version: pkg.version,
        private: pkg.private || false,
      });
    }
  }

  return packages;
}

function validateVersion(version) {
  const semverRegex = /^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+)?$/;
  return semverRegex.test(version);
}

function bumpVersion(version, type) {
  const parts = version.split('.');
  let major = parseInt(parts[0], 10);
  let minor = parseInt(parts[1], 10);
  let patch = parseInt(parts[2], 10);

  switch (type) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
      patch += 1;
      break;
    default:
      throw new Error(`Unknown version bump type: ${type}`);
  }

  return `${major}.${minor}.${patch}`;
}

function getCurrentVersion() {
  const rootPkg = readPackageJson(path.join(ROOT_DIR, 'package.json'));
  return rootPkg.version;
}

function setVersion(newVersion) {
  if (!validateVersion(newVersion)) {
    err(`Invalid version format: ${newVersion}`);
    err('Version should be in format: x.y.z (e.g., 1.0.0, 1.0.0-beta.1)');
    process.exit(1);
  }

  log(`Setting version to: ${newVersion}`);
  console.log('');

  let updatedCount = 0;

  const rootPkgPath = path.join(ROOT_DIR, 'package.json');
  const rootPkg = readPackageJson(rootPkgPath);
  rootPkg.version = newVersion;
  writePackageJson(rootPkgPath, rootPkg);
  log(`  Updated: root (${newVersion})`);
  updatedCount++;

  const packages = getPackages();
  for (const pkg of packages) {
    const pkgData = readPackageJson(pkg.path);
    pkgData.version = newVersion;
    writePackageJson(pkg.path, pkgData);
    log(`  Updated: ${pkg.name} (${newVersion})`);
    updatedCount++;
  }

  console.log('');
  ok(`Successfully updated ${updatedCount} package(s) to version ${newVersion}`);
}

function showCurrentVersion() {
  const currentVersion = getCurrentVersion();
  log(`Current version: ${currentVersion}`);

  console.log('');
  log('Package versions:');

  const packages = getPackages();
  for (const pkg of packages) {
    const status = pkg.version === currentVersion ? color.green('✓') : color.red('✗');
    console.log(`  ${status} ${pkg.name}: ${pkg.version}`);
  }

  const allMatch = packages.every(pkg => pkg.version === currentVersion);
  console.log('');
  if (allMatch) {
    ok('All packages are in sync!');
  } else {
    warn('Some packages have different versions!');
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'current':
      showCurrentVersion();
      break;

    case 'bump':
      if (args.length < 2) {
        err('Please specify bump type: patch, minor, or major');
        process.exit(1);
      }
      const bumpType = args[1];
      if (!['patch', 'minor', 'major'].includes(bumpType)) {
        err(`Invalid bump type: ${bumpType}`);
        err('Valid types: patch, minor, major');
        process.exit(1);
      }
      const currentVersion = getCurrentVersion();
      const newVersion = bumpVersion(currentVersion, bumpType);
      setVersion(newVersion);
      break;

    default:
      setVersion(command);
  }
}

function showHelp() {
  console.log(`
${color.blue('Lyt.js Version Manager')}

Usage:
  node scripts/version.js <new-version>  # Set new version for all packages
  node scripts/version.js current        # Show current versions
  node scripts/version.js bump patch     # Bump patch version (1.0.0 -> 1.0.1)
  node scripts/version.js bump minor     # Bump minor version (1.0.0 -> 1.1.0)
  node scripts/version.js bump major     # Bump major version (1.0.0 -> 2.0.0)

Examples:
  node scripts/version.js 4.0.1
  node scripts/version.js current
  node scripts/version.js bump patch
`);
}

main();
