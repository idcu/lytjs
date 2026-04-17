#!/usr/bin/env node

/**
 * Lyt.js esbuild Bundle Script
 *
 * 基于 esbuild 的 Tree-shaking 打包系统：
 * - 读取每个包的 src/index.ts 作为入口
 * - 使用 esbuild 进行打包，启用 tree-shaking 和 minification
 * - 输出 ESM 格式（.mjs）和 CJS 格式（.cjs）
 * - 生成 gzip 体积报告
 * - @lyt/* 内部包标记为 external（不内联），以便按需引入
 *
 * 用法：
 *   node scripts/esbuild-bundle.js              # 打包所有包
 *   node scripts/esbuild-bundle.js --pkg reactivity  # 只打包指定包
 *   node scripts/esbuild-bundle.js --report     # 输出详细报告
 */

'use strict'

const esbuild = require('esbuild')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// ============================================================
// 配置
// ============================================================

const ROOT_DIR = path.resolve(__dirname, '..')
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages')

/** 需要打包的核心运行时包 */
const CORE_PACKAGES = [
  'reactivity',
  'vdom',
  'compiler',
  'renderer',
  'component',
  'core',
  'router',
  'store',
  'agg',
]

/** @lyt/* 包名前缀，用于 external 匹配 */
const LYT_EXTERNAL_PREFIX = '@lyt/'

// ============================================================
// 命令行参数解析
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    packages: [],
    report: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--pkg' || arg === '-p') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        options.packages.push(args[i + 1])
        i++
      }
    } else if (arg.startsWith('--pkg=')) {
      options.packages.push(arg.split('=')[1])
    } else if (arg === '--report' || arg === '-r') {
      options.report = true
    } else if (!arg.startsWith('-')) {
      if (i > 0 && (args[i - 1] === '--pkg' || args[i - 1] === '-p')) {
        // already handled
      } else {
        options.packages.push(arg)
      }
    }
  }

  return options
}

// ============================================================
// 工具函数
// ============================================================

const color = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
}

function log(msg, c = 'reset') {
  console.log(`${color[c] || color.reset}${msg}${color.reset}`)
}

function mkdirp(dir) {
  if (fs.existsSync(dir)) return
  fs.mkdirSync(dir, { recursive: true })
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function gzipSize(content) {
  return zlib.gzipSync(Buffer.from(content), { level: 9 }).length
}

/**
 * 读取包的 package.json
 */
function readPackageJson(packageName) {
  const pkgJsonPath = path.join(PACKAGES_DIR, packageName, 'package.json')
  if (!fs.existsSync(pkgJsonPath)) return {}
  return JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))
}

// ============================================================
// esbuild 打包核心
// ============================================================

/**
 * 打包单个包（ESM + CJS 双格式）
 */
async function bundlePackage(packageName, report) {
  const srcDir = path.join(PACKAGES_DIR, packageName, 'src')
  const entryFile = path.join(srcDir, 'index.ts')
  const distDir = path.join(PACKAGES_DIR, packageName, 'dist')

  if (!fs.existsSync(entryFile)) {
    log(`  [SKIP] ${packageName}: no src/index.ts found`, 'yellow')
    return null
  }

  mkdirp(distDir)

  // esbuild plugin: 将所有 @lyt/* 包标记为 external（不内联），以便按需引入
  const lytExternalPlugin = {
    name: 'lyt-external',
    setup(build) {
      build.onResolve({ filter: /^@lyt\/.*/ }, args => ({
        path: args.path,
        external: true,
      }))
    },
  }

  const baseOptions = {
    entryPoints: [entryFile],
    bundle: true,
    minify: true,
    treeShaking: true,
    platform: 'browser',
    target: 'es2018',
    plugins: [lytExternalPlugin],
    sourcemap: false,
    logLevel: 'warning',
    // 生产构建优化：移除 console.log / console.debug / console.info 和 debugger 语句
    drop: ['console', 'debugger'],
    // 纯标记：告知 esbuild 模块没有副作用，增强 tree-shaking
    pure: [],
    // 忽略注释，减少产物体积
    legalComments: 'none',
  }

  const results = {}

  // ---- ESM 格式 (.mjs) ----
  try {
    const esmResult = await esbuild.build({
      ...baseOptions,
      format: 'esm',
      outfile: path.join(distDir, 'index.mjs'),
      metafile: true,
    })

    const esmContent = fs.readFileSync(path.join(distDir, 'index.mjs'))
    results.esm = {
      size: esmContent.length,
      gzip: gzipSize(esmContent),
      metafile: esmResult.metafile,
    }

    if (report) {
      log(`  [${packageName}] ESM build success`, 'gray')
      const inputs = esmResult.metafile ? Object.keys(esmResult.metafile.inputs) : []
      for (const inp of inputs) {
        log(`    input: ${inp}`, 'gray')
      }
    }
  } catch (err) {
    log(`  [ERROR] ${packageName} ESM build failed: ${err.message}`, 'red')
    results.esm = { error: err.message }
  }

  // ---- CJS 格式 (.cjs) ----
  try {
    const cjsResult = await esbuild.build({
      ...baseOptions,
      format: 'cjs',
      outfile: path.join(distDir, 'index.cjs'),
      metafile: true,
    })

    const cjsContent = fs.readFileSync(path.join(distDir, 'index.cjs'))
    results.cjs = {
      size: cjsContent.length,
      gzip: gzipSize(cjsContent),
      metafile: cjsResult.metafile,
    }

    if (report) {
      log(`  [${packageName}] CJS build success`, 'gray')
    }
  } catch (err) {
    log(`  [ERROR] ${packageName} CJS build failed: ${err.message}`, 'red')
    results.cjs = { error: err.message }
  }

  return {
    name: packageName,
    esm: results.esm,
    cjs: results.cjs,
  }
}

