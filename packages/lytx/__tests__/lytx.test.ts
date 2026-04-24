/**
 * LytX 测试套件
 *
 * 覆盖配置加载、路由解析、路由匹配、布局系统、页面渲染、
 * 静态构建、SPA 构建、CLI 参数解析等核心功能。
 */

import { describe, it, expect, beforeEach } from '../../test-utils/src/index'

// ================================================================
//  配置模块测试
// ================================================================

describe('LytX - 配置模块', () => {
  const { getDefaultConfig, resolveConfig, loadConfig } = require('../src/config')

  it('应返回正确的默认配置', () => {
    const config = getDefaultConfig()
    expect(config.base).toBe('/')
    expect(config.pagesDir).toBe('src/pages')
    expect(config.layoutsDir).toBe('src/layouts')
    expect(config.outDir).toBe('dist')
    expect(config.mode).toBe('ssg')
    expect(config.build.inlineStyles).toBe(false)
    expect(config.build.minify).toBe(true)
    expect(config.site.title).toBe('LytX App')
    expect(config.site.lang).toBe('zh-CN')
  })

  it('应正确合并用户配置', () => {
    const config = resolveConfig({
      base: '/app',
      mode: 'ssr',
      site: { title: 'My App' },
    })
    expect(config.base).toBe('/app')
    expect(config.mode).toBe('ssr')
    expect(config.site.title).toBe('My App')
    // 未指定的字段应使用默认值
    expect(config.pagesDir).toBe('src/pages')
    expect(config.layoutsDir).toBe('src/layouts')
    expect(config.outDir).toBe('dist')
  })

  it('应正确合并部分站点配置', () => {
    const config = resolveConfig({
      site: { title: 'Test', description: 'A test site' },
    })
    expect(config.site.title).toBe('Test')
    expect(config.site.description).toBe('A test site')
    expect(config.site.lang).toBe('zh-CN') // 默认值
  })

  it('应正确合并构建选项', () => {
    const config = resolveConfig({
      build: { inlineStyles: true, minify: false },
    })
    expect(config.build.inlineStyles).toBe(true)
    expect(config.build.minify).toBe(false)
  })

  it('应修正无效的 base 路径（添加前导 /）', () => {
    const config = resolveConfig({ base: 'app' })
    expect(config.base).toBe('/app')
  })

  it('应修正无效的 mode 值', () => {
    const config = resolveConfig({ mode: 'invalid' as any })
    expect(config.mode).toBe('ssg')
  })

  it('应修正无效的 build 选项', () => {
    const config = resolveConfig({
      build: { inlineStyles: 'yes' as any, minify: 1 as any },
    })
    expect(config.build.inlineStyles).toBe(false)
    expect(config.build.minify).toBe(true)
  })

  it('空配置应返回完整默认值', () => {
    const config = resolveConfig({})
    const defaults = getDefaultConfig()
    expect(config).toEqual(defaults)
  })

  it('loadConfig 应从不存在的目录返回默认配置', async () => {
    const config = await loadConfig('/nonexistent/path')
    expect(config.base).toBe('/')
    expect(config.mode).toBe('ssg')
  })
})

// ================================================================
//  路由解析测试
// ================================================================

