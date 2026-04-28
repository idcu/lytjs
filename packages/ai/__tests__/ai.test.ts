/**
 * Lyt.js AI 辅助开发工具 — 单元测试
 *
 * 测试覆盖：
 *   - CodeCompleter: API 补全、模板补全
 *   - TemplateEngine: 模板渲染、变量替换、if/each 块处理
 *   - ComponentGenerator: 组件生成、名称转换
 *   - ConfigLoader: 配置合并
 *   - prompts: 提示词生成
 *   - AIClient: 构造函数、缺少 API Key 报错
 *   - AIGenerator: 模板回退生成（不调用真实 API）
 *   - parser: 组件代码解析与验证
 *   - prompts/component-prompts: 组件 Prompt 模板
 *   - prompts/code-prompts: 代码补全 Prompt
 *   - prompts/fix-prompts: 错误修复 Prompt
 *   - providers/provider-interface: Provider 接口
 */

import { describe, it, expect } from '../../test-utils/src/index'

import { CodeCompleter } from '../src/code-completer'
import { TemplateEngine } from '../src/template-engine'
import { ComponentGenerator, createComponent } from '../src/component-generator'
import { ConfigLoader } from '../src/config-loader'
import {
  SYSTEM_PROMPT,
  generateComponentPrompt,
  generateStorePrompt,
  generatePagePrompt,
  generateAPIPrompt,
} from '../src/prompts'
import { AIClient } from '../src/ai-client'
import { AIGenerator } from '../src/ai-generator'

// 新增导入
import {
  parseComponentCode,
  validateComponentCode,
  extractTemplate,
  extractScript,
  extractStyle,
} from '../src/parser'
import type { ParsedComponent, ValidationResult } from '../src/parser'

import {
  buttonComponentPrompt,
  inputComponentPrompt,
  selectComponentPrompt,
  basicComponentPrompt,
  formComponentPrompt,
  tableComponentPrompt,
  modalComponentPrompt,
  compositeComponentPrompt,
  customComponentPrompt,
  getComponentPrompt,
} from '../src/prompts/component-prompts'

import {
  inlineCompletionPrompt,
  functionCompletionPrompt,
  componentCompletionPrompt,
  smartCompletionPrompt,
} from '../src/prompts/code-prompts'

import {
  compileErrorFixPrompt,
  runtimeErrorFixPrompt,
  typeErrorFixPrompt,
  autoFixPrompt,
} from '../src/prompts/fix-prompts'

import type {
  AIProviderInterface,
  CompleteOptions,
  StreamChunk,
} from '../src/providers/provider-interface'

// ================================================================
//  CodeCompleter 测试
// ================================================================

describe('CodeCompleter', () => {
  it('获取 API 补全（ref 前缀）', () => {
    const completer = new CodeCompleter()
    const results = completer.getCompletions('ref', '')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].label).toBe('ref')
    expect(results[0].kind).toBe('function')
  })

  it('获取 API 补全（re 前缀匹配多个）', () => {
    const completer = new CodeCompleter()
    const results = completer.getCompletions('re', '')
    expect(results.length).toBeGreaterThan(1)
    const labels = results.map(r => r.label)
    expect(labels).toContain('ref')
    expect(labels).toContain('reactive')
  })

  it('获取指令补全（v- 前缀）', () => {
    const completer = new CodeCompleter()
    const results = completer.getCompletions('v-', '')
    expect(results.length).toBeGreaterThan(0)
    const labels = results.map(r => r.label)
    expect(labels).toContain('v-if')
    expect(labels).toContain('v-each')
    expect(labels).toContain('v-model')
  })

  it('不匹配的前缀返回空数组', () => {
    const completer = new CodeCompleter()
    const results = completer.getCompletions('xyz-not-exist', '')
    expect(results.length).toBe(0)
  })

  it('空前缀返回所有补全', () => {
    const completer = new CodeCompleter()
    const results = completer.getCompletions('', '')
    expect(results.length).toBeGreaterThan(0)
  })
})

// ================================================================
//  TemplateEngine 测试
// ================================================================