// ============================================================
// 报告生成
// ============================================================

function printReport(results) {
  const validResults = results.filter(Boolean)

  log('')
  log('  Lyt.js esbuild Bundle Report', 'bold')
  log('  ' + '='.repeat(72), 'gray')
  log('')

  // 表头
  const col1 = 'Package'.padEnd(16)
  const col2 = 'ESM'.padStart(12)
  const col3 = 'ESM gzip'.padStart(12)
  const col4 = 'CJS'.padStart(12)
  const col5 = 'CJS gzip'.padStart(12)
  log(`  ${col1} ${col2}  ${col3}  ${col4}  ${col5}`, 'bold')
  log('  ' + '-'.repeat(68), 'gray')

  let totalEsm = 0
  let totalEsmGzip = 0
  let totalCjs = 0
  let totalCjsGzip = 0

  for (const r of validResults) {
    const name = r.name.padEnd(16)

    if (r.esm && !r.esm.error) {
      const esmSize = formatBytes(r.esm.size).padStart(12)
      const esmGzip = formatBytes(r.esm.gzip).padStart(12)
      const cjsSize = (r.cjs && !r.cjs.error) ? formatBytes(r.cjs.size).padStart(12) : 'ERROR'.padStart(12)
      const cjsGzip = (r.cjs && !r.cjs.error) ? formatBytes(r.cjs.gzip).padStart(12) : '-'.padStart(12)

      log(`  ${color.green}${name}${color.reset} ${esmSize}  ${color.cyan}${esmGzip}${color.reset}  ${cjsSize}  ${cjsGzip}`)

      totalEsm += r.esm.size
      totalEsmGzip += r.esm.gzip
      if (r.cjs && !r.cjs.error) {
        totalCjs += r.cjs.size
        totalCjsGzip += r.cjs.gzip
      }
    } else {
      log(`  ${color.red}${name}${color.reset} ${'FAILED'.padStart(12)}  ${'-'.padStart(12)}  ${'-'.padStart(12)}  ${'-'.padStart(12)}`)
    }
  }

  log('  ' + '-'.repeat(68), 'gray')
  const tName = 'TOTAL'.padEnd(16)
  const tEsm = formatBytes(totalEsm).padStart(12)
  const tEsmGzip = formatBytes(totalEsmGzip).padStart(12)
  const tCjs = formatBytes(totalCjs).padStart(12)
  const tCjsGzip = formatBytes(totalCjsGzip).padStart(12)
  log(`  ${color.bold}${tName}${color.reset} ${color.bold}${tEsm}${color.reset}  ${color.bold}${tEsmGzip}${color.reset}  ${color.bold}${tCjs}${color.reset}  ${color.bold}${tCjsGzip}${color.reset}`)

  log('')
  log(`  Output ESM: packages/<name>/dist/index.mjs`, 'gray')
  log(`  Output CJS: packages/<name>/dist/index.cjs`, 'gray')
  log('')
}

function printSimpleSummary(results) {
  const validResults = results.filter(Boolean)
  for (const r of validResults) {
    if (r.esm && !r.esm.error) {
      log(`  ${color.green}[BUNDLED]${color.reset} ${r.name.padEnd(14)} ESM: ${formatBytes(r.esm.size).padStart(10)} (gzip: ${formatBytes(r.esm.gzip)})${r.cjs && !r.cjs.error ? `  CJS: ${formatBytes(r.cjs.size).padStart(10)} (gzip: ${formatBytes(r.cjs.gzip)})` : ''}`)
    } else {
      log(`  ${color.red}[FAILED]${color.reset}  ${r.name.padEnd(14)} ${r.esm ? r.esm.error : 'unknown error'}`)
    }
  }
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  const options = parseArgs()

  // 确定要打包的包
  let packages = options.packages.length > 0
    ? options.packages
    : CORE_PACKAGES

  // 验证包是否存在
  packages = packages.filter(pkg => {
    const pkgDir = path.join(PACKAGES_DIR, pkg)
    if (!fs.existsSync(pkgDir)) {
      log(`  [WARN] Package "${pkg}" not found, skipping.`, 'yellow')
      return false
    }
    return true
  })

  if (packages.length === 0) {
    log('No packages to bundle.', 'yellow')
    process.exit(0)
  }

  // 打印信息
  log('')
  log('  Lyt.js esbuild Bundler (Tree-shaking)', 'bold')
  log('  ' + '-'.repeat(44), 'gray')
  log(`  Packages: ${packages.join(', ')}`, 'blue')
  log(`  Report:   ${options.report ? 'yes' : 'no'}`, 'blue')
  log(`  External: @lyt/* (all internal packages)`, 'blue')
  log('')

  // 打包每个包
  const results = []
  for (const pkg of packages) {
    const result = await bundlePackage(pkg, options.report)
    results.push(result)
  }

  // 输出结果
  if (options.report) {
    printReport(results)
  } else {
    printSimpleSummary(results)
  }
}

// 运行
main().catch(err => {
  log(`Fatal error: ${err.message}`, 'red')
  process.exit(1)
})
