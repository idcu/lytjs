/**
 * 结构化输出解析器
 *
 * 解析 AI 生成的组件代码，提取 template/script/style 部分，验证代码语法
 */

// ============================================================
//  类型定义
// ============================================================

/**
 * 解析后的组件结构
 */
export interface ParsedComponent {
  /** 组件名称（从代码中提取） */
  name?: string
  /** template 部分 */
  template: string
  /** script 部分（原始内容） */
  script: string
  /** style 部分 */
  style: string
  /** 是否使用 script setup */
  isScriptSetup: boolean
  /** 是否使用 scoped 样式 */
  isScopedStyle: boolean
  /** style 使用的预处理器 */
  stylePreprocessor?: 'scss' | 'less' | 'stylus' | 'css'
  /** 提取的 props 定义 */
  props?: ExtractedProp[]
  /** 提取的 emits 定义 */
  emits?: string[]
  /** 提取的 slots 使用 */
  slots?: string[]
  /** 原始代码 */
  raw: string
}

/**
 * 提取的 Prop 定义
 */
export interface ExtractedProp {
  name: string
  type: string
  required?: boolean
  default?: string
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 错误列表 */
  errors: ValidationError[]
  /** 警告列表 */
  warnings: ValidationWarning[]
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 错误级别 */
  level: 'error'
  /** 错误消息 */
  message: string
  /** 错误位置（行号） */
  line?: number
  /** 错误部分 */
  section?: 'template' | 'script' | 'style'
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  /** 警告级别 */
  level: 'warning'
  /** 警告消息 */
  message: string
  /** 警告位置（行号） */
  line?: number
  /** 警告部分 */
  section?: 'template' | 'script' | 'style'
}

// ============================================================
//  核心解析函数
// ============================================================

/**
 * 解析 AI 生成的组件代码
 *
 * 支持格式：
 * 1. 完整的 SFC 格式（<template>...<script>...<style>...）
 * 2. 代码块包裹的格式（```html ... ```）
 * 3. 纯代码（无包裹）
 */
export function parseComponentCode(raw: string): ParsedComponent {
  // 1. 清理输入：去除 markdown 代码块包裹
  let code = stripCodeBlock(raw)

  // 2. 提取各部分
  const template = extractTemplate(code)
  const script = extractScript(code)
  const style = extractStyle(code)

  // 3. 分析特征
  const isScriptSetup = /<script\s+setup/.test(code)
  const scopedMatch = code.match(/<style\s+[^>]*scoped/)
  const isScopedStyle = scopedMatch !== null
  const stylePreprocessor = detectStylePreprocessor(code)

  // 4. 提取元信息
  const props = extractProps(script)
  const emits = extractEmits(script)
  const slots = extractSlots(template)
  const name = extractComponentName(code)

  return {
    name,
    template,
    script,
    style,
    isScriptSetup,
    isScopedStyle,
    stylePreprocessor,
    props,
    emits,
    slots,
    raw: code,
  }
}

/**
 * 验证组件代码
 */
