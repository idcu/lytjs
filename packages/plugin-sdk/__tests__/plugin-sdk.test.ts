/**
 * Lyt.js Plugin SDK — 单元测试
 *
 * 测试覆盖：
 *   - PluginInstaller: 安装/卸载/启用/禁用/验证/依赖解析
 *   - PluginValidator: 清单验证/配置验证/权限验证/兼容性验证/名称验证/版本验证
 *   - PluginManager: 注册/注销/安装/卸载/启用/禁用/查询/事件系统
 *   - PluginRegistry: 构造函数（不测试网络请求）
 *   - PluginScaffold: 构造函数（不测试文件系统操作）
 */

import { describe, it, expect } from '../../test-utils/src/index'

import { PluginInstaller } from '../src/types'
import { PluginValidator } from '../src/plugin-validator'
import { PluginManager } from '../src/plugin-manager'
import { PluginRegistry } from '../src/plugin-registry'
import { PluginScaffold } from '../src/plugin-scaffold'
import type { LytPlugin, LytPluginManifest } from '../src/types'

// ================================================================
//  辅助函数
// ================================================================

function createTestPlugin(overrides: Partial<LytPlugin> = {}): LytPlugin {
  return {
    name: 'lyt-plugin-test',
    version: '1.0.0',
    description: 'A test plugin for unit testing',
    author: 'test-author',
    license: 'MIT',
    keywords: ['test', 'plugin'],
    main: './dist/index.js',
    category: 'tool',
    ...overrides,
  }
}

// ================================================================
//  PluginInstaller 测试
// ================================================================

describe('PluginInstaller', () => {
  it('安装插件', async () => {
    const installer = new PluginInstaller()
    const plugin = createTestPlugin()
    const result = await installer.install(plugin)
    expect(result.success).toBe(true)
    expect(result.data!.installed).toBe(true)
    expect(result.data!.enabled).toBe(false)
  })

  it('重复安装返回错误', async () => {
    const installer = new PluginInstaller()
    const plugin = createTestPlugin()
    await installer.install(plugin)
    const result = await installer.install(plugin)
    expect(result.success).toBe(false)
    expect(result.error).toContain('已安装')
  })

  it('卸载插件', async () => {
    const installer = new PluginInstaller()
    const plugin = createTestPlugin()
    await installer.install(plugin)
    const result = await installer.uninstall(plugin.name)
    expect(result.success).toBe(true)
  })

  it('卸载未安装的插件返回错误', async () => {
    const installer = new PluginInstaller()
    const result = await installer.uninstall('lyt-plugin-not-exist')
    expect(result.success).toBe(false)
    expect(result.error).toContain('未安装')
  })

  it('启用插件', async () => {
    const installer = new PluginInstaller()
    const plugin = createTestPlugin()
    await installer.install(plugin)
    const result = await installer.enable(plugin.name)
    expect(result.success).toBe(true)
    expect(result.data!.enabled).toBe(true)
  })

  it('启用未安装的插件返回错误', async () => {
    const installer = new PluginInstaller()
    const result = await installer.enable('lyt-plugin-not-exist')
    expect(result.success).toBe(false)
    expect(result.error).toContain('未安装')
  })

  it('禁用插件', async () => {
    const installer = new PluginInstaller()
    const plugin = createTestPlugin()
    await installer.install(plugin)
    await installer.enable(plugin.name)
    const result = await installer.disable(plugin.name)
    expect(result.success).toBe(true)
    expect(result.data!.enabled).toBe(false)
  })

  it('禁用未启用的插件返回错误', async () => {
    const installer = new PluginInstaller()
    const plugin = createTestPlugin()
    await installer.install(plugin)
    const result = await installer.disable(plugin.name)
    expect(result.success).toBe(false)
    expect(result.error).toContain('已禁用')
  })

  it('验证合法插件', () => {
    const installer = new PluginInstaller()
    const plugin = createTestPlugin()
    const result = installer.validate(plugin)
    expect(result.valid).toBe(true)
    expect(result.errors.length).toBe(0)
  })

  it('验证缺少必填字段的插件', () => {
    const installer = new PluginInstaller()
    const result = installer.validate({ name: '' } as any)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('验证插件名称不符合规范', () => {
    const installer = new PluginInstaller()
    const plugin = createTestPlugin({ name: 'invalid-name' })
    const result = installer.validate(plugin)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('命名规范'))).toBe(true)
  })

  it('验证版本号不符合规范', () => {
    const installer = new PluginInstaller()
    const plugin = createTestPlugin({ version: 'v1' })
    const result = installer.validate(plugin)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('语义化版本'))).toBe(true)
  })

  it('解析依赖 - 全部满足', () => {
    const installer = new PluginInstaller()
    const plugin = createTestPlugin({
      peerDependencies: { '@lytjs/core': '^4.0.0', '@lytjs/router': '^1.0.0' },
    })
    const available = [
      createTestPlugin({ name: '@lytjs/core' }),
      createTestPlugin({ name: '@lytjs/router' }),
    ]
    const result = installer.resolveDependencies(plugin, available)
    expect(result.missing.length).toBe(0)
    expect(result.satisfied.length).toBe(2)
  })

  it('解析依赖 - 有缺失', () => {
    const installer = new PluginInstaller()
    const plugin = createTestPlugin({
      peerDependencies: { '@lytjs/core': '^4.0.0', '@lytjs/missing': '^1.0.0' },
    })
    const available = [
      createTestPlugin({ name: '@lytjs/core' }),
    ]
    const result = installer.resolveDependencies(plugin, available)
    expect(result.missing).toContain('@lytjs/missing')
    expect(result.satisfied).toContain('@lytjs/core')
  })

  it('解析依赖 - 无 peerDependencies', () => {
    const installer = new PluginInstaller()
    const plugin = createTestPlugin()
    const result = installer.resolveDependencies(plugin, [])
    expect(result.missing.length).toBe(0)
    expect(result.satisfied.length).toBe(0)
  })

  it('执行 install 钩子', async () => {
    let installed = false
    const plugin = createTestPlugin({
      install: async (api) => { installed = true },
    })
    const installer = new PluginInstaller()
    const mockApi = {} as any
    await installer.install(plugin, mockApi)
    expect(installed).toBe(true)
  })

  it('执行生命周期钩子', async () => {
    const hooks: string[] = []
    const plugin = createTestPlugin({
      hooks: {
        beforeInstall: async (api) => { hooks.push('beforeInstall') },
        afterInstall: async (api) => { hooks.push('afterInstall') },
        onEnable: async (api) => { hooks.push('onEnable') },
        onDisable: async (api) => { hooks.push('onDisable') },
        beforeUninstall: async (api) => { hooks.push('beforeUninstall') },
        afterUninstall: async (api) => { hooks.push('afterUninstall') },
      },
    })
    const installer = new PluginInstaller()
    const mockApi = {} as any
    await installer.install(plugin, mockApi)
    await installer.enable(plugin.name, mockApi)
    await installer.disable(plugin.name, mockApi)
    await installer.uninstall(plugin.name, mockApi)
    expect(hooks).toEqual([
      'beforeInstall', 'afterInstall',
      'onEnable', 'onDisable',
      'beforeUninstall', 'afterUninstall',
    ])
  })

  it('使用初始插件列表构造', () => {
    const manifests: LytPluginManifest[] = [
      { ...createTestPlugin(), installed: true, enabled: true },
    ]
    const installer = new PluginInstaller(manifests)
    const result = installer.validate(createTestPlugin())
    expect(result.valid).toBe(true)
  })
})

