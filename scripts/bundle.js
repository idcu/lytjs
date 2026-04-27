#!/usr/bin/env node

/**
 * Lyt.js ESM Bundle Script — ESM 打包脚本
 *
 * 纯 Node.js 实现的 ESM 打包工具（不依赖 esbuild/rollup）：
 * - 读取每个包的 src/index.ts 作为入口
 * - 分析 import 依赖关系，构建依赖图
 * - 将所有依赖内联打包为单个 ESM 文件
 * - 去除 TypeScript 类型注解（正则）
 * - 去除注释（单行和块注释）
 * - 去除多余空白行
 * - 输出到 packages/<name>/dist/index.mjs
 * - 同时生成 packages/<name>/dist/index.d.mts（类型声明文件，简单版）
 * - 统计每个包的输出大小（原始 + gzip 估算）
 *
 * 用法：
 *   node scripts/bundle.js              # 打包所有包
 *   node scripts/bundle.js --pkg reactivity  # 只打包指定包
 *   node scripts/bundle.js --report     # 输出详细报告
 *
 * 纯原生零依赖实现（仅使用 Node.js 内置模块）。
 */

'use strict'

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// ============================================================
// 配置
// ============================================================

const ROOT_DIR = path.resolve(__dirname, '..')
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages')

/** 所有包名列表 */
const ALL_PACKAGES = [
  'core',
  'reactivity',
  'vdom',
  'renderer',
  'component',
  'compiler',
  'router',
  'store',
  'devtools',
  'cli',
  'test-utils',
]

/** 不参与打包的包（test-utils 是测试工具，不需要打包） */
const SKIP_PACKAGES = ['test-utils']

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
      // 非选项参数，可能是 --pkg 后面的包名
      if (i > 0 && (args[i - 1] === '--pkg' || args[i - 1] === '-p')) {
        // 已在上面处理
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

/** 颜色日志 */
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

/** 递归创建目录 */
function mkdirp(dir) {
  if (fs.existsSync(dir)) return
  fs.mkdirSync(dir, { recursive: true })
}

/** 格式化字节大小 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

/** gzip 估算大小 */
function gzipSize(content) {
  return zlib.gzipSync(Buffer.from(content), { level: 9 }).length
}

// ============================================================
// TypeScript 类型注解剥离
// ============================================================

/**
 * 去除 TypeScript 类型注解
 * 使用正则处理常见情况，不是完整的 TypeScript 编译器
 */
function stripTypeAnnotations(source) {
  let result = source

  // 1. 移除多行注释
  result = result.replace(/\/\*[\s\S]*?\*\//g, '')

  // 2. 移除单行注释（但不移除 URL 中的 //）
  result = result.replace(/(?<!:)\/\/.*$/gm, '')

  // 3. 移除 import type 语句
  result = result.replace(/^import\s+type\s+[\s\S]*?from\s+['"].*?['"];?\s*$/gm, '')

  // 4. 移除 export type 语句
  result = result.replace(/^export\s+type\s+\{[^}]*\}\s*from\s+['"].*?['"];?\s*$/gm, '')
  result = result.replace(/^export\s+type\s+\{[^}]*\}\s*;?\s*$/gm, '')
  result = result.replace(/^export\s+type\s+[^=]*$/gm, '')

  // 5. 移除 interface 声明块
  result = result.replace(/^export\s+interface\s+[\s\S]*?^\}/gm, '')
  result = result.replace(/^interface\s+[\s\S]*?^\}/gm, '')

  // 6. 移除 type 别名声明
  result = result.replace(/^export\s+type\s+\w+(?:<[^>]*>)?\s*=\s*[\s\S]*?;/gm, '')
  result = result.replace(/^type\s+\w+(?:<[^>]*>)?\s*=\s*[\s\S]*?;/gm, '')

  // 7. 移除泛型参数 <...>（处理嵌套尖括号）
  // 多次执行以处理嵌套情况
  let prev = ''
  while (prev !== result) {
    prev = result
    // 匹配 <...> 中的类型参数，但不匹配比较运算符 <= 和 >=
    // 通过检查前面是否是标识符字符来区分
    result = result.replace(/([A-Za-z0-9_])<(?![<=])([^<>]*(?:<[^<>]*>[^<>]*)*)>/g, '$1')
  }

  // 8. 移除函数参数和变量声明中的类型注解 : Type
  // 匹配 : 后面跟着类型表达式（到逗号、右括号、分号、等号、行尾为止）
  // 但要避免匹配三元运算符 ? : 和对象字面量 { key: value }
  // 策略：只匹配特定上下文中的冒号类型注解
  // a) 函数参数: (param: Type) -> (param)
  // b) 变量声明: const x: Type = -> const x =
  // c) 返回类型: ): Type { -> ) {
  // d) 返回类型含对象字面量类型: ): { ... } { -> ) {
  // e) 可选属性: prop?: Type; -> prop;
  result = result.replace(/(\))\s*:\s*\{[^}]*\}\s*(?=\{)/g, '$1')
  result = result.replace(/(\))\s*:\s*[^{=;,\n)]+(?=\s*[{=;\n])/g, '$1')
  result = result.replace(/(\w)\?\s*:\s*[^;=\n]+(?=\s*[;=\n])/g, '$1')
  result = result.replace(/(\w)\s*:\s*(?:string|number|boolean|void|any|never|unknown|null|undefined|object|bigint|symbol)\b(?![\w.<])/g, '$1')
  // 匹配大写开头的类型（可能带联合类型 | null/undefined 等）
  result = result.replace(/(\w)\s*:\s*[A-Z][A-Za-z0-9_]*(?:\[\])?(?:\s*\|\s*(?:null|undefined|[A-Z][A-Za-z0-9_]*(?:\[\])?))*(?=\s*[),;=\n])/g, '$1')
  // 匹配小写开头的复杂类型注解（如 null | Type）
  result = result.replace(/(\w)\s*:\s*(?:null|undefined)\s*\|\s*[A-Z][A-Za-z0-9_]*(?:\[\])?(?=\s*[),;=\n])/g, '$1')

  // 9. 移除 as 类型断言
  result = result.replace(/\s+as\s+[A-Z][A-Za-z0-9_]*(?:\[\])?/g, '')
  result = result.replace(/\s+as\s+const\b/g, '')
  result = result.replace(/\s+as\s+(?:string|number|boolean|any|never|unknown|null|undefined|object)\b/g, '')

  // 10. 移除 ! 非空断言（但保留 !== 和 ===）
  result = result.replace(/(\w)!\./g, '$1.')
  result = result.replace(/(\w)!(?=[,\);}\]\s\n])/g, '$1')

  // 11. 移除 implements 子句
  result = result.replace(/\s+implements\s+[A-Z][\w<> ,]*/g, '')

  // 12. 移除 public/private/protected 访问修饰符（在类成员中）
  result = result.replace(/(^\s*)(public|private|protected)\s+/gm, '$1')

  // 13. 移除 readonly 修饰符（在属性声明中）
  result = result.replace(/(^\s*)readonly\s+/gm, '$1')

  // 14. 移除 enum 声明
  result = result.replace(/^(export\s+)?enum\s+\w+\s*\{[\s\S]*?\}/gm, '')

  // 15. 移除 declare 关键字
  result = result.replace(/(^\s*)declare\s+/gm, '$1')

  // 16. 移除 abstract 关键字
  result = result.replace(/(^\s*)abstract\s+/gm, '$1')

  // 17. 移除 export default
  result = result.replace(/^export\s+default\s+/gm, '')

  return result
}

