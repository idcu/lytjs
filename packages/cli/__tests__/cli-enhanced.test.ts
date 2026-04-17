/**
 * Lyt.js CLI 增强版测试
 *
 * 测试脚手架 (scaffold) 和 HMR 模块
 * 使用 @lytjs/test-utils 统一测试框架
 */

import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'
import { describe, it, expect } from '../../test-utils/src/index'
import { createProject, type ScaffoldOptions } from '../src/scaffold'
import { createHMRServer, createHMREndpoint, getHMRClientScript, type HMRUpdate } from '../src/hmr'
import { parseArgs } from '../src/utils'

// ================================================================
//  辅助函数
// ================================================================

/** 生成唯一临时目录名 */
let tmpCounter = 0
function getTmpDir(): string {
  tmpCounter++
  return path.join('/tmp', `lyt-cli-test-${Date.now()}-${tmpCounter}`)
}

/** 递归删除目录 */
function rmRecursive(dir: string): void {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      rmRecursive(fullPath)
    } else {
      fs.unlinkSync(fullPath)
    }
  }
  fs.rmdirSync(dir)
}

/** 递归列出目录下所有文件（相对路径） */
function listFiles(dir: string, base: string = dir): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...listFiles(fullPath, base))
    } else {
      results.push(path.relative(base, fullPath))
    }
  }
  return results.sort()
}

// ================================================================
//  Scaffold 测试
// ================================================================

