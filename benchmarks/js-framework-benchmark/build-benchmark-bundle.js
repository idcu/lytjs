/**
 * Lyt.js js-framework-benchmark Bundle Builder
 *
 * 使用 esbuild 将基准测试源代码打包为 IIFE 格式，
 * 以便在浏览器中直接运行并集成到 js-framework-benchmark。
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, existsSync } from 'node:fs'
import esbuild from 'esbuild'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DIST_DIR = join(__dirname, 'lytjs', 'dist')
const BUNDLE_PATH = join(DIST_DIR, 'js-framework-benchmark.js')
const SRC_DIR = join(__dirname, 'lytjs', 'src')
const PACKAGES_DIR = join(__dirname, '..', '..', 'packages')

console.log('Building Lyt.js js-framework-benchmark bundle...')

// 确保 dist 目录存在
mkdirSync(DIST_DIR, { recursive: true })

// Path aliases for monorepo packages
const alias = {
  '@lytjs/core': join(PACKAGES_DIR, 'core', 'src', 'index.ts'),
  '@lytjs/core/h': join(PACKAGES_DIR, 'core', 'src', 'h.ts'),
  '@lytjs/reactivity': join(PACKAGES_DIR, 'reactivity', 'src', 'index.ts'),
  '@lytjs/reactivity/signal': join(PACKAGES_DIR, 'reactivity', 'src', 'signal.ts'),
  '@lytjs/vdom': join(PACKAGES_DIR, 'vdom', 'src', 'index.ts'),
  '@lytjs/renderer': join(PACKAGES_DIR, 'renderer', 'src', 'index.ts'),
  '@lytjs/renderer/dom': join(PACKAGES_DIR, 'renderer', 'src', 'dom', 'dom-renderer.ts'),
  '@lytjs/common': join(PACKAGES_DIR, 'common', 'src', 'index.ts'),
  '@lytjs/compiler': join(PACKAGES_DIR, 'compiler', 'src', 'index.ts'),
  '@lytjs/component': join(PACKAGES_DIR, 'component', 'src', 'index.ts'),
}

async function buildBenchmark() {
  try {
    // 1. 首先构建 ESM 格式，确保代码可正常编译
    await esbuild.build({
      entryPoints: [join(SRC_DIR, 'main.ts')],
      bundle: true,
      outfile: join(__dirname, '.tmp-esm.js'),
      format: 'esm',
      target: 'es2020',
      minify: false,
      sourcemap: false,
      logLevel: 'info',
      external: [],
      treeShaking: true,
      alias,
    })

    console.log('ESM build complete')

    // 2. 然后构建 IIFE 格式
    await esbuild.build({
      entryPoints: [join(SRC_DIR, 'main.ts')],
      bundle: true,
      outfile: BUNDLE_PATH,
      format: 'iife',
      globalName: 'LytBenchmark',
      target: 'es2020',
      minify: false,
      sourcemap: false,
      logLevel: 'info',
      external: [],
      treeShaking: true,
      metafile: true,
      alias,
    })

    console.log('IIFE bundle created at:', BUNDLE_PATH)

    // 清理临时文件
    const fs = await import('node:fs')
    if (existsSync(join(__dirname, '.tmp-esm.js'))) {
      fs.unlinkSync(join(__dirname, '.tmp-esm.js'))
    }

    // 显示文件大小
    const { size } = fs.statSync(BUNDLE_PATH)
    console.log(`Bundle size: ${(size / 1024).toFixed(2)} KB (${size} bytes)`)

    // 验证 bundle 包含预期的导出
    const content = fs.readFileSync(BUNDLE_PATH, 'utf-8')
    const expectedExports = [
      'createElement',
      'runBenchmark',
      'addRow',
      'updateEvery10thRow',
      'swapRows',
      'removeRow',
      'selectRow',
      'LytBenchmark',
      'createElementNonKeyed',
      'runBenchmarkNonKeyed',
    ]

    let allFound = true
    for (const exp of expectedExports) {
      if (!content.includes(exp)) {
        console.warn(`WARNING: Missing export "${exp}" in bundle`)
        allFound = false
      }
    }

    if (allFound) {
      console.log('Bundle validation: OK (all expected exports found)')
    }

    console.log('Build complete!')

    return true

  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

// 运行构建
buildBenchmark()
