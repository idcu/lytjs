# AI 集成指南

## 概述

`@lytjs/ai` 是 Lyt.js 框架的 AI 辅助开发工具包，提供以下核心能力：

- **智能组件生成** — 根据自然语言描述生成 Lyt.js 组件代码
- **代码补全** — 智能代码补全，支持行内、函数、组件级别
- **错误修复** — 自动分析和修复编译错误、运行时错误、类型错误
- **多模型支持** — 支持 OpenAI GPT-4、Anthropic Claude、本地 Ollama
- **流式输出** — 支持流式生成，实时显示 AI 输出
- **代码验证** — 自动验证生成代码的语法和 Lyt.js 兼容性

所有 AI 功能都是**可选的**，不影响框架核心功能。当 AI 不可用时，会自动降级到模板生成。

## 安装

```bash
npm install @lytjs/ai

# 或使用 pnpm
pnpm add @lytjs/ai
```

## 配置指南

### 方式一：配置文件

在项目根目录创建 `.lytrc.json`：

```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "your-api-key-here",
    "model": "gpt-4o",
    "baseUrl": "https://api.openai.com/v1",
    "temperature": 0.7,
    "maxTokens": 2000,
    "timeout": 30000
  }
}
```

### 方式二：环境变量

```bash
# OpenAI
export LYT_AI_PROVIDER=openai
export LYT_AI_APIKEY=sk-xxx
export LYT_AI_MODEL=gpt-4o

# Anthropic Claude
export LYT_AI_PROVIDER=claude
export LYT_AI_APIKEY=sk-ant-xxx
export LYT_AI_MODEL=claude-3-5-sonnet-20241022

# Ollama（本地）
export LYT_AI_PROVIDER=ollama
export LYT_AI_MODEL=llama3
export LYT_AI_BASEURL=http://localhost:11434
```

### 方式三：代码配置

```typescript
import { LytAIAssistant } from '@lytjs/ai'

const assistant = new LytAIAssistant({
  provider: 'openai',
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
  },
})
```

### 模型选择

| Provider | 模型 | 特点 |
|----------|------|------|
| OpenAI | gpt-4o | 最强能力，推荐用于组件生成 |
| OpenAI | gpt-4o-mini | 快速且经济，适合代码补全 |
| Claude | claude-3-5-sonnet | 代码生成质量高，支持长上下文 |
| Claude | claude-3-5-haiku | 速度快，适合简单任务 |
| Ollama | llama3 | 本地运行，无需 API Key |
| Ollama | codellama | 专为代码生成优化的本地模型 |

## 组件生成教程

### 基础用法

```typescript
import { LytAIAssistant } from '@lytjs/ai'

const assistant = new LytAIAssistant({
  provider: 'openai',
  openai: { apiKey: 'sk-xxx' },
})

// 根据描述生成组件
const result = await assistant.generateComponent(
  '一个带搜索功能的输入框组件，支持防抖、清除按钮和搜索图标'
)

console.log(result.parsed.template)  // template 部分
console.log(result.parsed.script)    // script 部分
console.log(result.parsed.style)     // style 部分
console.log(result.valid)            // 是否通过验证
```

### 指定组件类型

```typescript
const result = await assistant.generateComponent(
  '一个数据表格，支持排序和分页',
  {
    name: 'DataTable',
    type: 'table',
    style: true,
    validate: true,
  }
)
```

### 流式生成

```typescript
for await (const chunk of assistant.streamGenerateComponent('一个登录表单')) {
  process.stdout.write(chunk.content)
}
```

### 使用 CLI

```bash
# 初始化配置
lyt-ai init

# 生成组件（模板）
lyt-ai component MyButton --type button

# 生成组件（AI）
lyt-ai component MyButton --type button --ai

# 生成 Store
lyt-ai store counter --ai

# 生成页面
lyt-ai page Home --ai
```

## 代码补全教程

### 智能补全

```typescript
const completion = await assistant.completeCode(
  'import { ref, computed } from "@lytjs/reactivity"\n\nconst count = |',
  {
    filePath: 'src/components/Counter.lyt',
  }
)

console.log(completion)  // ref(0)
```

### 流式补全

```typescript
for await (const chunk of assistant.streamCompleteCode(
  'const items = ref([])\nconst filteredItems = |'
)) {
  process.stdout.write(chunk.content)
}
```

## 错误修复教程

```typescript
const suggestion = await assistant.fixError(
  "Property 'value' does not exist on type 'never'",
  `const input = ref()
console.log(input.value)`,
  {
    filePath: 'src/components/Input.lyt',
    validate: true,
  }
)

console.log(suggestion.fixedCode)      // 修复后的代码
console.log(suggestion.explanation)    // 修复说明
console.log(suggestion.validation)     // 验证结果
```

## 对话功能

```typescript
// 流式对话
const messages = [
  { role: 'user', content: '如何在 Lyt.js 中使用路由？' },
]

for await (const chunk of assistant.chat(messages)) {
  process.stdout.write(chunk.content)
}

// 非流式对话
const response = await assistant.chatSync([
  { role: 'user', content: 'Lyt.js 和 Vue 3 有什么区别？' },
])

console.log(response.content)

// 管理对话历史
assistant.clearHistory()
console.log(assistant.getHistory())
```

## 代码解析与验证

### 解析组件代码