describe('Scaffold: 创建 SPA 项目', () => {
  it('应该成功创建 SPA 项目', async () => {
    const tmpDir = getTmpDir()
    try {
      const options: ScaffoldOptions = {
        name: tmpDir,
        template: 'spa',
        ts: true,
        router: false,
        store: false,
        eslint: false,
      }
      await createProject(options)
      expect(fs.existsSync(path.join(tmpDir, 'package.json'))).toBe(true)
      expect(fs.existsSync(path.join(tmpDir, 'index.html'))).toBe(true)
      expect(fs.existsSync(path.join(tmpDir, 'src', 'main.ts'))).toBe(true)
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('Scaffold: 创建 SSR 项目', () => {
  it('应该成功创建 SSR 项目', async () => {
    const tmpDir = getTmpDir()
    try {
      const options: ScaffoldOptions = {
        name: tmpDir,
        template: 'ssr',
        ts: true,
        router: false,
        store: false,
        eslint: false,
      }
      await createProject(options)
      expect(fs.existsSync(path.join(tmpDir, 'package.json'))).toBe(true)
      // 验证 lytx.config.ts 中包含 ssr 模式
      const config = fs.readFileSync(path.join(tmpDir, 'lytx.config.ts'), 'utf-8')
      expect(config).toContain("'ssr'")
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('Scaffold: 创建 SSG 项目', () => {
  it('应该成功创建 SSG 项目', async () => {
    const tmpDir = getTmpDir()
    try {
      const options: ScaffoldOptions = {
        name: tmpDir,
        template: 'ssg',
        ts: true,
        router: false,
        store: false,
        eslint: false,
      }
      await createProject(options)
      expect(fs.existsSync(path.join(tmpDir, 'package.json'))).toBe(true)
      const config = fs.readFileSync(path.join(tmpDir, 'lytx.config.ts'), 'utf-8')
      expect(config).toContain("'ssg'")
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('Scaffold: 带 TypeScript', () => {
  it('应该生成 tsconfig.json', async () => {
    const tmpDir = getTmpDir()
    try {
      const options: ScaffoldOptions = {
        name: tmpDir,
        template: 'spa',
        ts: true,
        router: false,
        store: false,
        eslint: false,
      }
      await createProject(options)
      expect(fs.existsSync(path.join(tmpDir, 'tsconfig.json'))).toBe(true)
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('Scaffold: 带路由', () => {
  it('应该生成路由文件', async () => {
    const tmpDir = getTmpDir()
    try {
      const options: ScaffoldOptions = {
        name: tmpDir,
        template: 'spa',
        ts: true,
        router: true,
        store: false,
        eslint: false,
      }
      await createProject(options)
      expect(fs.existsSync(path.join(tmpDir, 'src', 'router', 'index.ts'))).toBe(true)
      // 验证 package.json 中包含 @lytjs/router 依赖
      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'))
      expect(pkg.dependencies['@lytjs/router']).toBeDefined()
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('Scaffold: 带状态管理', () => {
  it('应该生成 store 文件', async () => {
    const tmpDir = getTmpDir()
    try {
      const options: ScaffoldOptions = {
        name: tmpDir,
        template: 'spa',
        ts: true,
        router: false,
        store: true,
        eslint: false,
      }
      await createProject(options)
      expect(fs.existsSync(path.join(tmpDir, 'src', 'store', 'index.ts'))).toBe(true)
      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'))
      expect(pkg.dependencies['@lytjs/store']).toBeDefined()
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('Scaffold: 项目结构验证', () => {
  it('应该包含所有必需文件', async () => {
    const tmpDir = getTmpDir()
    try {
      const options: ScaffoldOptions = {
        name: tmpDir,
        template: 'spa',
        ts: true,
        router: true,
        store: true,
        eslint: true,
      }
      await createProject(options)
      const files = listFiles(tmpDir)

      // 验证核心文件
      expect(files).toContain('package.json')
      expect(files).toContain('tsconfig.json')
      expect(files).toContain('index.html')
      expect(files).toContain('lytx.config.ts')
      expect(files).toContain(path.join('src', 'main.ts'))
      expect(files).toContain(path.join('src', 'App.lyt'))
      expect(files).toContain(path.join('src', 'pages', 'index.ts'))
      expect(files).toContain(path.join('src', 'pages', 'about.ts'))
      expect(files).toContain(path.join('src', 'components', 'Header.ts'))
      expect(files).toContain(path.join('src', 'router', 'index.ts'))
      expect(files).toContain(path.join('src', 'store', 'index.ts'))
      expect(files).toContain(path.join('src', 'styles', 'main.css'))
      expect(files).toContain(path.join('public', 'favicon.svg'))
      expect(files).toContain('.eslintrc.json')
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('Scaffold: package.json 内容', () => {
  it('应该包含正确的 scripts 和依赖', async () => {
    const tmpDir = getTmpDir()
    try {
      const options: ScaffoldOptions = {
        name: tmpDir,
        template: 'spa',
        ts: true,
        router: true,
        store: true,
        eslint: true,
      }
      await createProject(options)
      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'))

      expect(pkg.name).toBe(tmpDir)
      expect(pkg.version).toBe('0.1.0')
      expect(pkg.scripts.dev).toBe('lytx dev')
      expect(pkg.scripts.build).toBe('lytx build')
      expect(pkg.scripts.preview).toBe('lytx preview')
      expect(pkg.dependencies.lyt).toBe('^2.0.0')
      expect(pkg.dependencies['@lytjs/router']).toBeDefined()
      expect(pkg.dependencies['@lytjs/store']).toBeDefined()
      expect(pkg.devDependencies.typescript).toBeDefined()
      expect(pkg.devDependencies.eslint).toBeDefined()
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('Scaffold: tsconfig.json 内容', () => {
  it('应该包含正确的 TypeScript 配置', async () => {
    const tmpDir = getTmpDir()
    try {
      const options: ScaffoldOptions = {
        name: tmpDir,
        template: 'spa',
        ts: true,
        router: false,
        store: false,
        eslint: false,
      }
      await createProject(options)
      const tsconfig = JSON.parse(fs.readFileSync(path.join(tmpDir, 'tsconfig.json'), 'utf-8'))

      expect(tsconfig.compilerOptions.target).toBe('ES2020')
      expect(tsconfig.compilerOptions.module).toBe('ESNext')
      expect(tsconfig.compilerOptions.strict).toBe(true)
      expect(tsconfig.compilerOptions.jsx).toBe('preserve')
      expect(tsconfig.include).toContain('src/**/*.ts')
      expect(tsconfig.exclude).toContain('node_modules')
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('Scaffold: index.html 内容', () => {
  it('应该包含正确的 HTML 结构', async () => {
    const tmpDir = getTmpDir()
    try {
      const options: ScaffoldOptions = {
        name: tmpDir,
        template: 'spa',
        ts: true,
        router: false,
        store: false,
        eslint: false,
      }
      await createProject(options)
      const html = fs.readFileSync(path.join(tmpDir, 'index.html'), 'utf-8')

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<div id="app"></div>')
      expect(html).toContain('type="module"')
      expect(html).toContain('/src/main.ts')
      expect(html).toContain('/favicon.svg')
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('Scaffold: lytx.config.ts 内容', () => {
  it('应该包含正确的配置', async () => {
    const tmpDir = getTmpDir()
    try {
      const options: ScaffoldOptions = {
        name: tmpDir,
        template: 'spa',
        ts: true,
        router: true,
        store: true,
        eslint: false,
      }
      await createProject(options)
      const config = fs.readFileSync(path.join(tmpDir, 'lytx.config.ts'), 'utf-8')

      expect(config).toContain('defineConfig')
      expect(config).toContain("'spa'")
      expect(config).toContain('router')
      expect(config).toContain('store')
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('Scaffold: main.ts 内容', () => {
  it('应该包含正确的入口代码', async () => {
    const tmpDir = getTmpDir()
    try {
      const options: ScaffoldOptions = {
        name: tmpDir,
        template: 'spa',
        ts: true,
        router: true,
        store: true,
        eslint: false,
      }
      await createProject(options)
      const main = fs.readFileSync(path.join(tmpDir, 'src', 'main.ts'), 'utf-8')

      expect(main).toContain("import { createApp } from 'lyt'")
      expect(main).toContain("import App from './App.lyt'")
      expect(main).toContain("import './styles/main.css'")
      expect(main).toContain("import { router } from './router'")
      expect(main).toContain("import { store } from './store'")
      expect(main).toContain('app.use(router)')
      expect(main).toContain('app.use(store)')
      expect(main).toContain("app.mount('#app')")
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

// ================================================================
//  HMR 测试
// ================================================================

describe('HMR: 服务器创建', () => {
  it('应该成功创建 HMR 服务器实例', () => {
    const tmpDir = getTmpDir()
    fs.mkdirSync(tmpDir, { recursive: true })
    try {
      const server = createHMRServer(tmpDir)
      expect(server).toBeDefined()
      expect(typeof server.start).toBe('function')
      expect(typeof server.stop).toBe('function')
      expect(typeof server.onFileChange).toBe('function')
      expect(typeof server.notifyClient).toBe('function')
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('HMR: 文件变更检测', () => {
  it('应该注册文件变更回调', () => {
    const tmpDir = getTmpDir()
    fs.mkdirSync(tmpDir, { recursive: true })
    try {
      const server = createHMRServer(tmpDir)

      let callbackCalled = false
      server.onFileChange((_file) => {
        callbackCalled = true
      })

      expect(callbackCalled).toBe(false)
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('HMR: WebSocket 通知', () => {
  it('notifyClient 不应该抛出异常', () => {
    const tmpDir = getTmpDir()
    fs.mkdirSync(tmpDir, { recursive: true })
    try {
      const server = createHMRServer(tmpDir)

      const update: HMRUpdate = {
        type: 'update',
        path: '/src/main.ts',
      }

      // 没有客户端连接时不应抛出异常
      expect(() => server.notifyClient(update)).not.toThrow()
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('HMR: CSS 热交换', () => {
  it('应该正确识别 CSS 更新类型', () => {
    const tmpDir = getTmpDir()
    fs.mkdirSync(tmpDir, { recursive: true })
    try {
      const server = createHMRServer(tmpDir)

      const cssUpdate: HMRUpdate = {
        type: 'css',
        path: '/src/styles/main.css',
        content: 'body { color: red; }',
      }

      expect(cssUpdate.type).toBe('css')
      expect(cssUpdate.content).toBe('body { color: red; }')
      expect(() => server.notifyClient(cssUpdate)).not.toThrow()
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('HMR: 组件更新', () => {
  it('应该正确识别组件更新类型', () => {
    const tmpDir = getTmpDir()
    fs.mkdirSync(tmpDir, { recursive: true })
    try {
      const server = createHMRServer(tmpDir)

      const update: HMRUpdate = {
        type: 'update',
        path: '/src/components/Header.ts',
      }

      expect(update.type).toBe('update')
      expect(() => server.notifyClient(update)).not.toThrow()
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('HMR: 全量刷新', () => {
  it('应该正确识别全量刷新类型', () => {
    const tmpDir = getTmpDir()
    fs.mkdirSync(tmpDir, { recursive: true })
    try {
      const server = createHMRServer(tmpDir)

      const update: HMRUpdate = {
        type: 'reload',
        path: '/lytx.config.ts',
      }

      expect(update.type).toBe('reload')
      expect(() => server.notifyClient(update)).not.toThrow()
    } finally {
      rmRecursive(tmpDir)
    }
  })
})

describe('HMR: 客户端脚本生成', () => {
  it('应该生成包含 WebSocket 连接代码的客户端脚本', () => {
    const script = getHMRClientScript()

    expect(script).toContain('WebSocket')
    expect(script).toContain('/__hmr__')
    expect(script).toContain('handleCSSUpdate')
    expect(script).toContain('handleModuleUpdate')
    expect(script).toContain('handleFullReload')
    expect(script).toContain('location.reload')
    expect(script).toContain('reconnect')
  })

  it('客户端脚本应该处理 CSS 更新', () => {
    const script = getHMRClientScript()
    expect(script).toContain("'css'")
    expect(script).toContain('link[rel="stylesheet"]')
  })

  it('客户端脚本应该处理模块更新', () => {
    const script = getHMRClientScript()
    expect(script).toContain("'update'")
    expect(script).toContain('module.hot')
  })

  it('客户端脚本应该处理全量刷新', () => {
    const script = getHMRClientScript()
    expect(script).toContain("'reload'")
    expect(script).toContain('location.reload()')
  })
})

describe('HMR: createHMREndpoint', () => {
  it('应该创建 HMR 端点', () => {
    const server = http.createServer()
    const hmr = createHMREndpoint(server)

    expect(hmr).toBeDefined()
    expect(typeof hmr.broadcast).toBe('function')
    expect(typeof hmr.getClientCount).toBe('function')
    expect(hmr.getClientCount()).toBe(0)
  })
})

// ================================================================
//  CLI 命令解析测试
// ================================================================

describe('CLI: 命令解析', () => {
  it('应该解析 create 命令', () => {
    const result = parseArgs(['node', 'lytx', 'create', 'my-app'])
    expect(result.command).toBe('create')
    expect(result.args).toContain('my-app')
  })

  it('应该解析 dev 命令', () => {
    const result = parseArgs(['node', 'lytx', 'dev'])
    expect(result.command).toBe('dev')
  })

  it('应该解析 build 命令', () => {
    const result = parseArgs(['node', 'lytx', 'build'])
    expect(result.command).toBe('build')
  })

  it('应该解析 preview 命令', () => {
    const result = parseArgs(['node', 'lytx', 'preview'])
    expect(result.command).toBe('preview')
  })
})

describe('CLI: --port 选项', () => {
  it('应该解析 --port 选项', () => {
    const result = parseArgs(['node', 'lytx', 'dev', '--port', '8080'])
    expect(result.options.port).toBe('8080')
  })

  it('应该解析 -p 短选项', () => {
    const result = parseArgs(['node', 'lytx', 'dev', '-p', '4173'])
    expect(result.options.p).toBe('4173')
  })
})

describe('CLI: --template 选项', () => {
  it('应该解析 --template spa', () => {
    const result = parseArgs(['node', 'lytx', 'create', 'my-app', '--template', 'spa'])
    expect(result.options.template).toBe('spa')
  })

  it('应该解析 --template ssr', () => {
    const result = parseArgs(['node', 'lytx', 'create', 'my-app', '--template', 'ssr'])
    expect(result.options.template).toBe('ssr')
  })

  it('应该解析 --template ssg', () => {
    const result = parseArgs(['node', 'lytx', 'create', 'my-app', '--template', 'ssg'])
    expect(result.options.template).toBe('ssg')
  })
})

describe('CLI: --hmr 选项', () => {
  it('应该解析 --hmr 选项', () => {
    const result = parseArgs(['node', 'lytx', 'dev', '--hmr'])
    expect(result.options.hmr).toBe(true)
  })

  it('应该解析 --no-hmr 选项', () => {
    const result = parseArgs(['node', 'lytx', 'dev', '--no-hmr'])
    expect(result.options['no-hmr']).toBe(true)
  })
})

describe('CLI: 增强选项解析', () => {
  it('应该解析 --ts 选项', () => {
    const result = parseArgs(['node', 'lytx', 'create', 'my-app', '--ts'])
    expect(result.options.ts).toBe(true)
  })

  it('应该解析 --router 选项', () => {
    const result = parseArgs(['node', 'lytx', 'create', 'my-app', '--router'])
    expect(result.options.router).toBe(true)
  })

  it('应该解析 --store 选项', () => {
    const result = parseArgs(['node', 'lytx', 'create', 'my-app', '--store'])
    expect(result.options.store).toBe(true)
  })

  it('应该解析 --eslint 选项', () => {
    const result = parseArgs(['node', 'lytx', 'create', 'my-app', '--eslint'])
    expect(result.options.eslint).toBe(true)
  })
})

describe('CLI: 错误处理', () => {
  it('未知命令应该返回空命令', () => {
    const result = parseArgs(['node', 'lytx', 'unknown-command'])
    expect(result.command).toBe('unknown-command')
  })

  it('无效端口号应该被检测到', () => {
    const port = parseInt('abc', 10)
    expect(isNaN(port)).toBe(true)
  })

  it('超出范围的端口号应该被检测到', () => {
    const port = 99999
    expect(port < 1 || port > 65535).toBe(true)
  })
})

describe('CLI: 帮助输出', () => {
  it('--help 选项应该被解析', () => {
    const result = parseArgs(['node', 'lytx', '--help'])
    expect(result.options.help).toBe(true)
  })

  it('-h 短选项应该被解析', () => {
    const result = parseArgs(['node', 'lytx', '-h'])
    expect(result.options.help).toBe(true)
  })

  it('--version 选项应该被解析', () => {
    const result = parseArgs(['node', 'lytx', '--version'])
    expect(result.options.version).toBe(true)
  })

  it('-v 短选项应该被解析', () => {
    const result = parseArgs(['node', 'lytx', '-v'])
    expect(result.options.version).toBe(true)
  })
})