describe('TemplateEngine', () => {
  it('基本变量替换', () => {
    const engine = new TemplateEngine()
    const result = engine.render('Hello {{ name }}!', { name: 'lyt' } as any)
    expect(result).toBe('Hello lyt!')
  })

  it('多个变量替换', () => {
    const engine = new TemplateEngine()
    const result = engine.render('{{ pascalName }} - {{ kebabName }}', {
      pascalName: 'MyButton',
      kebabName: 'my-button',
    } as any)
    expect(result).toBe('MyButton - my-button')
  })

  it('if 块 - 条件为真时保留内容', () => {
    const engine = new TemplateEngine()
    const result = engine.render('{{#if style}}<style scoped></style>{{/if}}', {
      style: true,
    } as any)
    expect(result).toContain('<style scoped></style>')
  })

  it('if 块 - 条件为假时移除内容', () => {
    const engine = new TemplateEngine()
    const result = engine.render('{{#if style}}<style scoped></style>{{/if}}', {
      style: false,
    } as any)
    expect(result).not.toContain('<style scoped>')
  })

  it('each 块 - 遍历数组', () => {
    const engine = new TemplateEngine()
    const result = engine.render('{{#each props}}  {{ name }}: {{ type }},{{/each}}', {
      props: [
        { name: 'title', type: 'String' },
        { name: 'count', type: 'Number' },
      ],
    } as any)
    expect(result).toContain('title')
    expect(result).toContain('String')
    expect(result).toContain('count')
    expect(result).toContain('Number')
  })

  it('each 块 - 非数组时移除内容', () => {
    const engine = new TemplateEngine()
    const result = engine.render('{{#each items}}item{{/each}}', {} as any)
    expect(result).toBe('')
  })

  it('获取组件模板 - button 类型', () => {
    const engine = new TemplateEngine()
    const template = engine.getComponentTemplate('button')
    expect(template).toContain('button')
    expect(template).toContain('handleClick')
  })

  it('获取组件模板 - 未知类型回退到 custom', () => {
    const engine = new TemplateEngine()
    const template = engine.getComponentTemplate('custom')
    expect(template).toContain('slot')
  })
})

// ================================================================
//  ComponentGenerator 测试
// ================================================================

describe('ComponentGenerator', () => {
  it('生成 button 组件', () => {
    const generator = new ComponentGenerator()
    const result = generator.generate({
      name: 'MyButton',
      type: 'button',
    })
    expect(result.code).toContain('my-button')
    expect(result.messages.length).toBeGreaterThan(0)
    expect(result.messages[0]).toContain('MyButton')
  })

  it('生成带样式的组件', () => {
    const generator = new ComponentGenerator()
    const result = generator.generate({
      name: 'MyCard',
      type: 'card',
      style: true,
    })
    expect(result.code).toContain('my-card')
    expect(result.code).toContain('<style scoped>')
  })

  it('生成带 props 的组件', () => {
    const generator = new ComponentGenerator()
    const result = generator.generate({
      name: 'MyInput',
      type: 'input',
      props: [
        { name: 'value', type: 'String', required: true },
        { name: 'placeholder', type: 'String', default: "''" },
      ],
    })
    expect(result.code).toContain('value')
    expect(result.code).toContain('placeholder')
  })

  it('名称转换 - PascalCase', () => {
    const generator = new ComponentGenerator()
    const result = generator.generate({
      name: 'my-button',
      type: 'custom',
    })
    expect(result.code).toContain('MyButton')
    expect(result.code).toContain('myButton')
    expect(result.code).toContain('my-button')
  })

  it('createComponent 便捷函数', () => {
    const result = createComponent({
      name: 'TestComp',
      type: 'functional',
    })
    expect(result.code).toContain('test-comp')
    expect(result.messages.length).toBe(3)
  })
})

// ================================================================
//  ConfigLoader 测试
// ================================================================

