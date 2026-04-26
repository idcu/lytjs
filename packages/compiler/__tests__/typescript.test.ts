/**
 * Lyt.js TypeScript 类型声明生成器测试
 *
 * 测试 generateTypeDeclarations、generateDtsForLytFile 等功能
 */

import { describe, it, expect } from '../../test-utils/src/index'
import {
  generateTypeDeclarations,
  generateDtsForLytFile,
  createTypePlugin,
} from '../src/typescript'
import { parseSFC } from '../src/sfc/parse-sfc'

// ================================================================
//  测试用例
// ================================================================

describe('TypeScript 类型声明生成器', () => {
  // ---- 1. 基本 SFC 类型声明生成测试 ----
  it('基本 SFC 类型声明生成', () => {
    const sfc = parseSFC(`
      <template>
        <div>{{ title }}</div>
      </template>
      <script>
        export default {
          props: {
            title: { type: String, default: 'Hello' },
            count: { type: Number, required: true },
          },
          emits: ['click', 'update:count'],
        }
      </script>
    `, 'TestComponent.lyt')

    const types = generateTypeDeclarations(sfc, { filename: 'TestComponent.lyt' })

    expect(typeof types).toBe('string')
    expect(types).toContain('ComponentProps')
    expect(types).toContain('ComponentEmits')
    expect(types).toContain('ComponentDefine')
  })

  // ---- 2. generateDtsForLytFile 测试 ----
  it('generateDtsForLytFile 直接处理文件内容', () => {
    const content = `
      <template>
        <button @click="onClick">{{ label }}</button>
      </template>
      <script>
        export default {
          props: {
            label: { type: String, required: true },
            size: { type: String, default: 'medium' },
          },
          emits: ['click'],
        }
      </script>
    `

    const dts = generateDtsForLytFile(content, 'Button.lyt')

    expect(typeof dts).toBe('string')
    expect(dts).toContain('Button')
    expect(dts).toContain('ComponentProps')
  })

  // ---- 3. 空 SFC 测试 ----
  it('空 SFC 生成默认类型', () => {
    const sfc = parseSFC('', 'EmptyComponent.lyt')
    const types = generateTypeDeclarations(sfc, { filename: 'EmptyComponent.lyt' })

    expect(typeof types).toBe('string')
    expect(types).toContain('[key: string]: any')
  })

  // ---- 4. 仅包含 template 的 SFC 测试 ----
  it('仅 template 的 SFC', () => {
    const sfc = parseSFC(`
      <template>
        <div>Hello World</div>
      </template>
    `, 'TemplateOnly.lyt')

    const types = generateTypeDeclarations(sfc)
    expect(typeof types).toBe('string')
  })

  // ---- 5. 包含 style 的 SFC 测试 ----
  it('包含 style 的 SFC', () => {
    const sfc = parseSFC(`
      <template>
        <div class="container">Styled</div>
      </template>
      <style>
        .container { color: red; }
      </style>
    `, 'StyledComponent.lyt')

    const types = generateTypeDeclarations(sfc)
    expect(typeof types).toBe('string')
  })

  // ---- 6. createTypePlugin 工厂函数测试 ----
  it('createTypePlugin 创建插件配置', () => {
    const plugin = createTypePlugin()

    expect(plugin).toBeDefined()
    expect(plugin.name).toBe('lytjs-types')
    expect(typeof plugin.transform).toBe('function')
  })

  // ---- 7. 插件 transform 方法测试 ----
  it('插件 transform 方法处理 .lyt 文件', () => {
    const plugin = createTypePlugin()
    const testContent = `
      <template>
        <div>Test</div>
      </template>
    `

    const result = plugin.transform(testContent, 'Test.lyt')

    expect(result).toBeDefined()
    expect(result.code).toBe(testContent)
    expect(result.map).toBeNull()
    expect(typeof result.dts).toBe('string')
  })

  // ---- 8. 插件忽略非 .lyt 文件 ----
  it('插件忽略非 .lyt 文件', () => {
    const plugin = createTypePlugin()
    const result = plugin.transform('const x = 1', 'test.ts')

    expect(result).toBeNull()
  })

  // ---- 9. scoped style 类型声明测试 ----
  it('scoped style 不影响类型生成', () => {
    const sfc = parseSFC(`
      <template>
        <div class="scoped-component">Scoped</div>
      </template>
      <style scoped>
        .scoped-component { color: blue; }
      </style>
    `, 'ScopedComponent.lyt')

    const types = generateTypeDeclarations(sfc)
    expect(typeof types).toBe('string')
  })

  // ---- 10. 类型声明格式验证 ----
  it('生成的类型声明格式正确', () => {
    const sfc = parseSFC(`
      <template><div>Format</div></template>
      <script>
        export default {
          props: { foo: String, bar: Number },
        }
      </script>
    `, 'FormatTest.lyt')

    const types = generateTypeDeclarations(sfc)

    // 验证基本结构
    expect(types).toContain('export interface ComponentProps')
    expect(types).toContain('export interface ComponentEmits')
    expect(types).toContain('declare const component')
    expect(types).toContain('export default component')

    // 验证有注释
    expect(types).toContain('/**')
    expect(types).toContain('*/')
  })
})

// ================================================================
//  集成测试
// ================================================================

describe('类型声明生成器集成测试', () => {
  it('完整工作流程测试', () => {
    // 1. 定义 SFC 内容
    const sfcContent = `
      <template>
        <div class="user-card">
          <h2>{{ name }}</h2>
          <p>Age: {{ age }}</p>
          <button @click="onEdit">Edit</button>
        </div>
      </template>

      <script>
        export default {
          name: 'UserCard',
          props: {
            name: { type: String, required: true },
            age: { type: Number, required: true },
            isAdmin: { type: Boolean, default: false },
          },
          emits: ['edit', 'delete'],
          state() {
            return { isEditing: false }
          },
        }
      </script>

      <style scoped>
        .user-card { border: 1px solid #ccc; padding: 16px; }
      </style>
    `

    // 2. 生成类型声明
    const dts = generateDtsForLytFile(sfcContent, 'UserCard.lyt')

    // 3. 验证
    expect(typeof dts).toBe('string')
    expect(dts).toContain('UserCard')
    expect(dts).toContain('ComponentProps')
    expect(dts).toContain('ComponentEmits')
  })
})