describe('LytX - 路由解析', () => {
  const { parseFilePath, resolveRoutes } = require('../src/router')
  const fs = require('node:fs')
  const path = require('node:path')
  const os = require('node:os')

  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lytx-test-'))
  })

  it('应将 index.ts 解析为首页路由 /', () => {
    const route = parseFilePath('index.ts')
    expect(route).not.toBeNull()
    expect(route!.path).toBe('/')
    expect(route!.isIndex).toBe(true)
    expect(route!.isCatchAll).toBe(false)
  })

  it('应将 about.ts 解析为 /about', () => {
    const route = parseFilePath('about.ts')
    expect(route).not.toBeNull()
    expect(route!.path).toBe('/about')
    expect(route!.isIndex).toBe(false)
  })

  it('应将 blog/index.ts 解析为 /blog', () => {
    const route = parseFilePath('blog/index.ts')
    expect(route).not.toBeNull()
    expect(route!.path).toBe('/blog')
    expect(route!.isIndex).toBe(true)
  })

  it('应将 blog/[slug].ts 解析为动态路由 /blog/:slug', () => {
    const route = parseFilePath('blog/[slug].ts')
    expect(route).not.toBeNull()
    expect(route!.path).toBe('/blog/:slug')
    expect(route!.params).toEqual(['slug'])
    expect(route!.isCatchAll).toBe(false)
  })

  it('应将 blog/[...slug].ts 解析为 catch-all 路由 /blog/*', () => {
    const route = parseFilePath('blog/[...slug].ts')
    expect(route).not.toBeNull()
    expect(route!.path).toBe('/blog/*')
    expect(route!.params).toEqual(['slug'])
    expect(route!.isCatchAll).toBe(true)
  })

  it('应将 404.ts 解析为 404 页面', () => {
    const route = parseFilePath('404.ts')
    expect(route).not.toBeNull()
    expect(route!.path).toBe('/404')
    expect(route!.is404).toBe(true)
  })

  it('应将嵌套目录文件解析为嵌套路由', () => {
    const route = parseFilePath('docs/guide/getting-started.ts')
    expect(route).not.toBeNull()
    expect(route!.path).toBe('/docs/guide/getting-started')
  })

  it('应从目录解析多个路由', () => {
    // 创建测试文件结构
    fs.mkdirSync(path.join(tmpDir, 'blog'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'index.ts'), '')
    fs.writeFileSync(path.join(tmpDir, 'about.ts'), '')
    fs.writeFileSync(path.join(tmpDir, 'blog', 'index.ts'), '')
    fs.writeFileSync(path.join(tmpDir, 'blog', '[slug].ts'), '')

    const routes = resolveRoutes(tmpDir)
    expect(routes.length).toBe(4)

    const paths = routes.map((r: any) => r.path)
    expect(paths).toContain('/')
    expect(paths).toContain('/about')
    expect(paths).toContain('/blog')
    expect(paths).toContain('/blog/:slug')
  })

  it('路由排序应静态路由优先于动态路由', () => {
    fs.mkdirSync(path.join(tmpDir, 'blog'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'blog', 'index.ts'), '')
    fs.writeFileSync(path.join(tmpDir, 'blog', '[slug].ts'), '')
    fs.writeFileSync(path.join(tmpDir, 'blog', '[...slug].ts'), '')

    const routes = resolveRoutes(tmpDir)
    // 静态路由 /blog 应在动态路由 /blog/:slug 之前
    const blogIndex = routes.findIndex((r: any) => r.path === '/blog')
    const blogSlug = routes.findIndex((r: any) => r.path === '/blog/:slug')
    const blogCatchAll = routes.findIndex((r: any) => r.path === '/blog/*')

    expect(blogIndex).toBeLessThan(blogSlug)
    expect(blogSlug).toBeLessThan(blogCatchAll)
  })

  it('空目录应返回空路由列表', () => {
    const routes = resolveRoutes(tmpDir)
    expect(routes).toHaveLength(0)
  })

  it('应忽略以 _ 开头的文件', () => {
    fs.writeFileSync(path.join(tmpDir, '_app.ts'), '')
    fs.writeFileSync(path.join(tmpDir, 'index.ts'), '')

    const routes = resolveRoutes(tmpDir)
    expect(routes).toHaveLength(1)
    expect(routes[0].path).toBe('/')
  })

  it('应忽略测试文件', () => {
    fs.writeFileSync(path.join(tmpDir, 'index.test.ts'), '')
    fs.writeFileSync(path.join(tmpDir, 'about.ts'), '')

    const routes = resolveRoutes(tmpDir)
    expect(routes).toHaveLength(1)
    expect(routes[0].path).toBe('/about')
  })
})