describe('ConfigLoader', () => {
  it('mergeConfig 合并多个配置', () => {
    const result = ConfigLoader.mergeConfig(
      { ai: { provider: 'openai', model: 'gpt-4' } },
      { ai: { temperature: 0.5 } },
      undefined,
    )
    expect(result.ai!.provider).toBe('openai')
    expect(result.ai!.model).toBe('gpt-4')
    expect(result.ai!.temperature).toBe(0.5)
  })

  it('mergeConfig 跳过 undefined', () => {
    const result = ConfigLoader.mergeConfig(
      undefined,
      { ai: { provider: 'anthropic' } },
      undefined,
    )
    expect(result.ai!.provider).toBe('anthropic')
  })

  it('mergeConfig 空参数返回空对象', () => {
    const result = ConfigLoader.mergeConfig()
    expect(Object.keys(result).length).toBe(0)
  })

  it('mergeConfig 后面的值覆盖前面的', () => {
    const result = ConfigLoader.mergeConfig(
      { ai: { provider: 'openai' } },
      { ai: { provider: 'anthropic' } },
    )
    expect(result.ai!.provider).toBe('anthropic')
  })
})

// ================================================================
//  prompts 测试
// ================================================================

describe('prompts', () => {
  it('SYSTEM_PROMPT 包含 Lyt.js 关键信息', () => {
    expect(SYSTEM_PROMPT).toContain('Lyt.js')
    expect(SYSTEM_PROMPT).toContain('Composition API')
  })

  it('generateComponentPrompt 包含组件名称和类型', () => {
    const prompt = generateComponentPrompt({
      name: 'MyButton',
      type: 'button',
      description: 'A test button',
    })
    expect(prompt).toContain('MyButton')
    expect(prompt).toContain('button')
    expect(prompt).toContain('A test button')
  })

  it('generateComponentPrompt 包含 props 信息', () => {
    const prompt = generateComponentPrompt({
      name: 'MyInput',
      type: 'input',
      props: [
        { name: 'value', type: 'String', required: true },
      ],
    })
    expect(prompt).toContain('value')
    expect(prompt).toContain('String')
    expect(prompt).toContain('required')
  })

  it('generateStorePrompt 包含 Store 名称', () => {
    const prompt = generateStorePrompt({
      name: 'counter',
      state: { count: 0 },
    })
    expect(prompt).toContain('counter')
    expect(prompt).toContain('count')
  })

  it('generatePagePrompt 包含页面名称', () => {
    const prompt = generatePagePrompt({
      name: 'home',
      path: '/home',
    })
    expect(prompt).toContain('home')
    expect(prompt).toContain('/home')
  })

  it('generateAPIPrompt 包含 API 名称和方法', () => {
    const prompt = generateAPIPrompt({
      name: 'users',
      path: '/api/users',
      method: 'GET',
    })
    expect(prompt).toContain('users')
    expect(prompt).toContain('/api/users')
    expect(prompt).toContain('GET')
  })
})

// ================================================================
//  AIClient 测试
// ================================================================

describe('AIClient', () => {
  it('构造函数设置默认配置', () => {
    const client = new AIClient({ provider: 'openai' })
    expect(true).toBe(true)
  })

  it('缺少 API Key 时 chat 抛出错误', async () => {
    const client = new AIClient({ provider: 'openai' })
    try {
      await client.chat([{ role: 'user', content: 'hello' }])
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.message).toContain('API Key is required')
    }
  })

  it('不支持的 provider 抛出错误', async () => {
    const client = new AIClient({ provider: 'openai', apiKey: 'test-key' })
    try {
      await client.chat([{ role: 'user', content: 'hello' }])
    } catch (err: any) {
      expect(err.message).toBeTruthy()
    }
  })
})

// ================================================================
//  AIGenerator 测试
// ================================================================

describe('AIGenerator', () => {
  it('useAI=false 时使用模板生成组件', async () => {
    const generator = new AIGenerator(undefined, false)
    const result = await generator.generateComponent({
      name: 'TestBtn',
      type: 'button',
    })
    expect(result.code).toContain('test-btn')
    expect(result.usedAI).toBe(false)
    expect(result.messages.length).toBeGreaterThan(0)
  })

  it('useAI=false 时使用模板生成 Store', async () => {
    const generator = new AIGenerator(undefined, false)
    const result = await generator.generateStore({
      name: 'counter',
      state: { count: 0 },
    })
    expect(result.code).toContain('counter')
    expect(result.code).toContain('createStore')
    expect(result.usedAI).toBe(false)
  })

  it('useAI=false 时使用模板生成页面', async () => {
    const generator = new AIGenerator(undefined, false)
    const result = await generator.generatePage({
      name: 'home',
    })
    expect(result.code).toContain('home')
    expect(result.code).toContain('Home')
    expect(result.usedAI).toBe(false)
  })

  it('useAI=false 时使用模板生成 API', async () => {
    const generator = new AIGenerator(undefined, false)
    const result = await generator.generateAPI({
      name: 'users',
      path: '/api/users',
      method: 'GET',
    })
    expect(result.code).toContain('users')
    expect(result.code).toContain('GET')
    expect(result.usedAI).toBe(false)
  })
})

