/**
 * 错误修复专用 Prompt 模板
 *
 * 提供编译错误、运行时错误、类型错误修复的 Prompt 生成
 */

/**
 * 错误修复系统上下文
 */
const FIX_CONTEXT = `你是一个 Lyt.js 错误修复助手。Lyt.js 是一个与 Vue 3 兼容的轻量前端框架。

修复规则：
1. 只修改导致错误的最小范围代码
2. 保持原有代码风格和结构
3. 不要引入新的依赖
4. 添加修复原因的注释
5. 返回完整的修复后代码
6. 如果有多种修复方案，选择最简洁的

Lyt.js API 参考：
- ref, reactive, computed, watch — @lytjs/reactivity
- defineComponent, defineProps, defineEmits — @lytjs/component
- createApp — @lytjs/core
- createRouter — @lytjs/router
- createStore — @lytjs/store

模板语法（无 v- 前缀）：
- if="condition" / else / else-if
- each="item in list"
- model="value"
- @event="handler" / :prop="value"`

// ============================================================
//  编译错误修复
// ============================================================

/**
 * 编译错误修复 Prompt
 */
export function compileErrorFixPrompt(context: {
  /** 错误信息 */
  errorMessage: string
  /** 出错的代码 */
  code: string
  /** 文件路径 */
  filePath?: string
  /** 编译器类型 */
  compiler?: string
}): string {
  const { errorMessage, code, filePath, compiler } = context

  return `${FIX_CONTEXT}

请修复以下编译错误。

${filePath ? `文件：${filePath}` : ''}
${compiler ? `编译器：${compiler}` : ''}

错误信息：
\`\`\`
${errorMessage}
\`\`\`

出错代码：
\`\`\`
${code}
\`\`\`

请分析错误原因并修复代码。返回完整的修复后代码，并在修复处添加注释说明修复原因。`
}

// ============================================================
//  运行时错误修复
// ============================================================

/**
 * 运行时错误修复 Prompt
 */
export function runtimeErrorFixPrompt(context: {
  /** 错误信息 */
  errorMessage: string
  /** 错误堆栈 */
  stackTrace?: string
  /** 出错的代码 */
  code: string
  /** 文件路径 */
  filePath?: string
  /** 复现步骤 */
  reproduceSteps?: string[]
  /** 期望行为 */
  expectedBehavior?: string
}): string {
  const { errorMessage, stackTrace, code, filePath, reproduceSteps, expectedBehavior } = context

  let prompt = `${FIX_CONTEXT}

请修复以下运行时错误。

${filePath ? `文件：${filePath}` : ''}

错误信息：
\`\`\`
${errorMessage}
\`\`\``

  if (stackTrace) {
    prompt += `
错误堆栈：
\`\`\`
${stackTrace}
\`\`\``
  }

  if (reproduceSteps && reproduceSteps.length > 0) {
    prompt += `
复现步骤：
${reproduceSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`
  }

  if (expectedBehavior) {
    prompt += `
期望行为：${expectedBehavior}`
  }

  prompt += `
出错代码：
\`\`\`
${code}
\`\`\`

请分析错误原因并修复代码。返回完整的修复后代码，并在修复处添加注释说明修复原因。`

  return prompt
}

// ============================================================
//  类型错误修复
// ============================================================

/**
 * TypeScript 类型错误修复 Prompt
 */
export function typeErrorFixPrompt(context: {
  /** 错误信息 */
  errorMessage: string
  /** 出错的代码 */
  code: string
  /** 文件路径 */
  filePath?: string
  /** 相关类型定义 */
  typeDefinitions?: string
  /** 是否允许使用 any */
  allowAny?: boolean
}): string {
  const { errorMessage, code, filePath, typeDefinitions, allowAny } = context

  let prompt = `${FIX_CONTEXT}

请修复以下 TypeScript 类型错误。

${filePath ? `文件：${filePath}` : ''}

错误信息：
\`\`\`
${errorMessage}
\`\`\``

  if (typeDefinitions) {
    prompt += `
相关类型定义：
\`\`\`typescript
${typeDefinitions}
\`\`\``
  }

  prompt += `
出错代码：
\`\`\`typescript
${code}
\`\`\``

  if (allowAny === false) {
    prompt += `
注意：不允许使用 any 类型，请使用正确的类型。`
  }

  prompt += `
请分析类型错误原因并修复代码。返回完整的修复后代码，并在修复处添加注释说明修复原因。`

  return prompt
}

// ============================================================
//  通用错误修复
// ============================================================

/**
 * 自动检测错误类型并生成修复 Prompt
 */
export function autoFixPrompt(context: {
  errorMessage: string
  code: string
  filePath?: string
  stackTrace?: string
  extraContext?: string
}): string {
  const { errorMessage, code, filePath, stackTrace, extraContext } = context

  const error = errorMessage.toLowerCase()

  // 自动检测错误类型
  let errorType = 'unknown'
  if (
    error.includes('type') && error.includes('is not assignable') ||
    error.includes('cannot find name') && error.includes('type') ||
    error.includes('property') && error.includes('does not exist') ||
    error.includes('type annotation')
  ) {
    errorType = 'type'
  } else if (
    error.includes('syntaxerror') ||
    error.includes('unexpected token') ||
    error.includes('parse error') ||
    error.includes('compile error')
  ) {
    errorType = 'compile'
  } else if (
    error.includes('is not a function') ||
    error.includes('is not defined') ||
    error.includes('cannot read') ||
    error.includes('null') ||
    error.includes('undefined')
  ) {
    errorType = 'runtime'
  }

  let prompt = `${FIX_CONTEXT}

请修复以下 ${errorType} 错误。

${filePath ? `文件：${filePath}` : ''}

错误信息：
\`\`\`
${errorMessage}
\`\`\``

  if (stackTrace) {
    prompt += `
错误堆栈：
\`\`\`
${stackTrace}
\`\`\``
  }

  if (extraContext) {
    prompt += `
额外上下文：
${extraContext}`
  }

  prompt += `
出错代码：
\`\`\`
${code}
\`\`\`

请分析错误原因并修复代码。返回完整的修复后代码，并在修复处添加注释说明修复原因。`

  return prompt
}