// ================================================================
//  路由匹配测试
// ================================================================

describe('LytX - 路由匹配', () => {
  const { matchRoute } = require('../src/router')

  const routes = [
    { path: '/', filePath: 'index.ts', isIndex: true, is404: false },
    { path: '/about', filePath: 'about.ts', is404: false },
    { path: '/blog', filePath: 'blog/index.ts', isIndex: true, is404: false },
    { path: '/blog/:slug', filePath: 'blog/[slug].ts', params: ['slug'], isCatchAll: false, is404: false },
    { path: '/blog/*', filePath: 'blog/[...slug].ts', params: ['slug'], isCatchAll: true, is404: false },
    { path: '/404', filePath: '404.ts', is404: true },
  ]

  it('应精确匹配首页 /', () => {
    const result = matchRoute(routes, '/')
    expect(result).not.toBeNull()
    expect(result!.route.path).toBe('/')
    expect(result!.params).toEqual({})
  })

  it('应精确匹配静态路由 /about', () => {
    const result = matchRoute(routes, '/about')
    expect(result).not.toBeNull()
    expect(result!.route.path).toBe('/about')
    expect(result!.params).toEqual({})
  })

  it('应匹配动态路由并提取参数', () => {
    const result = matchRoute(routes, '/blog/hello-world')
    expect(result).not.toBeNull()
    expect(result!.route.path).toBe('/blog/:slug')
    expect(result!.params).toEqual({ slug: 'hello-world' })
  })

  it('应匹配 catch-all 路由', () => {
    const result = matchRoute(routes, '/blog/2024/01/post')
    expect(result).not.toBeNull()
    expect(result!.route.path).toBe('/blog/*')
    expect(result!.route.isCatchAll).toBe(true)
  })

  it('未匹配路由应返回 404', () => {
    const result = matchRoute(routes, '/nonexistent')
    expect(result).not.toBeNull()
    expect(result!.route.is404).toBe(true)
  })

  it('应优先匹配静态路由而非动态路由', () => {
    const result = matchRoute(routes, '/blog')
    expect(result).not.toBeNull()
    expect(result!.route.path).toBe('/blog')
    expect(result!.route.isIndex).toBe(true)
  })

  it('动态参数应正确提取数字', () => {
    const result = matchRoute(routes, '/blog/123')
    expect(result).not.toBeNull()
    expect(result!.params).toEqual({ slug: '123' })
  })

  it('应正确匹配带连字符的参数', () => {
    const result = matchRoute(routes, '/blog/my-first-post')
    expect(result).not.toBeNull()
    expect(result!.params).toEqual({ slug: 'my-first-post' })
  })
})

// ================================================================
//  布局系统测试
// ================================================================

describe('LytX - 布局系统', () => {
  const { applyLayout, createDefaultLayout, resolveLayout } = require('../src/layout')
  const { createPageModule, createLayoutModule } = require('../src/loader')

  it('应正确创建内置默认布局', () => {
    const layout = createDefaultLayout('Test Site')
    expect(layout.default.name).toBe('DefaultLayout')
    expect(typeof layout.default.render).toBe('function')
  })

  it('applyLayout 应返回组合组件', () => {
    const page = createPageModule({ title: 'Test Page' })
    const layout = createLayoutModule('TestLayout')
    const combined = applyLayout(page, layout)

    expect(combined.name).toBe('Layout_TestLayout')
    expect(typeof combined.render).toBe('function')
  })

  it('组合组件渲染应包含页面内容', () => {
    const page = createPageModule({ title: 'Hello' })
    const layout = createLayoutModule('MyLayout')
    const combined = applyLayout(page, layout)

    const vnode = combined.render({}, { slots: {}, emit: () => {} })
    expect(vnode).not.toBeNull()
    expect(vnode.type).toBe('div')
    expect(vnode.props.class).toBe('layout')
  })

  it('resolveLayout 应在目录不存在时返回内置布局', async () => {
    const page = createPageModule()
    const layout = await resolveLayout(page, '/nonexistent/layouts', 'Test')
    expect(layout).not.toBeNull()
    expect(layout.default.name).toBe('DefaultLayout')
  })

  it('页面指定布局名称应被使用', () => {
    const page = createPageModule({ layout: 'custom' })
    const layout = createLayoutModule('CustomLayout')
    const combined = applyLayout(page, layout)
    expect(combined.name).toBe('Layout_CustomLayout')
  })

  it('无布局指定的页面应使用默认布局', () => {
    const page = createPageModule()
    const layout = createLayoutModule('DefaultLayout')
    const combined = applyLayout(page, layout)
    expect(combined.name).toBe('Layout_DefaultLayout')
  })
})