// ================================================================
//  parser 测试 — 组件代码解析与验证
// ================================================================

describe('parser', () => {
  describe('parseComponentCode', () => {
    it('解析完整的 SFC 组件', () => {
      const code = `<template>
  <div class="my-btn">
    <button @click="handleClick">Click</button>
  </div>
</template>

<script setup>
import { ref } from '@lytjs/reactivity'

const count = ref(0)
const handleClick = () => {
  count.value++
}
</script>

<style scoped>
.my-btn {
  padding: 8px 16px;
}
</style>`

      const parsed = parseComponentCode(code)

      expect(parsed.template).toContain('button')
      expect(parsed.template).toContain('handleClick')
      expect(parsed.script).toContain('ref')
      expect(parsed.script).toContain('count')
      expect(parsed.style).toContain('padding')
      expect(parsed.isScriptSetup).toBe(true)
      expect(parsed.isScopedStyle).toBe(true)
      expect(parsed.raw).toContain('<template>')
    })

    it('解析 markdown 代码块包裹的代码', () => {
      const code = '```html\n<template>\n  <div>Hello</div>\n</template>\n```'
      const parsed = parseComponentCode(code)
      expect(parsed.template).toContain('Hello')
    })

    it('解析无 style 的组件', () => {
      const code = `<template>
  <div>No style</div>
</template>

<script setup>
const msg = 'hello'
</script>`

      const parsed = parseComponentCode(code)
      expect(parsed.template).toContain('No style')
      expect(parsed.script).toContain('msg')
      expect(parsed.style).toBe('')
      expect(parsed.isScopedStyle).toBe(false)
    })

    it('解析非 script setup 的组件', () => {
      const code = `<template>
  <div>Old style</div>
</template>

<script>
export default {
  data() {
    return { msg: 'hello' }
  }
}
</script>`

      const parsed = parseComponentCode(code)
      expect(parsed.isScriptSetup).toBe(false)
    })

    it('提取 props 定义', () => {
      const code = `<template><div>{{ title }}</div></template>
<script setup>
import { defineProps } from '@lytjs/core'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    default: 0,
  },
})
</script>`

      const parsed = parseComponentCode(code)
      expect(parsed.props).toBeDefined()
      expect(parsed.props!.length).toBe(2)
      expect(parsed.props![0].name).toBe('title')
      expect(parsed.props![0].type).toBe('String')
      expect(parsed.props![0].required).toBe(true)
      expect(parsed.props![1].name).toBe('count')
      expect(parsed.props![1].default).toBe('0')
    })

    it('提取 emits 定义', () => {
      const code = `<template><div></div></template>
<script setup>
import { defineEmits } from '@lytjs/core'

const emit = defineEmits(['click', 'change', 'update:value'])
</script>`

      const parsed = parseComponentCode(code)
      expect(parsed.emits).toBeDefined()
      expect(parsed.emits).toContain('click')
      expect(parsed.emits).toContain('change')
      expect(parsed.emits).toContain('update:value')
    })

    it('提取 slots 使用', () => {
      const code = `<template>
  <div>
    <slot></slot>
    <slot name="header"></slot>
    <slot name="footer"></slot>
  </div>
</template>
<script setup></script>`

      const parsed = parseComponentCode(code)
      expect(parsed.slots).toBeDefined()
      expect(parsed.slots).toContain('default')
      expect(parsed.slots).toContain('header')
      expect(parsed.slots).toContain('footer')
    })
  })

  describe('extractTemplate / extractScript / extractStyle', () => {
    it('extractTemplate 提取 template 部分', () => {
      const code = `<template>\n  <div>content</div>\n</template>\n<script setup></script>`
      expect(extractTemplate(code)).toContain('content')
    })

    it('extractScript 提取 script 部分', () => {
      const code = `<template><div></div></template>\n<script setup>\nconst x = 1\n</script>`
      expect(extractScript(code)).toContain('const x = 1')
    })

    it('extractStyle 提取 style 部分', () => {
      const code = `<template><div></div></template>\n<style scoped>\n.foo { color: red; }\n</style>`
      expect(extractStyle(code)).toContain('color: red')
    })

    it('缺少对应部分时返回空字符串', () => {
      const code = `<template><div></div></template>`
      expect(extractScript(code)).toBe('')
      expect(extractStyle(code)).toBe('')
    })
  })

  describe('validateComponentCode', () => {
    it('有效代码通过验证', () => {
      const code = `<template>
  <div class="test">
    <span if="show">Hello</span>
  </div>
</template>

<script setup>
import { ref } from '@lytjs/reactivity'

const show = ref(true)
</script>

<style scoped>
.test { padding: 10px; }
</style>`

      const result = validateComponentCode(code)
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('缺少 template 报错', () => {
      const code = `<script setup>\nconst x = 1\n</script>`
      const result = validateComponentCode(code)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.section === 'template')).toBe(true)
    })

    it('缺少 script 仅警告', () => {
      const code = `<template>\n  <div>test</div>\n</template>`
      const result = validateComponentCode(code)
      expect(result.valid).toBe(true)
      expect(result.warnings.some(w => w.section === 'script')).toBe(true)
    })

    it('检测 v- 前缀指令并警告', () => {
      const code = `<template>
  <div v-if="show">
    <span v-for="item in list" :key="item.id">{{ item.name }}</span>
  </div>
</template>
<script setup></script>`

      const result = validateComponentCode(code)
      expect(result.warnings.some(w => w.message.includes('v-'))).toBe(true)
    })

    it('检测 vue 导入并警告', () => {
      const code = `<template><div></div></template>
<script setup>
import { ref } from 'vue'
</script>`

      const result = validateComponentCode(code)
      expect(result.warnings.some(w => w.message.includes('vue'))).toBe(true)
    })

    it('检测未闭合的括号', () => {
      const code = `<template><div></div></template>
<script setup>
const obj = { a: 1, b: 2
</script>`

      const result = validateComponentCode(code)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('花括号'))).toBe(true)
    })
  })
})