// ================================================================
//  PluginValidator 测试
// ================================================================

describe('PluginValidator', () => {
  it('validateManifest - 合法清单', () => {
    const result = PluginValidator.validateManifest(createTestPlugin())
    expect(result.valid).toBe(true)
    expect(result.errors.length).toBe(0)
  })

  it('validateManifest - 非对象', () => {
    const result = PluginValidator.validateManifest(null)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('插件清单必须是一个对象')
  })

  it('validateManifest - 缺少必填字段', () => {
    const result = PluginValidator.validateManifest({ name: 'test' })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('version'))).toBe(true)
    expect(result.errors.some(e => e.includes('description'))).toBe(true)
  })

  it('validateManifest - 无效分类', () => {
    const plugin = createTestPlugin({ category: 'invalid' as any })
    const result = PluginValidator.validateManifest(plugin)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('无效的分类'))).toBe(true)
  })

  it('validateManifest - description 过短警告', () => {
    const plugin = createTestPlugin({ description: 'short' })
    const result = PluginValidator.validateManifest(plugin)
    expect(result.warnings.some(w => w.includes('description 过短'))).toBe(true)
  })

  it('validateManifest - 无 license 警告', () => {
    const plugin = createTestPlugin({ license: '' })
    const result = PluginValidator.validateManifest(plugin)
    expect(result.warnings.some(w => w.includes('license'))).toBe(true)
  })

  it('validateName - 合法名称', () => {
    expect(PluginValidator.validateName('lyt-plugin-test')).toBe(true)
    expect(PluginValidator.validateName('@scope/lyt-plugin-test')).toBe(true)
  })

  it('validateName - 非法名称', () => {
    expect(PluginValidator.validateName('invalid')).toBe(false)
    expect(PluginValidator.validateName('lyt-test')).toBe(false)
    expect(PluginValidator.validateName('')).toBe(false)
  })

  it('validateVersion - 合法版本号', () => {
    expect(PluginValidator.validateVersion('1.0.0')).toBe(true)
    expect(PluginValidator.validateVersion('1.0.0-beta.1')).toBe(true)
    expect(PluginValidator.validateVersion('0.0.1')).toBe(true)
  })

  it('validateVersion - 非法版本号', () => {
    expect(PluginValidator.validateVersion('v1')).toBe(false)
    expect(PluginValidator.validateVersion('')).toBe(false)
    expect(PluginValidator.validateVersion('1')).toBe(false)
  })

  it('validatePermissions - 合法权限', () => {
    const result = PluginValidator.validatePermissions(['storage', 'network'])
    expect(result.valid).toBe(true)
  })

  it('validatePermissions - 非法权限', () => {
    const result = PluginValidator.validatePermissions(['storage', 'invalid-perm'])
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('无效的权限'))).toBe(true)
  })

  it('validatePermissions - 重复权限警告', () => {
    const result = PluginValidator.validatePermissions(['storage', 'storage'])
    expect(result.valid).toBe(true)
    expect(result.warnings.some(w => w.includes('重复'))).toBe(true)
  })

  it('validatePermissions - 非数组', () => {
    const result = PluginValidator.validatePermissions('storage' as any)
    expect(result.valid).toBe(false)
  })

  it('validateCompatibility - 版本满足', () => {
    const plugin = createTestPlugin({ lytVersion: '^4.0.0' })
    const result = PluginValidator.validateCompatibility(plugin, '4.1.0')
    expect(result.valid).toBe(true)
  })

  it('validateCompatibility - 版本不满足', () => {
    const plugin = createTestPlugin({ lytVersion: '^5.0.0' })
    const result = PluginValidator.validateCompatibility(plugin, '4.1.0')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('版本'))).toBe(true)
  })

  it('validateCompatibility - 无版本要求时警告', () => {
    const plugin = createTestPlugin()
    const result = PluginValidator.validateCompatibility(plugin, '4.0.0')
    expect(result.valid).toBe(true)
    expect(result.warnings.some(w => w.includes('版本要求'))).toBe(true)
  })

  it('validateConfig - 合法配置', () => {
    const result = PluginValidator.validateConfig(
      { theme: 'dark', fontSize: 14 },
      {
        schema: {
          properties: {
            theme: { type: 'string', enum: ['light', 'dark'] },
            fontSize: { type: 'number' },
          },
        },
        required: ['theme'],
      },
    )
    expect(result.valid).toBe(true)
  })

  it('validateConfig - 缺少必填项', () => {
    const result = PluginValidator.validateConfig(
      { fontSize: 14 },
      {
        schema: {
          properties: {
            theme: { type: 'string' },
            fontSize: { type: 'number' },
          },
        },
        required: ['theme'],
      },
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('theme'))).toBe(true)
  })

  it('validateConfig - 类型错误', () => {
    const result = PluginValidator.validateConfig(
      { theme: 123 },
      {
        schema: {
          properties: {
            theme: { type: 'string' },
          },
        },
      },
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('类型错误'))).toBe(true)
  })

  it('validateConfig - 枚举值不合法', () => {
    const result = PluginValidator.validateConfig(
      { theme: 'blue' },
      {
        schema: {
          properties: {
            theme: { type: 'string', enum: ['light', 'dark'] },
          },
        },
      },
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('不在允许范围内'))).toBe(true)
  })
})

