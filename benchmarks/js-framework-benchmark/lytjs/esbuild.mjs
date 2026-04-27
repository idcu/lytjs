import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import esbuild from 'esbuild'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DIST_DIR = join(__dirname, 'dist')
const SRC_DIR = join(__dirname, 'src')
const PACKAGES_DIR = join(__dirname, '..', '..', '..', 'packages')

const isDev = process.argv.includes('--dev')

// Ensure dist directory exists
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

try {
  await esbuild.build({
    entryPoints: [join(SRC_DIR, 'main.ts')],
    bundle: true,
    outfile: join(DIST_DIR, 'main.js'),
    format: 'esm',
    target: 'es2020',
    minify: !isDev,
    sourcemap: false,
    treeShaking: true,
    alias,
  })

  const { statSync } = await import('node:fs')
  const { size } = statSync(join(DIST_DIR, 'main.js'))
  console.log(`Build ${isDev ? 'dev' : 'prod'} complete: dist/main.js (${(size / 1024).toFixed(2)} KB)`)
} catch (error) {
  console.error('Build failed:', error)
  process.exit(1)
}