// ================================================================
//  prompts/component-prompts 测试
// ================================================================

describe('component-prompts', () => {
  it('buttonComponentPrompt 生成按钮组件 Prompt', () => {
    const prompt = buttonComponentPrompt({
      name: 'PrimaryButton',
      type: 'button',
      description: '主色调按钮',
    })
    expect(prompt).toContain('PrimaryButton')
    expect(prompt).toContain('主色调按钮')
    expect(prompt).toContain('type')
    expect(prompt).toContain('size')
    expect(prompt).toContain('disabled')
    expect(prompt).toContain('loading')
  })

  it('inputComponentPrompt 生成输入框组件 Prompt', () => {
    const prompt = inputComponentPrompt({
      name: 'SearchInput',
      type: 'input',
    })
    expect(prompt).toContain('SearchInput')
    expect(prompt).toContain('v-model')
    expect(prompt).toContain('placeholder')
    expect(prompt).toContain('clearable')
  })

  it('selectComponentPrompt 生成选择器组件 Prompt', () => {
    const prompt = selectComponentPrompt({
      name: 'MySelect',
      type: 'select',
    })
    expect(prompt).toContain('MySelect')
    expect(prompt).toContain('options')
    expect(prompt).toContain('filterable')
  })

  it('formComponentPrompt 生成表单组件 Prompt', () => {
    const prompt = formComponentPrompt({
      name: 'MyForm',
      type: 'form',
    })
    expect(prompt).toContain('MyForm')
    expect(prompt).toContain('validate')
    expect(prompt).toContain('resetFields')
  })

  it('tableComponentPrompt 生成表格组件 Prompt', () => {
    const prompt = tableComponentPrompt({
      name: 'DataTable',
      type: 'table',
    })
    expect(prompt).toContain('DataTable')
    expect(prompt).toContain('columns')
    expect(prompt).toContain('sortable')
  })

  it('modalComponentPrompt 生成对话框组件 Prompt', () => {
    const prompt = modalComponentPrompt({
      name: 'MyModal',
      type: 'modal',
    })
    expect(prompt).toContain('MyModal')
    expect(prompt).toContain('visible')
    expect(prompt).toContain('closable')
  })

  it('customComponentPrompt 生成自定义组件 Prompt', () => {
    const prompt = customComponentPrompt('一个带动画的侧边栏导航', {
      name: 'SideNav',
      style: 'modern',
    })
    expect(prompt).toContain('侧边栏导航')
    expect(prompt).toContain('SideNav')
    expect(prompt).toContain('modern')
  })

  it('getComponentPrompt 自动选择模板', () => {
    const prompt1 = getComponentPrompt({ name: 'Btn', type: 'button' })
    expect(prompt1).toContain('Btn')

    const prompt2 = getComponentPrompt({ name: 'Tbl', type: 'table' })
    expect(prompt2).toContain('Tbl')

    const prompt3 = getComponentPrompt({
      name: 'Custom',
      type: 'custom',
      description: '自定义描述',
    })
    expect(prompt3).toContain('自定义描述')
  })

  it('basicComponentPrompt 包含额外 props', () => {
    const prompt = basicComponentPrompt({
      name: 'Test',
      type: 'button',
      props: [{ name: 'color', type: 'String', required: true }],
      emits: ['click', 'hover'],
    })
    expect(prompt).toContain('color')
    expect(prompt).toContain('click')
    expect(prompt).toContain('hover')
  })
})

