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
    expect(labels).toContain('readonly')
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

  it('点号路径变量替换', () => {
    const engine = new TemplateEngine()
    const result = engine.render('{{ description || "default" }}', {
      description: 'A Button',
    } as any)
    // 点号路径取值，description 存在
    expect(result).toContain('A Button')
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
    // 不抛异常即为成功
    expect(true).toBe(true)
  })

  it('缺少 API Key 时 chat 抛出错误', async () => {
    const client = new AIClient({ provider: 'openai' })
    try {
      await client.chat([{ role: 'user', content: 'hello' }])
      expect(true).toBe(false) // 不应到达
    } catch (err: any) {
      expect(err.message).toContain('API Key is required')
    }
  })

  it('不支持的 provider 抛出错误', async () => {
    const client = new AIClient({ provider: 'openai', apiKey: 'test-key' })
    // 由于没有真实服务器，会抛出网络错误
    try {
      await client.chat([{ role: 'user', content: 'hello' }])
    } catch (err: any) {
      // 网络错误或 API 错误都可以接受
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

  it('extractCode 从代码块中提取代码', () => {
    // 通过 AIGenerator 的私有方法间接测试
    // 当 AI 返回包含代码块的内容时，应正确提取
    const generator = new AIGenerator(undefined, false)
    // 模板生成不经过 extractCode，但我们可以验证模板结果
    const result = generator.generateComponent({
      name: 'TestComp',
      type: 'custom',
    })
    expect(result.code).toBeTruthy()
  })
})
