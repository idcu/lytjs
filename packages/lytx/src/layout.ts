/**
 * LytX - 布局系统
 *
 * 管理页面布局的加载和应用。
 * 默认布局包裹所有页面，页面可以通过 `export const layout = 'custom'` 指定不同布局。
 *
 * 纯原生零依赖实现。
 */

import type { PageModule, LayoutModule, ComponentOptions } from './types'
import { loadLayout } from './loader'

// ================================================================
//  默认布局
// ================================================================

/** 默认布局名称 */
const DEFAULT_LAYOUT_NAME = 'default'

/**
 * 创建内置默认布局
 *
 * 当用户没有定义 default 布局时，使用此内置布局。
 * 生成基本的 HTML 文档结构。
 *
 * @param siteTitle 站点标题
 * @returns 默认布局模块
 */
function createBuiltinDefaultLayout(siteTitle: string = 'LytX App'): LayoutModule {
  return {
    default: {
      name: 'DefaultLayout',
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
                  type: 'meta',
                  props: { charset: 'utf-8' },
                  children: null,
                  key: null,
                  ref: null,
                  shapeFlag: 0,
                  el: null,
                  component: null,
                },
                {
                  type: 'meta',
                  props: { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
                  children: null,
                  key: null,
                  ref: null,
                  shapeFlag: 0,
                  el: null,
                  component: null,
                },
                {
                  type: 'title',
                  props: null,
                  children: siteTitle,
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
    },
  }
}

// ================================================================
//  布局应用
// ================================================================

/**
 * 将页面和布局组合为完整的组件
 *
 * 创建一个新的组件，将页面内容作为默认插槽传入布局。
 *
 * @param page 页面模块
 * @param layout 布局模块
 * @returns 组合后的组件
 */
export function applyLayout(page: PageModule, layout: LayoutModule): ComponentOptions {
  const pageComponent = page.default
  const layoutComponent = layout.default

  return {
    name: `Layout_${layoutComponent.name || 'Anonymous'}`,
    render(_props: any, ctx: any) {
      // 渲染页面内容
      let pageContent: any
      if (typeof pageComponent.render === 'function') {
        pageContent = pageComponent.render({}, ctx)
      } else if (typeof pageComponent === 'function') {
        pageContent = pageComponent({}, ctx)
      } else {
        pageContent = null
      }

      // 创建插槽对象
      const slots = {
        default: () => [pageContent],
      }

      // 使用布局渲染，传入页面作为插槽
      if (typeof layoutComponent.render === 'function') {
        return layoutComponent.render({}, { ...ctx, slots })
      } else if (typeof layoutComponent === 'function') {
        return layoutComponent({}, { ...ctx, slots })
      }

      return pageContent
    },
  }
}

// ================================================================
//  公共 API
// ================================================================

/**
 * 加载布局
 *
 * 根据布局名称从布局目录加载布局模块。
 * 如果未找到指定布局，返回 null。
 *
 * @param layoutsDir 布局目录的绝对路径
 * @param name 布局名称
 * @returns 布局模块，未找到返回 null
 *
 * @example
 *   const layout = await loadLayoutModule('/project/src/layouts', 'default')
 *   if (layout) {
 *     console.log(layout.default.name) // 'DefaultLayout'
 *   }
 */
export async function loadLayoutModule(layoutsDir: string, name: string): Promise<LayoutModule | null> {
  const module = await loadLayout(layoutsDir, name)
  return module as LayoutModule | null
}

/**
 * 获取页面使用的布局
 *
 * 如果页面指定了布局名称，则加载对应布局；
 * 否则尝试加载默认布局；
 * 如果默认布局不存在，使用内置默认布局。
 *
 * @param page 页面模块
 * @param layoutsDir 布局目录
 * @param siteTitle 站点标题（用于内置默认布局）
 * @returns 布局模块
 */
export async function resolveLayout(
  page: PageModule,
  layoutsDir: string,
  siteTitle: string = 'LytX App',
): Promise<LayoutModule> {
  // 页面指定的布局
  const layoutName = page.layout || DEFAULT_LAYOUT_NAME

  // 尝试加载布局文件
  const layout = await loadLayoutModule(layoutsDir, layoutName)
  if (layout) {
    return layout
  }

  // 如果页面指定了自定义布局但未找到，尝试默认布局
  if (layoutName !== DEFAULT_LAYOUT_NAME) {
    const defaultLayout = await loadLayoutModule(layoutsDir, DEFAULT_LAYOUT_NAME)
    if (defaultLayout) {
      return defaultLayout
    }
  }

  // 使用内置默认布局
  return createBuiltinDefaultLayout(siteTitle)
}

/**
 * 创建内置默认布局（用于测试）
 *
 * @param siteTitle 站点标题
 * @returns 默认布局模块
 */
export function createDefaultLayout(siteTitle?: string): LayoutModule {
  return createBuiltinDefaultLayout(siteTitle)
}