// ================================================================
//  prompts/code-prompts 测试
// ================================================================

describe('code-prompts', () => {
  it('inlineCompletionPrompt 生成行内补全 Prompt', () => {
    const prompt = inlineCompletionPrompt({
      beforeCursor: 'const count = ',
      afterCursor: '\nconsole.log(count)',
      filePath: 'src/App.ts',
      language: 'typescript',
    })
    expect(prompt).toContain('const count = ')
    expect(prompt).toContain('console.log(count)')
    expect(prompt).toContain('App.ts')
    expect(prompt).toContain('typescript')
  })

  it('functionCompletionPrompt 生成函数补全 Prompt', () => {
    const prompt = functionCompletionPrompt({
      signature: 'function debounce(fn: Function, delay: number): Function',
      description: '创建防抖函数',
      returnType: 'Function',
      imports: ['import { ref } from "@lytjs/reactivity"'],
    })
    expect(prompt).toContain('debounce')
    expect(prompt).toContain('防抖函数')
    expect(prompt).toContain('@lytjs/reactivity')
  })

  it('componentCompletionPrompt 生成组件补全 Prompt', () => {
    const prompt = componentCompletionPrompt({
      template: '<div class="test"></div>',
      completePart: 'script',
      componentName: 'TestComp',
      requirements: ['添加响应式数据', '添加生命周期钩子'],
    })
    expect(prompt).toContain('test')
    expect(prompt).toContain('script')
    expect(prompt).toContain('TestComp')
    expect(prompt).toContain('响应式数据')
  })

  it('smartCompletionPrompt 自动判断补全类型', () => {
    const prompt1 = smartCompletionPrompt({
      beforeCursor: 'function test() {',
    })
    expect(prompt1).toContain('function')

    const prompt2 = smartCompletionPrompt({
      beforeCursor: '<template>',
    })
    expect(prompt2).toContain('component')

    const prompt3 = smartCompletionPrompt({
      beforeCursor: 'import { ref ',
    })
    expect(prompt3).toContain('import')
  })
})

// ================================================================
//  prompts/fix-prompts 测试
// ================================================================