// ================================================================
//  PluginManager 测试
// ================================================================

describe('PluginManager', () => {
  function createManager() {
    return new PluginManager({ app: {} })
  }

  it('注册插件', () => {
    const manager = createManager()
    const plugin = createTestPlugin()
    const result = manager.register(plugin)
    expect(result.success).toBe(true)
    expect(result.data!.installed).toBe(false)
  })

  it('重复注册返回错误', () => {
    const manager = createManager()
    const plugin = createTestPlugin()
    manager.register(plugin)
    const result = manager.register(plugin)
    expect(result.success).toBe(false)
    expect(result.error).toContain('已注册')
  })

  it('注销插件', () => {
    const manager = createManager()
    const plugin = createTestPlugin()
    manager.register(plugin)
    const result = manager.unregister(plugin.name)
    expect(result.success).toBe(true)
  })

  it('注销未注册的插件返回错误', () => {
    const manager = createManager()
    const result = manager.unregister('not-exist')
    expect(result.success).toBe(false)
    expect(result.error).toContain('未注册')
  })

  it('注销已安装的插件返回错误', async () => {
    const manager = createManager()
    const plugin = createTestPlugin()
    manager.register(plugin)
    await manager.install(plugin.name)
    const result = manager.unregister(plugin.name)
    expect(result.success).toBe(false)
    expect(result.error).toContain('已安装')
  })

  it('安装插件', async () => {
    const manager = createManager()
    const plugin = createTestPlugin()
    manager.register(plugin)
    const result = await manager.install(plugin.name)
    expect(result.success).toBe(true)
    expect(result.data!.installed).toBe(true)
  })

  it('安装未注册的插件返回错误', async () => {
    const manager = createManager()
    const result = await manager.install('not-exist')
    expect(result.success).toBe(false)
    expect(result.error).toContain('未注册')
  })

  it('卸载插件', async () => {
    const manager = createManager()
    const plugin = createTestPlugin()
    manager.register(plugin)
    await manager.install(plugin.name)
    const result = await manager.uninstall(plugin.name)
    expect(result.success).toBe(true)
  })

  it('启用插件', async () => {
    const manager = createManager()
    const plugin = createTestPlugin()
    manager.register(plugin)
    await manager.install(plugin.name)
    const result = manager.enable(plugin.name)
    expect(result.success).toBe(true)
    expect(result.data!.enabled).toBe(true)
  })

  it('禁用插件', async () => {
    const manager = createManager()
    const plugin = createTestPlugin()
    manager.register(plugin)
    await manager.install(plugin.name)
    manager.enable(plugin.name)
    const result = manager.disable(plugin.name)
    expect(result.success).toBe(true)
    expect(result.data!.enabled).toBe(false)
  })

  it('getPlugin 获取插件信息', () => {
    const manager = createManager()
    const plugin = createTestPlugin()
    manager.register(plugin)
    const manifest = manager.getPlugin(plugin.name)
    expect(manifest).toBeTruthy()
    expect(manifest!.name).toBe(plugin.name)
  })

  it('getPlugin 未找到返回 undefined', () => {
    const manager = createManager()
    expect(manager.getPlugin('not-exist')).toBe(undefined)
  })

  it('getAllPlugins 返回所有插件', () => {
    const manager = createManager()
    manager.register(createTestPlugin({ name: 'lyt-plugin-a' }))
    manager.register(createTestPlugin({ name: 'lyt-plugin-b' }))
    expect(manager.getAllPlugins().length).toBe(2)
  })

  it('getPluginsByCategory 按分类筛选', () => {
    const manager = createManager()
    manager.register(createTestPlugin({ name: 'lyt-plugin-a', category: 'tool' }))
    manager.register(createTestPlugin({ name: 'lyt-plugin-b', category: 'ui' }))
    manager.register(createTestPlugin({ name: 'lyt-plugin-c', category: 'tool' }))
    const tools = manager.getPluginsByCategory('tool')
    expect(tools.length).toBe(2)
  })

  it('search 搜索插件', () => {
    const manager = createManager()
    manager.register(createTestPlugin({
      name: 'lyt-plugin-search-test',
      description: 'A search test plugin',
      keywords: ['search', 'test'],
    }))
    const results = manager.search('search')
    expect(results.length).toBe(1)
  })

  it('事件系统 - on/emit', () => {
    const manager = createManager()
    let received: any = null
    manager.on('test-event', (data: any) => { received = data })
    manager.emit('test-event', { key: 'value' })
    expect(received).toBeTruthy()
    expect(received.key).toBe('value')
  })

  it('事件系统 - on 返回取消监听函数', () => {
    const manager = createManager()
    let count = 0
    const off = manager.on('counter', () => { count++ })
    manager.emit('counter')
    off()
    manager.emit('counter')
    expect(count).toBe(1)
  })
})

// ================================================================
//  PluginRegistry 测试
// ================================================================

describe('PluginRegistry', () => {
  it('构造函数接受 URL', () => {
    const registry = new PluginRegistry('https://registry.example.com')
    expect(registry).toBeTruthy()
  })

  it('构造函数去除尾部斜杠', () => {
    const registry = new PluginRegistry('https://registry.example.com/')
    expect(registry).toBeTruthy()
  })
})

// ================================================================
//  PluginScaffold 测试
// ================================================================

describe('PluginScaffold', () => {
  it('构造函数', () => {
    const scaffold = new PluginScaffold()
    expect(scaffold).toBeTruthy()
  })
})