// ================================================================
//  页面渲染测试
// ================================================================

describe('LytX - 页面渲染', () => {
  const { renderPageWithModules, simpleRenderToString, generateHTMLDocument } = require('../src/renderer')
  const { createPageModule, createLayoutModule } = require('../src/loader')
  const { getDefaultConfig } = require('../src/config')

  it('simpleRenderToString 应渲染简单元素', () => {
    const vnode = {
      type: 'div',
      props: { class: 'test', id: 'app' },
      children: 'Hello World',
      shapeFlag: 8,
    }
    const html = simpleRenderToString(vnode)
    expect(html).toContain('<div')
    expect(html).toContain('class="test"')
    expect(html).toContain('id="app"')
    expect(html).toContain('Hello World')
    expect(html).toContain('</div>')
  })

  it('simpleRenderToString 应渲染嵌套元素', () => {
    const vnode = {
      type: 'div',
      props: null,
      children: [
        {
          type: 'h1',
          props: null,
          children: 'Title',
          shapeFlag: 8,
        },
        {
          type: 'p',
          props: null,
          children: 'Content',
          shapeFlag: 8,
        },
      ],
      shapeFlag: 16,
    }
    const html = simpleRenderToString(vnode)
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<p>Content</p>')
  })

  it('simpleRenderToString 应渲染自闭合标签', () => {
    const vnode = {
      type: 'img',
      props: { src: 'test.png', alt: 'test' },
      children: null,
      shapeFlag: 0,
    }
    const html = simpleRenderToString(vnode)
    expect(html).toBe('<img src="test.png" alt="test" />')
  })

  it('simpleRenderToString 应转义 HTML 特殊字符', () => {
    const vnode = {
      type: 'div',
      props: null,
      children: '<script>alert("xss")</script>',
      shapeFlag: 8,
    }
    const html = simpleRenderToString(vnode)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('simpleRenderToString 应处理 null vnode', () => {
    const html = simpleRenderToString(null)
    expect(html).toBe('')
  })

  it('generateHTMLDocument 应生成完整 HTML', () => {
    const config = getDefaultConfig()
    const html = generateHTMLDocument('Test', '<div>Body</div>', config, 'A description')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html lang="zh-CN">')
    expect(html).toContain('<head>')
    expect(html).toContain('<meta charset="utf-8" />')
    expect(html).toContain('<meta name="description"')
    expect(html).toContain('A description')
    expect(html).toContain('<title>Test - LytX App</title>')
    expect(html).toContain('<body>')
    expect(html).toContain('<div>Body</div>')
    expect(html).toContain('</html>')
  })

  it('renderPageWithModules 应生成完整页面 HTML', () => {
    const page = createPageModule({ title: 'My Page', description: 'Page desc' })
    const layout = createLayoutModule('MyLayout')
    const config = getDefaultConfig()

    const html = renderPageWithModules(page, layout, config)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('My Page')
    expect(html).toContain('Page desc')
  })

  it('SSR 模式渲染应包含页面标题', () => {
    const page = createPageModule({ title: 'SSR Page' })
    const layout = createLayoutModule('SSRLayout')
    const config = getDefaultConfig()
    config.mode = 'ssr'

    const html = renderPageWithModules(page, layout, config)
    expect(html).toContain('SSR Page')
  })
})

// ================================================================
//  SSG 构建测试
// ================================================================

describe('LytX - SSG 构建', () => {
  const { buildStatic } = require('../src/renderer')
  const { getDefaultConfig } = require('../src/config')
  const fs = require('node:fs')
  const path = require('node:path')
  const os = require('node:os')

  let tmpDir: string
  let pagesDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lytx-ssg-'))
    pagesDir = path.join(tmpDir, 'src', 'pages')
    fs.mkdirSync(pagesDir, { recursive: true })
  })

  it('应生成静态 HTML 文件', async () => {
    fs.writeFileSync(path.join(pagesDir, 'index.ts'), '')
    fs.writeFileSync(path.join(pagesDir, 'about.ts'), '')

    const config = getDefaultConfig()
    config.outDir = 'dist'

    const routes = [
      { path: '/', filePath: 'index.ts', isIndex: true, is404: false },
      { path: '/about', filePath: 'about.ts', is404: false },
    ]

    const pages = await buildStatic(routes, config, tmpDir)

    expect(pages.length).toBe(2)
    expect(fs.existsSync(path.join(tmpDir, 'dist', 'index.html'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'dist', 'about', 'index.html'))).toBe(true)
  })

  it('应跳过动态路由', async () => {
    fs.mkdirSync(path.join(pagesDir, 'blog'), { recursive: true })
    fs.writeFileSync(path.join(pagesDir, 'blog', '[slug].ts'), '')

    const config = getDefaultConfig()
    config.outDir = 'dist'

    const routes = [
      { path: '/blog/:slug', filePath: 'blog/[slug].ts', params: ['slug'], isCatchAll: false, is404: false },
    ]

    const pages = await buildStatic(routes, config, tmpDir)
    expect(pages.length).toBe(0)
  })

  it('应生成 404.html', async () => {
    fs.writeFileSync(path.join(pagesDir, '404.ts'), '')

    const config = getDefaultConfig()
    config.outDir = 'dist'

    const routes = [
      { path: '/404', filePath: '404.ts', is404: true },
    ]

    const pages = await buildStatic(routes, config, tmpDir)
    expect(pages.length).toBe(1)
    expect(fs.existsSync(path.join(tmpDir, 'dist', '404.html'))).toBe(true)
  })

  it('生成的 HTML 应包含完整文档结构', async () => {
    fs.writeFileSync(path.join(pagesDir, 'index.ts'), '')

    const config = getDefaultConfig()
    config.outDir = 'dist'

    const routes = [
      { path: '/', filePath: 'index.ts', isIndex: true, is404: false },
    ]

    await buildStatic(routes, config, tmpDir)

    const html = fs.readFileSync(path.join(tmpDir, 'dist', 'index.html'), 'utf-8')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })
})

