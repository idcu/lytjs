/**
 * @lytjs/plugin-registry — 完整单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 测试插件注册表功能。
 *
 * 测试覆盖：
 *   1. PluginRegistry 构造函数
 *   2. register 注册插件
 *   3. register 重复名称抛错
 *   4. unregister 注销插件
 *   5. get 获取指定插件
 *   6. search 搜索插件
 *   7. list 获取所有插件
 *   8. list 按分类过滤
 *   9. listByAuthor 按作者过滤
 *  10. getCategories 分类统计
 *  11. has 检查插件是否存在
 *  12. size 获取插件总数
 *  13. getNames 获取所有插件名称
 *  14. BUILT_IN_PLUGINS 内置插件清单
 *  15. createDefaultRegistry 创建默认注册表
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '../../test-utils/src/index'

import { PluginRegistry } from '../src/registry'
import { BUILT_IN_PLUGINS, createDefaultRegistry } from '../src/built-in-plugins'

// ================================================================
//  辅助函数
// ================================================================

function createTestManifest(overrides: any = {}) {
  return {
    name: '@lytjs/test-plugin',
    version: '1.0.0',
    description: '测试插件',
    author: 'tester',
    keywords: ['test', 'plugin'],
    license: 'MIT',
    main: 'dist/index.mjs',
    lytjsVersion: '>=5.0.1',
    category: 'tool',
    ...overrides,
  }
}

// ================================================================
//  1. PluginRegistry 构造函数
// ================================================================

describe('PluginRegistry 构造函数', () => {

  it('无参数创建空注册表', () => {
    const registry = new PluginRegistry()
    expect(registry.size).toBe(0)
  })

  it('传入初始插件列表', () => {
    const plugins = [
      createTestManifest({ name: 'plugin-a' }),
      createTestManifest({ name: 'plugin-b' }),
    ]
    const registry = new PluginRegistry(plugins)
    expect(registry.size).toBe(2)
  })
})

// ================================================================
//  2. register 注册插件
// ================================================================

describe('register 注册插件', () => {

  it('成功注册插件', () => {
    const registry = new PluginRegistry()
    const manifest = createTestManifest()
    registry.register(manifest)
    expect(registry.size).toBe(1)
    expect(registry.has('@lytjs/test-plugin')).toBe(true)
  })

  it('注册时自动添加 createdAt 和 updatedAt', () => {
    const registry = new PluginRegistry()
    const manifest = createTestManifest()
    registry.register(manifest)
    const plugin = registry.get('@lytjs/test-plugin')
    expect(plugin!.createdAt).toBeDefined()
    expect(plugin!.updatedAt).toBeDefined()
  })

  it('保留已有的 createdAt', () => {
    const registry = new PluginRegistry()
    const timestamp = Date.now() - 100000
    const manifest = createTestManifest({ createdAt: timestamp })
    registry.register(manifest)
    const plugin = registry.get('@lytjs/test-plugin')
    expect(plugin!.createdAt).toBe(timestamp)
  })
})

// ================================================================
//  3. register 重复名称抛错
// ================================================================

describe('register 重复名称抛错', () => {

  it('重复注册同名插件抛出错误', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest())
    expect(() => {
      registry.register(createTestManifest())
    }).toThrow()
  })
})

// ================================================================
//  4. unregister 注销插件
// ================================================================

describe('unregister 注销插件', () => {

  it('成功注销已注册的插件', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest())
    const result = registry.unregister('@lytjs/test-plugin')
    expect(result).toBe(true)
    expect(registry.size).toBe(0)
  })

  it('注销不存在的插件返回 false', () => {
    const registry = new PluginRegistry()
    const result = registry.unregister('nonexistent')
    expect(result).toBe(false)
  })
})

// ================================================================
//  5. get 获取指定插件
// ================================================================

describe('get 获取指定插件', () => {

  it('获取已注册的插件', () => {
    const registry = new PluginRegistry()
    const manifest = createTestManifest()
    registry.register(manifest)
    const plugin = registry.get('@lytjs/test-plugin')
    expect(plugin).toBeDefined()
    expect(plugin!.name).toBe('@lytjs/test-plugin')
    expect(plugin!.version).toBe('1.0.0')
  })

  it('获取不存在的插件返回 undefined', () => {
    const registry = new PluginRegistry()
    const plugin = registry.get('nonexistent')
    expect(plugin).toBeUndefined()
  })
})

// ================================================================
//  6. search 搜索插件
// ================================================================

describe('search 搜索插件', () => {

  it('按名称搜索', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest({ name: '@lytjs/plugin-chart' }))
    registry.register(createTestManifest({ name: '@lytjs/plugin-auth' }))
    const results = registry.search('chart')
    expect(results.length).toBe(1)
    expect(results[0].name).toBe('@lytjs/plugin-chart')
  })

  it('按描述搜索', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest({
      name: 'plugin-a',
      description: '图表可视化插件',
    }))
    registry.register(createTestManifest({
      name: 'plugin-b',
      description: '认证授权插件',
    }))
    const results = registry.search('图表')
    expect(results.length).toBe(1)
    expect(results[0].name).toBe('plugin-a')
  })

  it('按关键词搜索', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest({
      name: 'plugin-a',
      keywords: ['chart', 'visualization'],
    }))
    registry.register(createTestManifest({
      name: 'plugin-b',
      keywords: ['auth', 'login'],
    }))
    const results = registry.search('visualization')
    expect(results.length).toBe(1)
    expect(results[0].name).toBe('plugin-a')
  })

  it('按作者搜索', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest({
      name: 'plugin-a',
      author: 'Alice',
    }))
    registry.register(createTestManifest({
      name: 'plugin-b',
      author: 'Bob',
    }))
    const results = registry.search('Alice')
    expect(results.length).toBe(1)
    expect(results[0].name).toBe('plugin-a')
  })

  it('搜索不区分大小写', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest({ name: '@lytjs/PLUGIN-TEST' }))
    const results = registry.search('plugin-test')
    expect(results.length).toBe(1)
  })

  it('无匹配结果返回空数组', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest())
    const results = registry.search('nonexistent')
    expect(results).toEqual([])
  })
})

// ================================================================
//  7. list 获取所有插件
// ================================================================

describe('list 获取所有插件', () => {

  it('返回所有已注册的插件', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest({ name: 'a' }))
    registry.register(createTestManifest({ name: 'b' }))
    registry.register(createTestManifest({ name: 'c' }))
    const all = registry.list()
    expect(all.length).toBe(3)
  })
})

// ================================================================
//  8. list 按分类过滤
// ================================================================

describe('list 按分类过滤', () => {

  it('按分类过滤返回匹配的插件', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest({ name: 'a', category: 'tool' }))
    registry.register(createTestManifest({ name: 'b', category: 'ui' }))
    registry.register(createTestManifest({ name: 'c', category: 'tool' }))
    const tools = registry.list('tool')
    expect(tools.length).toBe(2)
    const uis = registry.list('ui')
    expect(uis.length).toBe(1)
  })

  it('不存在的分类返回空数组', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest())
    const results = registry.list('nonexistent')
    expect(results).toEqual([])
  })
})

// ================================================================
//  9. listByAuthor 按作者过滤
// ================================================================

describe('listByAuthor 按作者过滤', () => {

  it('按作者过滤返回匹配的插件', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest({ name: 'a', author: 'Alice' }))
    registry.register(createTestManifest({ name: 'b', author: 'Bob' }))
    registry.register(createTestManifest({ name: 'c', author: 'Alice' }))
    const alicePlugins = registry.listByAuthor('Alice')
    expect(alicePlugins.length).toBe(2)
  })

  it('不区分大小写', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest({ name: 'a', author: 'Alice' }))
    const results = registry.listByAuthor('alice')
    expect(results.length).toBe(1)
  })
})

// ================================================================
//  10. getCategories 分类统计
// ================================================================

describe('getCategories 分类统计', () => {

  it('返回分类统计信息', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest({ name: 'a', category: 'tool' }))
    registry.register(createTestManifest({ name: 'b', category: 'tool' }))
    registry.register(createTestManifest({ name: 'c', category: 'tool' }))
    registry.register(createTestManifest({ name: 'd', category: 'ui' }))
    const categories = registry.getCategories()
    expect(categories.length).toBe(2)
    // 按数量降序排列
    expect(categories[0].name).toBe('tool')
    expect(categories[0].count).toBe(3)
    expect(categories[1].name).toBe('ui')
    expect(categories[1].count).toBe(1)
  })

  it('空注册表返回空数组', () => {
    const registry = new PluginRegistry()
    const categories = registry.getCategories()
    expect(categories).toEqual([])
  })
})

// ================================================================
//  11. has 检查插件是否存在
// ================================================================

describe('has 检查插件是否存在', () => {

  it('已注册的插件返回 true', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest())
    expect(registry.has('@lytjs/test-plugin')).toBe(true)
  })

  it('未注册的插件返回 false', () => {
    const registry = new PluginRegistry()
    expect(registry.has('nonexistent')).toBe(false)
  })
})

// ================================================================
//  12. size 获取插件总数
// ================================================================

describe('size 获取插件总数', () => {

  it('返回正确的插件数量', () => {
    const registry = new PluginRegistry()
    expect(registry.size).toBe(0)
    registry.register(createTestManifest({ name: 'a' }))
    expect(registry.size).toBe(1)
    registry.register(createTestManifest({ name: 'b' }))
    expect(registry.size).toBe(2)
    registry.unregister('a')
    expect(registry.size).toBe(1)
  })
})

// ================================================================
//  13. getNames 获取所有插件名称
// ================================================================

describe('getNames 获取所有插件名称', () => {

  it('返回所有已注册插件的名称', () => {
    const registry = new PluginRegistry()
    registry.register(createTestManifest({ name: 'alpha' }))
    registry.register(createTestManifest({ name: 'beta' }))
    registry.register(createTestManifest({ name: 'gamma' }))
    const names = registry.getNames()
    expect(names.sort()).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('空注册表返回空数组', () => {
    const registry = new PluginRegistry()
    expect(registry.getNames()).toEqual([])
  })
})

// ================================================================
//  14. BUILT_IN_PLUGINS 内置插件清单
// ================================================================

describe('BUILT_IN_PLUGINS 内置插件清单', () => {

  it('是数组', () => {
    expect(Array.isArray(BUILT_IN_PLUGINS)).toBe(true)
  })

  it('包含官方插件', () => {
    const names = BUILT_IN_PLUGINS.map(p => p.name)
    expect(names).toContain('@lytjs/plugin-i18n')
    expect(names).toContain('@lytjs/plugin-auth')
    expect(names).toContain('@lytjs/plugin-logger')
    expect(names).toContain('@lytjs/plugin-storage')
    expect(names).toContain('@lytjs/plugin-theme')
    expect(names).toContain('@lytjs/plugin-chart')
    expect(names).toContain('@lytjs/plugin-highlight')
    expect(names).toContain('@lytjs/plugin-virtual-list')
  })

  it('每个插件包含必要字段', () => {
    for (const plugin of BUILT_IN_PLUGINS) {
      expect(plugin.name).toBeDefined()
      expect(plugin.version).toBeDefined()
      expect(plugin.description).toBeDefined()
      expect(plugin.author).toBeDefined()
      expect(plugin.category).toBeDefined()
      expect(plugin.license).toBeDefined()
      expect(plugin.main).toBeDefined()
      expect(plugin.lytjsVersion).toBeDefined()
    }
  })
})

// ================================================================
//  15. createDefaultRegistry 创建默认注册表
// ================================================================

describe('createDefaultRegistry 创建默认注册表', () => {

  it('返回 PluginRegistry 实例', () => {
    const registry = createDefaultRegistry()
    expect(registry).toBeDefined()
    expect(registry instanceof PluginRegistry).toBe(true)
  })

  it('包含所有内置插件', () => {
    const registry = createDefaultRegistry()
    expect(registry.size).toBe(BUILT_IN_PLUGINS.length)
    for (const plugin of BUILT_IN_PLUGINS) {
      expect(registry.has(plugin.name)).toBe(true)
    }
  })

  it('可以通过名称获取内置插件', () => {
    const registry = createDefaultRegistry()
    const i18n = registry.get('@lytjs/plugin-i18n')
    expect(i18n).toBeDefined()
    expect(i18n!.version).toBe('5.0.1')
    expect(i18n!.official).toBe(true)
  })
})