/**
 * 去除多余空白行（连续空行最多保留一行）
 */
function collapseBlankLines(source) {
  return source.replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

/**
 * 完整的 TypeScript 到 JavaScript 转换
 */
function transformTS(source) {
  let result = stripTypeAnnotations(source)
  result = collapseBlankLines(result)
  return result
}

// ============================================================
// 依赖分析
// ============================================================

/**
 * 解析文件中的 import 语句，提取相对路径依赖
 * 返回解析后的绝对路径列表
 */
function resolveImports(filePath, source, packageSrcDir) {
  const imports = []
  const dir = path.dirname(filePath)

  // 先去除注释，避免匹配注释中的 import
  let cleaned = source.replace(/\/\*[\s\S]*?\*\//g, '')
  cleaned = cleaned.replace(/\/\/.*$/gm, '')

  // 匹配 import ... from '...' 和 export ... from '...'
  // 以及动态 import('...')
  const importRegex = /(?:import|export)\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g
  let match

  while ((match = importRegex.exec(cleaned)) !== null) {
    const specifier = match[1]
    if (specifier.startsWith('.')) {
      // 相对路径导入
      let resolved = path.resolve(dir, specifier)
      // 尝试添加扩展名
      if (!fs.existsSync(resolved) && fs.existsSync(resolved + '.ts')) {
        resolved += '.ts'
      } else if (!fs.existsSync(resolved) && fs.existsSync(resolved + '.tsx')) {
        resolved += '.tsx'
      } else if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        // 目录导入，尝试 index.ts
        const indexPath = path.join(resolved, 'index.ts')
        if (fs.existsSync(indexPath)) {
          resolved = indexPath
        }
      }
      // 只收集包内且实际存在的文件
      if (resolved.startsWith(packageSrcDir) && fs.existsSync(resolved)) {
        imports.push(resolved)
      }
    }
    // 忽略包外导入（node_modules 等）
  }

  return imports
}

/**
 * 构建依赖图（拓扑排序）
 * 从入口文件开始，递归收集所有依赖文件
 * 返回按拓扑排序的文件列表（被依赖的文件在前）
 */
function buildDependencyGraph(entryFile, packageSrcDir) {
  const visited = new Set()
  const order = []

  function visit(filePath) {
    if (visited.has(filePath)) return
    visited.add(filePath)

    const source = fs.readFileSync(filePath, 'utf-8')
    const deps = resolveImports(filePath, source, packageSrcDir)

    for (const dep of deps) {
      visit(dep)
    }

    order.push(filePath)
  }

  visit(entryFile)
  return order
}

// ============================================================
// 类型声明提取
// ============================================================

/**
 * 从 TypeScript 源文件中提取导出的类型声明
 * 生成简单的 .d.mts 文件
 */
function extractTypeExports(source, filePath, packageSrcDir) {
  const exports = []
  const lines = source.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // export type { ... } from '...'
    if (/^export\s+type\s*\{[^}]*\}/.test(trimmed)) {
      exports.push(trimmed)
    }

    // export interface ...
    if (/^export\s+interface\s+\w+/.test(trimmed)) {
      // 收集整个 interface 块
      const braceCount = (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length
      if (braceCount <= 0) {
        exports.push(trimmed)
      }
      // 多行 interface 在简单版中跳过
    }

    // export type X = ... (单行)
    if (/^export\s+type\s+\w+\s*(?:<[^>]*>)?\s*=/.test(trimmed) && trimmed.endsWith(';')) {
      exports.push(trimmed)
    }
  }

  return exports
}