export function validateComponentCode(code: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  const parsed = parseComponentCode(code)

  // 验证 template
  if (!parsed.template.trim()) {
    errors.push({
      level: 'error',
      message: '缺少 <template> 部分',
      section: 'template',
    })
  } else {
    validateTemplate(parsed.template, errors, warnings)
  }

  // 验证 script
  if (!parsed.script.trim()) {
    warnings.push({
      level: 'warning',
      message: '缺少 <script> 部分',
      section: 'script',
    })
  } else {
    validateScript(parsed.script, errors, warnings)
  }

  // 验证 style
  if (parsed.style.trim()) {
    validateStyle(parsed.style, errors, warnings)
  }

  // 检查 Lyt.js 语法兼容性
  validateLytjsCompatibility(code, warnings)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * 提取 template 部分
 */
export function extractTemplate(code: string): string {
  const match = code.match(/<template>([\s\S]*?)<\/template>/)
  if (match) {
    return match[1].trim()
  }

  // 尝试没有闭合标签的情况
  const startMatch = code.match(/<template>([\s\S]*)/)
  if (startMatch) {
    return startMatch[1].split(/<\/?script/)[0].trim()
  }

  return ''
}

/**
 * 提取 script 部分
 */
export function extractScript(code: string): string {
  // 匹配 <script setup> 或 <script>
  const match = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
  if (match) {
    return match[1].trim()
  }

  return ''
}

/**
 * 提取 style 部分
 */
export function extractStyle(code: string): string {
  const match = code.match(/<style[^>]*>([\s\S]*?)<\/style>/)
  if (match) {
    return match[1].trim()
  }

  return ''
}

// ============================================================
//  内部辅助函数
// ============================================================

/**
 * 去除 markdown 代码块包裹
 */
function stripCodeBlock(raw: string): string {
  // 匹配 ```lang\n...\n``` 格式
  const codeBlockMatch = raw.match(/```(?:\w*)\n([\s\S]*?)\n```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // 匹配 ```lang...``` 单行格式
  const singleLineMatch = raw.match(/```(\w*)\s*([\s\S]*?)```/)
  if (singleLineMatch) {
    return singleLineMatch[2].trim()
  }

  return raw.trim()
}

/**
 * 检测样式预处理器
 */
function detectStylePreprocessor(code: string): ExtractedProp['stylePreprocessor'] | undefined {
  const match = code.match(/<style\s+[^>]*(scss|less|stylus)/)
  if (match) {
    return match[1] as 'scss' | 'less' | 'stylus'
  }
  return 'css'
}

/**
 * 提取组件名称
 */
function extractComponentName(code: string): string | undefined {
  // 从 defineComponent 中提取
  const defineMatch = code.match(/defineComponent\s*\(\s*['"](\w+)['"]/)
  if (defineMatch) return defineMatch[1]

  // 从文件注释中提取
  const commentMatch = code.match(/<!--\s*(\w[\w-]*)\s*(?:Component|Page|组件|页面)/i)
  if (commentMatch) return commentMatch[1]

  return undefined
}

/**
 * 提取 Props 定义
 */
function extractProps(script: string): ExtractedProp[] | undefined {
  const props: ExtractedProp[] = []

  // 匹配 defineProps 中的对象格式
  const definePropsMatch = script.match(/defineProps\s*\(\s*\{([\s\S]*?)\}\s*\)/)
  if (definePropsMatch) {
    const propsContent = definePropsMatch[1]
    const propMatches = propsContent.matchAll(
      /(\w+)\s*:\s*\{[^}]*type\s*:\s*(\w+)[^}]*\}/g
    )
    for (const match of propMatches) {
      const prop: ExtractedProp = {
        name: match[1],
        type: match[2],
      }
      const requiredMatch = match[0].match(/required\s*:\s*true/)
      if (requiredMatch) prop.required = true
      const defaultMatch = match[0].match(/default\s*:\s*([^,}]+)/)
      if (defaultMatch) prop.default = defaultMatch[1].trim()
      props.push(prop)
    }
  }

  // 匹配 withDefaults + defineProps 泛型格式
  const genericMatch = script.match(/defineProps\s*<\s*\{([^}]+)\}\s*>/)
  if (genericMatch) {
    const typeContent = genericMatch[1]
    const propDefs = typeContent.split(';').map(s => s.trim()).filter(Boolean)
    for (const def of propDefs) {
      const parts = def.split(':').map(s => s.trim())
      if (parts.length >= 2) {
        const name = parts[0].replace('?', '').trim()
        const type = parts[1].trim()
        const prop: ExtractedProp = { name, type }
        if (parts[0].includes('?')) prop.required = false
        else prop.required = true
        props.push(prop)
      }
    }
  }

  return props.length > 0 ? props : undefined
}

/**
 * 提取 Emits 定义
 */
function extractEmits(script: string): string[] | undefined {
  // 匹配 defineEmits 数组格式
  const arrayMatch = script.match(/defineEmits\s*\(\s*\[([\s\S]*?)\]\s*\)/)
  if (arrayMatch) {
    const content = arrayMatch[1]
    const events = content.match(/['"](\w[\w-]*)['"]/g)
    if (events) {
      return events.map(e => e.replace(/['"]/g, ''))
    }
  }

  return undefined
}

/**
 * 提取 Slots 使用
 */
function extractSlots(template: string): string[] | undefined {
  const slots: string[] = []

  // 匹配 <slot name="xxx">
  const namedSlots = template.matchAll(/<slot\s+name=["'](\w[\w-]*)["']/g)
  for (const match of namedSlots) {
    if (!slots.includes(match[1])) {
      slots.push(match[1])
    }
  }

  // 检查是否有默认 slot（<slot></slot> 或 <slot>）
  const hasDefaultSlot = /<slot\s*>/.test(template) || /<slot>\s*<\/slot>/.test(template)
  if (hasDefaultSlot && !slots.includes('default')) {
    slots.unshift('default')
  }

  return slots.length > 0 ? slots : undefined
}

// ============================================================
//  验证函数
// ============================================================

/**
 * 验证 template 部分
 */
function validateTemplate(template: string, errors: ValidationError[], warnings: ValidationWarning[]) {
  // 检查是否有根元素
  const rootMatch = template.match(/^\s*<(\w[\w-]*)/)
  if (!rootMatch) {
    errors.push({
      level: 'error',
      message: 'template 缺少根元素',
      section: 'template',
    })
    return
  }

  // 检查模板标签是否闭合
  const openTags = template.match(/<(\w[\w-]*)\s/g) || []
  const closeTags = template.match(/<\/(\w[\w-]*)>/g) || []

  // 简单的标签匹配检查（不处理自闭合标签）
  const selfClosing = template.match(/<\w[\w-]*\s*\/>/g) || []
  const openCount = openTags.length - selfClosing.length
  const closeCount = closeTags.length

  if (openCount !== closeCount) {
    warnings.push({
      level: 'warning',
      message: `template 标签可能未正确闭合（开标签: ${openCount}, 闭标签: ${closeCount}）`,
      section: 'template',
    })
  }

  // 检查是否有 v- 前缀指令（Lyt.js 不需要）
  const vDirectives = template.matchAll(/\sv-(\w+)=/g)
  for (const match of vDirectives) {
    warnings.push({
      level: 'warning',
      message: `Lyt.js 不需要 v- 前缀，建议将 v-${match[1]} 改为 ${match[1]}`,
      section: 'template',
    })
  }
}

/**
 * 验证 script 部分
 */
function validateScript(script: string, errors: ValidationError[], warnings: ValidationWarning[]) {
  // 检查是否有未闭合的括号
  let braceCount = 0
  let parenCount = 0
  let bracketCount = 0

  for (const char of script) {
    if (char === '{') braceCount++
    else if (char === '}') braceCount--
    else if (char === '(') parenCount++
    else if (char === ')') parenCount--
    else if (char === '[') bracketCount++
    else if (char === ']') bracketCount--
  }

  if (braceCount !== 0) {
    errors.push({
      level: 'error',
      message: `花括号未正确闭合（差 ${Math.abs(braceCount)} 个）`,
      section: 'script',
    })
  }

  if (parenCount !== 0) {
    errors.push({
      level: 'error',
      message: `圆括号未正确闭合（差 ${Math.abs(parenCount)} 个）`,
      section: 'script',
    })
  }

  if (bracketCount !== 0) {
    errors.push({
      level: 'error',
      message: `方括号未正确闭合（差 ${Math.abs(bracketCount)} 个）`,
      section: 'script',
    })
  }

  // 检查导入路径
  const importMatches = script.matchAll(/from\s+['"]([^'"]+)['"]/g)
  for (const match of importMatches) {
    const importPath = match[1]
    if (importPath.startsWith('vue')) {
      warnings.push({
        level: 'warning',
        message: `Lyt.js 使用 @lytjs/* 包，建议将 ${importPath} 替换为对应的 @lytjs/* 包`,
        section: 'script',
      })
    }
  }
}

/**
 * 验证 style 部分
 */
function validateStyle(style: string, errors: ValidationError[], warnings: ValidationWarning[]) {
  // 检查是否有未闭合的花括号
  let braceCount = 0
  for (const char of style) {
    if (char === '{') braceCount++
    else if (char === '}') braceCount--
  }

  if (braceCount !== 0) {
    errors.push({
      level: 'error',
      message: `CSS 花括号未正确闭合（差 ${Math.abs(braceCount)} 个）`,
      section: 'style',
    })
  }

  // 检查是否有深层选择器（::v-deep 在 Lyt.js 中的兼容性）
  if (style.includes('::v-deep') || style.includes('/deep/')) {
    warnings.push({
      level: 'warning',
      message: '建议使用 :deep() 替代 ::v-deep 或 /deep/',
      section: 'style',
    })
  }
}

/**
 * 验证 Lyt.js 语法兼容性
 */
function validateLytjsCompatibility(code: string, warnings: ValidationWarning[]) {
  // 检查 Vue 3 特有 API
  const vue3Patterns = [
    { pattern: /createApp\([^)]*\)\s*\.mount\(/, message: 'Lyt.js 使用 createApp，确保导入来自 @lytjs/core' },
    { pattern: /import.*from\s+['"]vue['"]/, message: 'Lyt.js 不使用 vue 包，请使用 @lytjs/* 包' },
    { pattern: /\bv-html\s*=/, message: 'Lyt.js 中使用 html="..." 替代 v-html' },
    { pattern: /\bv-text\s*=/, message: 'Lyt.js 中使用 text="..." 替代 v-text' },
    { pattern: /\bv-once\s*=/, message: 'Lyt.js 中使用 once="..." 替代 v-once' },
    { pattern: /\bv-pre\s*=/, message: 'Lyt.js 中使用 pre="..." 替代 v-pre' },
    { pattern: /\bv-cloak\s*=/, message: 'Lyt.js 中使用 cloak="..." 替代 v-cloak' },
  ]

  for (const { pattern, message } of vue3Patterns) {
    if (pattern.test(code)) {
      warnings.push({
        level: 'warning',
        message,
      })
    }
  }
}
