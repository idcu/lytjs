/**
 * Lyt.js js-framework-benchmark Bundle Builder
 * 
 * 使用 esbuild 将基准测试源代码打包为 IIFE 格式，
 * 以便在浏览器中直接运行并集成到 js-framework-benchmark。
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import esbuild from 'esbuild'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DIST_DIR = join(__dirname, 'lytjs', 'dist')
const BUNDLE_PATH = join(DIST_DIR, 'js-framework-benchmark.js')
const SRC_DIR = join(__dirname, 'lytjs', 'src')

console.log('🔨 Building Lyt.js js-framework-benchmark bundle...')

// 确保 dist 目录存在
mkdirSync(DIST_DIR, { recursive: true })

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
      treeShaking: true
    })

    console.log('✅ ESM build complete')

    // 2. 然后构建 IIFE 格式
    const result = await esbuild.build({
      entryPoints: [join(SRC_DIR, 'main.ts')],
      bundle: true,
      outfile: join(DIST_DIR, 'js-framework-benchmark.js'),
      format: 'iife',
      globalName: 'LytBenchmark',
      target: 'es2020',
      minify: false,
      sourcemap: false,
      logLevel: 'info',
      external: [],
      treeShaking: true,
      metafile: true
    })

    console.log('✅ IIFE bundle created at:', BUNDLE_PATH)

    // 清理临时文件
    const fs = await import('node:fs')
    if (fs.existsSync(join(__dirname, '.tmp-esm.js'))) {
      fs.unlinkSync(join(__dirname, '.tmp-esm.js'))
    }

    // 显示文件大小
    const { size } = fs.statSync(BUNDLE_PATH)
    console.log(`📊 Bundle size: ${(size / 1024).toFixed(2)} KB (${size} bytes)`)

    // 验证 bundle 包含预期的导出
    const content = fs.readFileSync(BUNDLE_PATH, 'utf-8')
    const hasExports = content.includes('LytBenchmark')
    console.log(`✅ Bundle validation: ${hasExports ? 'OK' : 'WARNING'} (has LytBenchmark)`)

    console.log('🎉 Build complete!')

    return true

  } catch (error) {
    console.error('❌ Build failed:', error)
    process.exit(1)
  }
}

// 运行构建
buildBenchmark()