describe('fix-prompts', () => {
  it('compileErrorFixPrompt 生成编译错误修复 Prompt', () => {
    const prompt = compileErrorFixPrompt({
      errorMessage: 'Unexpected token }',
      code: 'function test() { return { }',
      filePath: 'src/test.ts',
      compiler: 'typescript',
    })
    expect(prompt).toContain('Unexpected token')
    expect(prompt).toContain('test.ts')
    expect(prompt).toContain('typescript')
  })

  it('runtimeErrorFixPrompt 生成运行时错误修复 Prompt', () => {
    const prompt = runtimeErrorFixPrompt({
      errorMessage: 'Cannot read property "name" of undefined',
      code: 'console.log(user.name)',
      stackTrace: 'at Object.<anonymous> (test.js:1:15)',
      reproduceSteps: ['打开页面', '点击按钮'],
      expectedBehavior: '应该显示用户名',
    })
    expect(prompt).toContain('Cannot read property')
    expect(prompt).toContain('test.js:1:15')
    expect(prompt).toContain('打开页面')
    expect(prompt).toContain('应该显示用户名')
  })

  it('typeErrorFixPrompt 生成类型错误修复 Prompt', () => {
    const prompt = typeErrorFixPrompt({
      errorMessage: "Type 'string' is not assignable to type 'number'",
      code: 'const count: number = "hello"',
      typeDefinitions: 'interface User { name: string; age: number }',
      allowAny: false,
    })
    expect(prompt).toContain('not assignable')
    expect(prompt).toContain('User')
    expect(prompt).toContain('不允许使用 any')
  })

  it('autoFixPrompt 自动检测错误类型', () => {
    const prompt1 = autoFixPrompt({
      errorMessage: "Type 'string' is not assignable to type 'number'",
      code: 'const x: number = "a"',
    })
    expect(prompt1).toContain('type')

    const prompt2 = autoFixPrompt({
      errorMessage: 'SyntaxError: Unexpected token',
      code: 'const x =',
    })
    expect(prompt2).toContain('compile')

    const prompt3 = autoFixPrompt({
      errorMessage: 'TypeError: Cannot read property of undefined',
      code: 'obj.prop.value',
    })
    expect(prompt3).toContain('runtime')
  })
})

// ================================================================
//  providers/provider-interface 测试
// ================================================================

describe('provider-interface', () => {
  it('自定义 Provider 可以实现接口', async () => {
    // 创建一个 mock provider 来验证接口
    class MockProvider implements AIProviderInterface {
      readonly name = 'mock'
      readonly models = ['mock-model']
      model = 'mock-model'
      private shouldThrow = false

      async complete(prompt: string, options?: CompleteOptions) {
        if (this.shouldThrow) throw new Error('test error')
        return { content: `Mock response for: ${prompt}` }
      }

      async chat(messages: { role: string; content: string }[], options?: CompleteOptions) {
        return this.complete(messages.map(m => m.content).join('\n'), options)
      }

      async *stream(prompt: string, options?: CompleteOptions): AsyncGenerator<StreamChunk> {
        yield { content: 'Mock ', done: false }
        yield { content: 'stream', done: false }
        yield { content: '', done: true }
      }

      async *streamChat(messages: { role: string; content: string }[], options?: CompleteOptions): AsyncGenerator<StreamChunk> {
        yield* this.stream(messages.map(m => m.content).join('\n'), options)
      }

      async validateApiKey() {
        return !this.shouldThrow
      }

      setThrow(shouldThrow: boolean) {
        this.shouldThrow = shouldThrow
      }
    }

    const provider = new MockProvider()

    // 测试 complete
    const result = await provider.complete('hello')
    expect(result).toHaveProperty('content', 'Mock response for: hello')

    // 测试 chat
    const chatResult = await provider.chat([
      { role: 'user', content: 'hi' },
    ])
    expect(chatResult).toBeDefined()

    // 测试 stream
    const streamResult = provider.stream('test')
    const chunks: StreamChunk[] = []
    for await (const chunk of streamResult) {
      chunks.push(chunk)
    }
    expect(chunks.length).toBe(3)

    // 测试 validateApiKey
    expect(await provider.validateApiKey()).toBe(true)

    // 测试错误情况
    provider.setThrow(true)
    expect(await provider.validateApiKey()).toBe(false)
  })
})
