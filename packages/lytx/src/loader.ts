/**
 * LytX - 页面/模块加载器
 *
 * 从文件系统加载页面模块，支持动态 import。
 * 在测试环境中使用模拟加载。
 *
 * 纯原生零依赖实现。
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { PageModule, ComponentOptions, HeadConfig } from './types'

// ================================================================
//  模块缓存
// ================================================================

/** 页面模块缓存 */
const pageCache = new Map<string, PageModule>()

/** 布局模块缓存 */
const layoutCache = new Map<string, any>()

// ================================================================
//  文件内容解析
// ================================================================

/**
 * 从文件内容解析页面模块
 *
 * 使用简单的正则解析提取导出的组件和元数据。
 * 在实际生产环境中，应使用动态 import。
 *
 * @param content 文件内容
 * @returns 页面模块
 */
function parsePageModule(content: string): PageModule {
  // 移除注释
  const cleaned = content
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')

  // 提取 export const layout = 'xxx'
  const layoutMatch = cleaned.match(/export\s+const\s+layout\s*=\s*['"]([^'"]+)['"]/)
  const layout = layoutMatch ? layoutMatch[1] : undefined

  // 提取 export const title = 'xxx'
  const titleMatch = cleaned.match(/export\s+const\s+title\s*=\s*['"]([^'"]+)['"]/)
  const title = titleMatch ? titleMatch[1] : undefined

  // 提取 export const description = 'xxx'
  const descMatch = cleaned.match(/export\s+const\s+description\s*=\s*['"]([^'"]+)['"]/)
  const description = descMatch ? descMatch[1] : undefined

  // 创建默认组件（简单渲染函数）
  const defaultComponent: ComponentOptions = {
    name: 'Page',
    render() {
      return {
        type: 'div',
        props: { id: 'page' },
        children: title || 'Page',
        key: null,
        ref: null,
        shapeFlag: 8, // TEXT_CHILDREN
        el: null,
        component: null,
      }
    },
  }

  return {
    default: defaultComponent,
    layout,
    title,
    description,
  }
}

/**
 * 从文件内容解析布局模块
 *
 * @param content 文件内容
 * @returns 布局模块
 */
function parseLayoutModule(content: string): any {
  // 移除注释
  const cleaned = content
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')

  // 提取布局名称
  const nameMatch = cleaned.match(/export\s+const\s+name\s*=\s*['"]([^'"]+)['"]/)
  const layoutName = nameMatch ? nameMatch[1] : 'Layout'

  // 创建默认布局组件
  const defaultComponent: ComponentOptions = {
    name: layoutName,
    render(_props: any, ctx: any) {
      const slots = ctx?.slots || {}
      const defaultSlot = typeof slots.default === 'function' ? slots.default() : null

      return {
        type: 'html',
        props: { lang: 'zh-CN' },
        children: [
          {
            type: 'head',
            props: null,
            children: [
              {
                type: 'title',
                props: null,
                children: layoutName,
                key: null,
                ref: null,
                shapeFlag: 8,
                el: null,
                component: null,
              },
            ],
            key: null,
            ref: null,
            shapeFlag: 16,
            el: null,
            component: null,
          },
          {
            type: 'body',
            props: null,
            children: defaultSlot || [],
            key: null,
            ref: null,
            shapeFlag: 16,
            el: null,
            component: null,
          },
        ],
        key: null,
        ref: null,
        shapeFlag: 16,
        el: null,
        component: null,
      }
    },
  }

  return {
    default: defaultComponent,
  }
}

// ================================================================
//  公共 API
// ================================================================

/**
 * 加载页面模块
 *
 * 从指定文件路径加载页面模块，支持缓存。
 *
 * @param filePath 页面文件的绝对路径
 * @returns 页面模块
 *
 * @example
 *   const page = await loadPage('/project/src/pages/index.ts')
 *   console.log(page.default.name) // 'Page'
 *   console.log(page.title) // '首页'
 */
export async function loadPage(filePath: string): Promise<PageModule> {
  // 检查缓存
  if (pageCache.has(filePath)) {
    return pageCache.get(filePath)!
  }

  // 读取文件内容
  if (!fs.existsSync(filePath)) {
    throw new Error(`页面文件不存在: ${filePath}`)
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const module = parsePageModule(content)

  // 写入缓存
  pageCache.set(filePath, module)

  return module
}

/**
 * 加载布局模块
 *
 * @param layoutsDir 布局目录的绝对路径
 * @param name 布局名称
 * @returns 布局模块，未找到返回 null
 */
export async function loadLayout(layoutsDir: string, name: string): Promise<any | null> {
  const cacheKey = `${layoutsDir}:${name}`

  // 检查缓存
  if (layoutCache.has(cacheKey)) {
    return layoutCache.get(cacheKey)
  }

  // 尝试多种文件名格式
  const possibleFiles = [
    path.join(layoutsDir, `${name}.ts`),
    path.join(layoutsDir, `${name}.js`),
    path.join(layoutsDir, `${name}/index.ts`),
    path.join(layoutsDir, `${name}/index.js`),
  ]

  for (const file of possibleFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8')
      const module = parseLayoutModule(content)
      layoutCache.set(cacheKey, module)
      return module
    }
  }

  return null
}

/**
 * 清除模块缓存
 */
export function clearCache(): void {
  pageCache.clear()
  layoutCache.clear()
}

/**
 * 创建页面模块（用于测试，不依赖文件系统）
 *
 * @param page 部分页面模块属性
 * @returns 完整的页面模块
 */
export function createPageModule(page: Partial<PageModule> = {}): PageModule {
  return {
    default: page.default || {
      name: 'TestPage',
      render() {
        return {
          type: 'div',
          props: null,
          children: page.title || 'TestPage',
          key: null,
          ref: null,
          shapeFlag: 8,
          el: null,
          component: null,
        }
      },
    },
    layout: page.layout,
    title: page.title,
    description: page.description,
    head: page.head,
    loader: page.loader,
  }
}

/**
 * 创建布局模块（用于测试，不依赖文件系统）
 *
 * @param name 布局名称
 * @param renderFn 自定义渲染函数
 * @returns 布局模块
 */
export function createLayoutModule(name: string = 'TestLayout', renderFn?: any): any {
  return {
    default: {
      name,
      render: renderFn || ((_props: any, ctx: any) => {
        const slots = ctx?.slots || {}
        const defaultSlot = typeof slots.default === 'function' ? slots.default() : null
        return {
          type: 'div',
          props: { class: 'layout' },
          children: defaultSlot || [],
          key: null,
          ref: null,
          shapeFlag: 16,
          el: null,
          component: null,
        }
      }),
    },
  }
}
