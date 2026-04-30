/**
 * e2e/build.cjs
 * 将 @lytjs/core 及其所有依赖打包成一个 IIFE bundle，供 E2E 测试在浏览器中使用。
 *
 * 用法: node e2e/build.cjs
 *
 * 前提条件: 已执行 pnpm run build（构建所有子包）
 */
const esbuild = require('esbuild')
const { resolve, dirname } = require('path')

const rootDir = resolve(__dirname, '..')

// 项目包的 workspace 别名映射
const aliases = {
  '@lytjs/core': resolve(rootDir, 'packages/core/src/index.ts'),
  '@lytjs/reactivity': resolve(rootDir, 'packages/reactivity/src/index.ts'),
  '@lytjs/vdom': resolve(rootDir, 'packages/vdom/src/index.ts'),
  '@lytjs/compiler': resolve(rootDir, 'packages/compiler/src/index.ts'),
  '@lytjs/renderer': resolve(rootDir, 'packages/renderer/src/index.ts'),
  '@lytjs/component': resolve(rootDir, 'packages/component/src/index.ts'),
  '@lytjs/common-is': resolve(rootDir, 'packages/common/packages/is/src/index.ts'),
  '@lytjs/common-string': resolve(rootDir, 'packages/common/packages/string/src/index.ts'),
  '@lytjs/common-scheduler': resolve(rootDir, 'packages/common/packages/scheduler/src/index.ts'),
  '@lytjs/common-env': resolve(rootDir, 'packages/common/packages/env/src/index.ts'),
  '@lytjs/common-error': resolve(rootDir, 'packages/common/packages/error/src/index.ts'),
  '@lytjs/common-vnode': resolve(rootDir, 'packages/common/packages/vnode/src/index.ts'),
  '@lytjs/common-algorithm': resolve(rootDir, 'packages/common/packages/algorithm/src/index.ts'),
  '@lytjs/common-path': resolve(rootDir, 'packages/common/packages/path/src/index.ts'),
  '@lytjs/common-cache': resolve(rootDir, 'packages/common/packages/cache/src/index.ts'),
  '@lytjs/common-timing': resolve(rootDir, 'packages/common/packages/timing/src/index.ts'),
  '@lytjs/common-events': resolve(rootDir, 'packages/common/packages/events/src/index.ts'),
  '@lytjs/common-object': resolve(rootDir, 'packages/common/packages/object/src/index.ts'),
  '@lytjs/common-common': resolve(rootDir, 'packages/common/packages/common/src/index.ts'),
}

// 构建 esbuild 的 plugin 来处理 workspace 别名
const workspacePlugin = {
  name: 'workspace-alias',
  setup(build) {
    for (const [alias, path] of Object.entries(aliases)) {
      build.onResolve({ filter: new RegExp(`^${alias}$`) }, () => ({
        path,
      }))
    }
  },
}

async function build() {
  const outDir = resolve(__dirname, 'fixtures/dist')

  await esbuild.build({
    entryPoints: [resolve(rootDir, 'packages/core/src/index.ts')],
    bundle: true,
    format: 'iife',
    globalName: 'LytJS',
    outfile: resolve(outDir, 'lytjs.global.js'),
    plugins: [workspacePlugin],
    minify: false,
    sourcemap: true,
    define: {
      'process.env.NODE_ENV': '"development"',
    },
    external: [],
    logLevel: 'info',
  })

  console.log(`\nBuild complete: ${resolve(outDir, 'lytjs.global.js')}`)
}

build().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})