/**
 * 为包生成类型声明文件
 */
function generateTypeDeclaration(packageName) {
  const srcDir = path.join(PACKAGES_DIR, packageName, 'src')
  const entryFile = path.join(srcDir, 'index.ts')

  if (!fs.existsSync(entryFile)) return null

  const source = fs.readFileSync(entryFile, 'utf-8')
  const typeExports = extractTypeExports(source, entryFile, srcDir)

  if (typeExports.length === 0) return null

  // 构建声明文件内容
  let declaration = `// Type declarations for @lytjs/${packageName}\n`
  declaration += `// Auto-generated by bundle.js\n\n`

  for (const exp of typeExports) {
    declaration += exp + '\n'
  }

  return declaration.trim() + '\n'
}

// ============================================================
// 打包核心
// ============================================================

/**
 * 打包单个包
 */
function bundlePackage(packageName, report) {
  const srcDir = path.join(PACKAGES_DIR, packageName, 'src')
  const entryFile = path.join(srcDir, 'index.ts')
  const distDir = path.join(PACKAGES_DIR, packageName, 'dist')

  if (!fs.existsSync(entryFile)) {
    log(`  [SKIP] ${packageName}: no src/index.ts found`, 'yellow')
    return null
  }

  // 1. 构建依赖图
  const fileOrder = buildDependencyGraph(entryFile, srcDir)

  if (report) {
    log(`  [${packageName}] Dependency graph (${fileOrder.length} files):`, 'gray')
    for (const f of fileOrder) {
      log(`    - ${path.relative(srcDir, f)}`, 'gray')
    }
  }

  // 2. 收集所有导出名，用于去重
  const allExportNames = new Set()
  const moduleContents = []

  // 3. 处理每个文件（按拓扑排序）
  for (const filePath of fileOrder) {
    const source = fs.readFileSync(filePath, 'utf-8')
    const relativePath = path.relative(srcDir, filePath)

    // 转换 TypeScript -> JavaScript
    let jsContent = transformTS(source)

    // 移除 import 语句（因为所有代码会被内联）
    // 但保留 import type（已被 stripTypeAnnotations 移除）
    jsContent = jsContent.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')

    // 移除 export default（保留具名 export）
    // 将 export 保留在入口文件中

    // 如果不是入口文件，移除 export 关键字（避免重复导出）
    if (filePath !== entryFile) {
      // 移除 export { ... } 语句
      jsContent = jsContent.replace(/^export\s*\{[^}]*\}\s*from\s+['"][^'"]+['"];?\s*$/gm, '')
      jsContent = jsContent.replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '')
      // 移除 export 关键字（但保留 export function, export class 等中的函数/类定义）
      jsContent = jsContent.replace(/^export\s+(function|class|const|let|var|async\s+function)\s/gm, '$1 ')
      // 移除 export default
      jsContent = jsContent.replace(/^export\s+default\s+/gm, '')
    } else {
      // 入口文件：移除 export { ... } from '...' 语句（因为已内联）
      // 但保留 export { ... } 重导出语句（转换为本地导出）
      jsContent = jsContent.replace(/^export\s*\{([^}]*)\}\s*from\s+['"][^'"]+['"];?\s*$/gm, (match, names) => {
        // 这些是从其他文件重导出的，由于已内联，保留 export { ... } 即可
        return `export { ${names} }`
      })
    }

    // 添加文件分隔注释
    if (fileOrder.length > 1) {
      moduleContents.push(`// ---- ${relativePath} ----\n`)
    }

    moduleContents.push(jsContent)
  }

  // 4. 合并所有模块内容
  let bundleContent = moduleContents.join('\n')

  // 5. 最终清理
  bundleContent = collapseBlankLines(bundleContent)

  // 6. 添加包头部注释
  const header = `/**
 * @lytjs/${packageName} - ESM Bundle
 * Auto-generated by scripts/bundle.js
 * DO NOT EDIT MANUALLY
 */
\n`

  bundleContent = header + bundleContent

  // 7. 写入 dist/index.mjs
  mkdirp(distDir)
  const outputPath = path.join(distDir, 'index.mjs')
  fs.writeFileSync(outputPath, bundleContent, 'utf-8')

  // 8. 生成类型声明文件
  const declaration = generateTypeDeclaration(packageName)
  let declarationPath = null
  if (declaration) {
    declarationPath = path.join(distDir, 'index.d.mts')
    fs.writeFileSync(declarationPath, declaration, 'utf-8')
  }

  // 9. 统计大小
  const rawSize = Buffer.byteLength(bundleContent, 'utf-8')
  const gzipped = gzipSize(bundleContent)

  return {
    name: packageName,
    files: fileOrder.length,
    rawSize,
    gzipped,
    outputPath: path.relative(ROOT_DIR, outputPath),
    declarationPath: declarationPath ? path.relative(ROOT_DIR, declarationPath) : null,
  }
}