```typescript
import { parseComponentCode } from '@lytjs/ai'

const parsed = parseComponentCode(aiGeneratedCode)

console.log(parsed.name)            // 组件名称
console.log(parsed.template)        // template 部分
console.log(parsed.script)          // script 部分
console.log(parsed.style)           // style 部分
console.log(parsed.isScriptSetup)   // 是否使用 script setup
console.log(parsed.props)           // 提取的 props
console.log(parsed.emits)           // 提取的 emits
console.log(parsed.slots)           // 提取的 slots
```

### 验证代码

```typescript
import { validateComponentCode } from '@lytjs/ai'

const result = validateComponentCode(code)

if (result.valid) {
  console.log('Code is valid!')
} else {
  for (const error of result.errors) {
    console.error(`[${error.section}] ${error.message}`)
  }
}

for (const warning of result.warnings) {
  console.warn(`[${warning.section}] ${warning.message}`)
}
```

## 自定义 Prompt 模板

### 组件生成 Prompt

```typescript
import {
  buttonComponentPrompt,
  formComponentPrompt,
  customComponentPrompt,
} from '@lytjs/ai'

// 使用预定义的 Button Prompt
const prompt = buttonComponentPrompt({
  name: 'PrimaryButton',
  type: 'button',
  description: '主色调按钮',
  props: [
    { name: 'size', type: 'String', default: "'medium'" },
  ],
})

// 自定义组件 Prompt
const customPrompt = customComponentPrompt(
  '一个带动画的侧边栏导航，支持折叠和展开',
  { name: 'SideNav', style: 'modern minimalist' }
)
```

### 代码补全 Prompt

```typescript
import { inlineCompletionPrompt, functionCompletionPrompt } from '@lytjs/ai'

// 行内补全
const prompt1 = inlineCompletionPrompt({
  beforeCursor: 'const result = await fetch(url)\nconst data = |',
  afterCursor: '\nconsole.log(data)',
  filePath: 'src/utils/api.ts',
})

// 函数补全
const prompt2 = functionCompletionPrompt({
  signature: 'function debounce(fn: Function, delay: number): Function',
  description: '创建防抖函数，延迟执行',
  returnType: 'Function',
})
```

### 错误修复 Prompt

```typescript
import { compileErrorFixPrompt, typeErrorFixPrompt } from '@lytjs/ai'

// 编译错误
const prompt1 = compileErrorFixPrompt({
  errorMessage: 'Unexpected token }',
  code: 'function test() { return { }',
  filePath: 'src/utils/test.ts',
})

// 类型错误
const prompt2 = typeErrorFixPrompt({
  errorMessage: "Type 'string' is not assignable to type 'number'",
  code: 'const count: number = "hello"',
  allowAny: false,
})
```

## Provider 开发指南

### 实现自定义 Provider

```typescript
import type { AIProviderInterface, CompleteOptions, StreamChunk } from '@lytjs/ai'
import type { ChatMessage, AIResponse } from '@lytjs/ai'

class MyCustomProvider implements AIProviderInterface {
  readonly name = 'custom'
  readonly models = ['my-model-v1', 'my-model-v2']
  model: string = 'my-model-v1'

  async complete(prompt: string, options?: CompleteOptions): Promise<AIResponse> {
    // 实现你的 API 调用逻辑
    const response = await fetch('https://my-api.com/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, ...options }),
    })
    const data = await response.json()
    return { content: data.text }
  }

  async chat(messages: ChatMessage[], options?: CompleteOptions): Promise<AIResponse> {
    // 实现聊天 API 调用
    return this.complete(messages.map(m => m.content).join('\n'), options)
  }

  async *stream(prompt: string, options?: CompleteOptions): AsyncGenerator<StreamChunk> {
    // 实现流式输出
    yield { content: 'streamed text', done: false }
    yield { content: '', done: true }
  }

  async *streamChat(messages: ChatMessage[], options?: CompleteOptions): AsyncGenerator<StreamChunk> {
    yield* this.stream(messages.map(m => m.content).join('\n'), options)
  }

  async validateApiKey(): Promise<boolean> {
    // 验证 API Key
    return true
  }
}
```

### 使用自定义 Provider

```typescript
const assistant = new LytAIAssistant({
  customProvider: new MyCustomProvider(),
})
```

## AI Playground

打开 `packages/ai/playground/index.html` 可以在浏览器中使用交互式 AI Playground：

- **Chat** — 与 AI 助手对话
- **Component Generator** — 输入描述生成组件代码
- **Code Completion** — 智能代码补全
- **Provider 切换** — 支持 OpenAI / Claude / Ollama
- **API Key 配置** — 在界面中配置 API Key

## 降级策略

当 AI 生成失败时，`AIGenerator` 会自动降级到模板生成：

```typescript
import { AIGenerator } from '@lytjs/ai'

// useAI=false 强制使用模板生成
const generator = new AIGenerator(undefined, false)

const result = await generator.generateComponent({
  name: 'MyButton',
  type: 'button',
})

// result.usedAI === false
// result.code 包含模板生成的代码
```

## 注意事项

1. **API Key 安全** — 不要将 API Key 提交到版本控制，使用环境变量或配置文件
2. **网络依赖** — AI 功能需要网络连接（Ollama 除外），确保网络可用
3. **Token 消耗** — 注意监控 Token 使用量，避免意外的高额费用
4. **代码审查** — AI 生成的代码需要人工审查，确保质量和安全性
5. **可选功能** — 所有 AI 功能都是可选的，不影响框架核心功能
