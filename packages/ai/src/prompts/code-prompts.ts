/**
 * 代码补全专用 Prompt 模板
 *
 * 提供行内补全、函数补全、组件补全的 Prompt 生成
 */

/**
 * Lyt.js 代码补全系统上下文
 */
const CODE_CONTEXT = `你是一个 Lyt.js 代码补全助手。Lyt.js 是一个与 Vue 3 兼容的轻量前端框架。

关键 API：
- ref, reactive, computed, watch, watchEffect, nextTick, toRef, toRefs — 来自 @lytjs/reactivity
- defineComponent, defineProps, defineEmits, onMounted, onUpdated, onUnmounted — 来自 @lytjs/component
- createApp, provide, inject — 来自 @lytjs/core
- createRouter, useRouter, useRoute — 来自 @lytjs/router
- createStore, useStore — 来自 @lytjs/store

模板语法（无 v- 前缀）：
- if="condition" / else / else-if
- each="item in list"
- model="value"
- @event="handler" / :prop="value"

规则：
- 只返回补全的代码片段，不要返回完整文件
- 不要包含任何解释说明
- 保持与上下文代码风格一致
- 使用 TypeScript 类型注解`

// ============================================================
//  行内补全
// ============================================================

/**
 * 行内补全 Prompt
 * 用于在光标位置补全当前行
 */
export function inlineCompletionPrompt(context: {
  /** 光标前的代码 */
  beforeCursor: string
  /** 光标后的代码 */
  afterCursor?: string
  /** 当前文件路径 */
  filePath?: string
  /** 语言类型 */
  language?: string
}): string {
  const { beforeCursor, afterCursor, filePath, language } = context

  const prompt = `${CODE_CONTEXT}

请补全以下代码中光标位置的内容。

文件：${filePath || 'unknown'}
语言：${language || 'typescript'}

代码（| 表示光标位置）：
${beforeCursor}|${afterCursor || ''}

请只返回从光标位置开始需要补全的代码，不要包含光标前的内容。`

  return prompt
}

// ============================================================
//  函数补全
// ============================================================

/**
 * 函数补全 Prompt
 * 根据函数签名和上下文生成函数体
 */
export function functionCompletionPrompt(context: {
  /** 函数签名 */
  signature: string
  /** 函数描述 */
  description?: string
  /** 上下文代码（函数外的代码） */
  surroundingCode?: string
  /** 返回类型提示 */
  returnType?: string
  /** 相关导入 */
  imports?: string[]
}): string {
  const { signature, description, surroundingCode, returnType, imports } = context

  let prompt = `${CODE_CONTEXT}`

  if (imports && imports.length > 0) {
    prompt += `\n\n已导入的模块：\n${imports.map(i => `- ${i}`).join('\n')}`
  }

  if (surroundingCode) {
    prompt += `\n\n上下文代码：\n\`\`\`\n${surroundingCode}\n\`\`\``
  }

  prompt += `

请为以下函数生成实现：

\`\`\`typescript
${signature} {
  // TODO: 实现函数体
}
\`\`\`

${description ? `功能描述：${description}` : ''}
${returnType ? `返回类型：${returnType}` : ''}

要求：
1. 实现完整的功能逻辑
2. 添加适当的错误处理
3. 添加简洁的注释
4. 使用 Lyt.js API

请只返回函数体代码（花括号内的内容），不要包含函数签名。`

  return prompt
}

// ============================================================
//  组件补全
// ============================================================

/**
 * 组件补全 Prompt
 * 根据已有部分代码补全组件
 */
export function componentCompletionPrompt(context: {
  /** 已有的 template 部分 */
  template?: string
  /** 已有的 script 部分 */
  script?: string
  /** 已有的 style 部分 */
  style?: string
  /** 需要补全的部分 */
  completePart: 'template' | 'script' | 'style' | 'full'
  /** 组件名称 */
  componentName?: string
  /** 额外要求 */
  requirements?: string[]
}): string {
  const { template, script, style, completePart, componentName, requirements } = context

  let prompt = `${CODE_CONTEXT}`

  if (componentName) {
    prompt += `\n\n组件名称：${componentName}`
  }

  if (template) {
    prompt += `\n\n已有的 template：\n\`\`\`html\n${template}\n\`\`\``
  }

  if (script) {
    prompt += `\n\n已有的 script：\n\`\`\`typescript\n${script}\n\`\`\``
  }

  if (style) {
    prompt += `\n\n已有的 style：\n\`\`\`css\n${style}\n\`\`\``
  }

  prompt += `\n\n请补全组件的 ${completePart} 部分。`

  if (requirements && requirements.length > 0) {
    prompt += `\n\n额外要求：\n${requirements.map(r => `- ${r}`).join('\n')}`
  }

  prompt += `\n\n请只返回需要补全的部分代码，不要包含已有内容。`

  return prompt
}

/**
 * 智能代码补全 Prompt
 * 根据上下文自动判断补全类型
 */
export function smartCompletionPrompt(context: {
  /** 光标前的代码 */
  beforeCursor: string
  /** 光标后的代码 */
  afterCursor?: string
  /** 文件路径 */
  filePath?: string
  /** 最近编辑的行（用于上下文） */
  recentLines?: string[]
}): string {
  const { beforeCursor, afterCursor, filePath, recentLines } = context

  const trimmedBefore = beforeCursor.trimEnd()
  const lastLine = trimmedBefore.split('\n').pop() || ''

  // 判断补全类型
  let completionType = 'inline'

  if (lastLine.match(/^(export\s+)?(function|const|async\s+function)/)) {
    completionType = 'function'
  } else if (lastLine.match(/<(template|script|style)/)) {
    completionType = 'component'
  } else if (lastLine.match(/(import|from)\s/)) {
    completionType = 'import'
  }

  let prompt = `${CODE_CONTEXT}`

  if (filePath) {
    prompt += `\n\n文件：${filePath}`
  }

  if (recentLines && recentLines.length > 0) {
    prompt += `\n\n最近编辑的代码：\n${recentLines.join('\n')}`
  }

  prompt += `

补全类型：${completionType}

当前代码（| 表示光标位置）：
${beforeCursor}|${afterCursor || ''}

请根据上下文智能补全代码。只返回需要补全的代码片段。`

  return prompt
}