// ================================================================
//  SPA 构建测试
// ================================================================

describe('LytX - SPA 构建', () => {
  const { buildSPA } = require('../src/renderer')
  const { getDefaultConfig } = require('../src/config')
  const fs = require('node:fs')
  const path = require('node:path')
  const os = require('node:os')

  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lytx-spa-'))
  })

  it('应生成 index.html 和 manifest.json', async () => {
    const config = getDefaultConfig()
    config.outDir = 'dist'

    const routes = [
      { path: '/', filePath: 'index.ts', isIndex: true },
      { path: '/about', filePath: 'about.ts' },
    ]

    const manifest = await buildSPA(routes, config, tmpDir)

    expect(fs.existsSync(path.join(tmpDir, 'dist', 'index.html'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'dist', 'manifest.json'))).toBe(true)
    expect(manifest.routes.length).toBe(2)
  })

  it('manifest 应包含正确的路由信息', async () => {
    const config = getDefaultConfig()
    config.outDir = 'dist'
    config.base = '/app'

    const routes = [
      { path: '/', filePath: 'index.ts', isIndex: true },
      { path: '/blog/:slug', filePath: 'blog/[slug].ts', params: ['slug'] },
    ]

    const manifest = await buildSPA(routes, config, tmpDir)

    expect(manifest.base).toBe('/app')
    expect(manifest.routes[0].path).toBe('/')
    expect(manifest.routes[1].path).toBe('/blog/:slug')
    expect(manifest.routes[1].params).toEqual(['slug'])
  })

  it('SPA HTML 应包含 app 挂载点和路由清单', async () => {
    const config = getDefaultConfig()
    config.outDir = 'dist'

    const routes = [
      { path: '/', filePath: 'index.ts', isIndex: true },
    ]

    await buildSPA(routes, config, tmpDir)

    const html = fs.readFileSync(path.join(tmpDir, 'dist', 'index.html'), 'utf-8')
    expect(html).toContain('<div id="app"></div>')
    expect(html).toContain('__LYT_ROUTES__')
  })
})