// ============================================================
// 报告生成
// ============================================================

function printReport(results) {
  const validResults = results.filter(Boolean)

  log('')
  log('  Lyt.js Bundle Report', 'bold')
  log('  ' + '='.repeat(60), 'gray')
  log('')

  // 表头
  const col1 = 'Package'.padEnd(16)
  const col2 = 'Files'.padStart(5)
  const col3 = 'Size'.padStart(12)
  const col4 = 'Gzip'.padStart(12)
  log(`  ${col1} ${col2}  ${col3}  ${col4}`, 'bold')
  log('  ' + '-'.repeat(56), 'gray')

  let totalRaw = 0
  let totalGzip = 0

  for (const r of validResults) {
    const name = r.name.padEnd(16)
    const files = String(r.files).padStart(5)
    const size = formatBytes(r.rawSize).padStart(12)
    const gzip = formatBytes(r.gzipped).padStart(12)

    log(`  ${color.green}${name}${color.reset} ${color.blue}${files}${color.reset}  ${size}  ${color.cyan}${gzip}${color.reset}`)

    totalRaw += r.rawSize
    totalGzip += r.gzipped
  }

  log('  ' + '-'.repeat(56), 'gray')
  const tName = 'TOTAL'.padEnd(16)
  const tSize = formatBytes(totalRaw).padStart(12)
  const tGzip = formatBytes(totalGzip).padStart(12)
  log(`  ${color.bold}${tName}${color.reset}          ${color.bold}${tSize}${color.reset}  ${color.bold}${tGzip}${color.reset}`)

  log('')
  log(`  Output: packages/<name>/dist/index.mjs`, 'gray')
  log(`  Types:  packages/<name>/dist/index.d.mts`, 'gray')
  log('')
}

function printSimpleSummary(results) {
  const validResults = results.filter(Boolean)
  for (const r of validResults) {
    log(`  ${color.green}[BUNDLED]${color.reset} ${r.name.padEnd(14)} ${formatBytes(r.rawSize).padStart(10)} (gzip: ${formatBytes(r.gzipped)})`)
  }
}

// ============================================================
// 主流程
// ============================================================

function main() {
  const options = parseArgs()

  // 确定要打包的包
  let packages = options.packages.length > 0
    ? options.packages
    : ALL_PACKAGES.filter(pkg => !SKIP_PACKAGES.includes(pkg))

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
  log('  Lyt.js ESM Bundler', 'bold')
  log('  ' + '-'.repeat(40), 'gray')
  log(`  Packages: ${packages.join(', ')}`, 'blue')
  log(`  Report: ${options.report ? 'yes' : 'no'}`, 'blue')
  log('')

  // 打包每个包
  const results = []
  for (const pkg of packages) {
    const result = bundlePackage(pkg, options.report)
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
main()