// ================================================================
//  CLI 参数解析测试
// ================================================================

describe('LytX - CLI 参数解析', () => {
  const { parseArgs } = require('../src/cli')

  it('应解析 dev 命令', () => {
    const args = parseArgs(['dev'])
    expect(args.command).toBe('dev')
  })

  it('应解析 build 命令', () => {
    const args = parseArgs(['build'])
    expect(args.command).toBe('build')
  })

  it('应解析 preview 命令', () => {
    const args = parseArgs(['preview'])
    expect(args.command).toBe('preview')
  })

  it('应解析自定义根目录', () => {
    const args = parseArgs(['dev', '/my/project'])
    // rootDir 会被转换为绝对路径，我们只需要验证它包含我们的路径
    expect(args.rootDir).toContain('my')
    expect(args.rootDir).toContain('project')
  })

  it('应解析 --port 参数', () => {
    const args = parseArgs(['dev', '/project', '--port', '8080'])
    expect(args.port).toBe(8080)
  })

  it('应解析 --host 参数', () => {
    const args = parseArgs(['dev', '/project', '--host', '0.0.0.0'])
    expect(args.host).toBe('0.0.0.0')
  })

  it('默认命令应为 dev', () => {
    const args = parseArgs([])
    expect(args.command).toBe('dev')
  })

  it('应同时解析 port 和 host', () => {
    const args = parseArgs(['dev', '/project', '--port', '3000', '--host', '127.0.0.1'])
    expect(args.port).toBe(3000)
    expect(args.host).toBe('127.0.0.1')
  })
})

// ================================================================
//  页面加载器测试
// ================================================================

describe('LytX - 页面加载器', () => {
  const { createPageModule, createLayoutModule } = require('../src/loader')

  it('createPageModule 应创建默认页面模块', () => {
    const page = createPageModule()
    expect(page.default).toBeDefined()
    expect(page.default.name).toBe('TestPage')
    expect(page.title).toBeUndefined()
    expect(page.layout).toBeUndefined()
  })

  it('createPageModule 应接受自定义属性', () => {
    const page = createPageModule({
      title: 'Custom Title',
      description: 'Custom Desc',
      layout: 'custom',
    })
    expect(page.title).toBe('Custom Title')
    expect(page.description).toBe('Custom Desc')
    expect(page.layout).toBe('custom')
  })

  it('createLayoutModule 应创建默认布局模块', () => {
    const layout = createLayoutModule()
    expect(layout.default).toBeDefined()
    expect(layout.default.name).toBe('TestLayout')
  })

  it('createLayoutModule 应接受自定义名称', () => {
    const layout = createLayoutModule('MyLayout')
    expect(layout.default.name).toBe('MyLayout')
  })

  it('createLayoutModule 应接受自定义渲染函数', () => {
    const customRender = () => ({ type: 'section', props: null, children: 'custom' })
    const layout = createLayoutModule('Custom', customRender)
    const vnode = layout.default.render({}, { slots: {}, emit: () => {} })
    expect(vnode.type).toBe('section')
  })
})
