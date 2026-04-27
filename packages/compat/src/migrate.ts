/**
 * Vue 3 到 Lyt.js 迁移工具
 *
 * 提供代码级别的迁移分析和转换功能，帮助用户从 Vue 3 平滑迁移到 Lyt.js。
 */

import { VueSfcConverter, convertVueSfcToLytWithWarnings } from './sfc-converter'

/**
 * 迁移问题类型
 */
export type MigrationIssueType =
  | 'import'        // 导入语句需要修改
  | 'directive'     // 指令语法需要修改
  | 'lifecycle'     // 生命周期钩子差异
  | 'api'           // API 差异
  | 'component'     // 组件相关差异
  | 'style'         // 样式相关差异
  | 'feature'       // 功能不支持
  | 'ecosystem'     // 生态系统差异

/**
 * 迁移问题严重程度
 */
export type MigrationSeverity = 'error' | 'warning' | 'info'

/**
 * 迁移问题
 */
export interface MigrationIssue {
  type: MigrationIssueType
  severity: MigrationSeverity
  description: string
  suggestion: string
  line?: number
  original?: string
  replacement?: string
}

/**
 * 迁移报告
 */
export interface MigrationReport {
  /** 转换后的代码 */
  code: string
  /** 所有迁移问题 */
  issues: MigrationIssue[]
  /** 错误数量 */
  errorCount: number
  /** 警告数量 */
  warningCount: number
  /** 信息数量 */
  infoCount: number
  /** 兼容性评分（0-100） */
  compatibilityScore: number
  /** 需要手动修改的部分 */
  manualFixes: string[]
}

/**
 * 分析 Vue 3 代码中的迁移问题
 */
function analyzeMigrationIssues(source: string): MigrationIssue[] {
  const issues: MigrationIssue[] = []
  const lines = source.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // 检查 Vue 导入
    if (/from\s+['"]vue['"]/.test(line)) {
      issues.push({
        type: 'import',
        severity: 'warning',
        description: '从 "vue" 导入需要替换为 "@lytjs/compat"',
        suggestion: '将 from "vue" 替换为 from "@lytjs/compat"',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/from\s+['"]vue['"]/, "from '@lytjs/compat'"),
      })
    }

    // 检查 Vue Router 导入
    if (/from\s+['"]vue-router['"]/.test(line)) {
      issues.push({
        type: 'ecosystem',
        severity: 'warning',
        description: 'vue-router 需要替换为 @lytjs/router',
        suggestion: '将 from "vue-router" 替换为 from "@lytjs/router"',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/from\s+['"]vue-router['"]/, "from '@lytjs/router'"),
      })
    }

    // 检查 Pinia 导入
    if (/from\s+['"]pinia['"]/.test(line)) {
      issues.push({
        type: 'ecosystem',
        severity: 'warning',
        description: 'Pinia 需要替换为 @lytjs/store',
        suggestion: '将 from "pinia" 替换为 from "@lytjs/store"，并调整 API 调用',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/from\s+['"]pinia['"]/, "from '@lytjs/store'"),
      })
    }

    // 检查 Vuex 导入
    if (/from\s+['"]vuex['"]/.test(line)) {
      issues.push({
        type: 'ecosystem',
        severity: 'warning',
        description: 'Vuex 需要替换为 @lytjs/store',
        suggestion: '将 from "vuex" 替换为 from "@lytjs/store"，并调整 API 调用',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/from\s+['"]vuex['"]/, "from '@lytjs/store'"),
      })
    }

    // 检查 v-for 指令
    if (/v-for=/.test(line)) {
      issues.push({
        type: 'directive',
        severity: 'warning',
        description: 'v-for 需要转换为 v-each',
        suggestion: '将 v-for="..." 替换为 v-each="..."',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/v-for=/, 'v-each='),
      })
    }

    // 检查 v-if 指令
    if (/v-if=/.test(line)) {
      issues.push({
        type: 'directive',
        severity: 'info',
        description: 'v-if 需要转换为 if',
        suggestion: '将 v-if="..." 替换为 if="..."',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/v-if=/, 'if='),
      })
    }

    // 检查 v-else-if 指令
    if (/v-else-if=/.test(line)) {
      issues.push({
        type: 'directive',
        severity: 'info',
        description: 'v-else-if 需要转换为 else-if',
        suggestion: '将 v-else-if="..." 替换为 else-if="..."',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/v-else-if=/, 'else-if='),
      })
    }

    // 检查 v-else 指令
    if (/\bv-else\b/.test(line)) {
      issues.push({
        type: 'directive',
        severity: 'info',
        description: 'v-else 需要转换为 else',
        suggestion: '将 v-else 替换为 else',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/\bv-else\b/, 'else'),
      })
    }

    // 检查 v-show 指令
    if (/v-show=/.test(line)) {
      issues.push({
        type: 'directive',
        severity: 'info',
        description: 'v-show 需要转换为 show',
        suggestion: '将 v-show="..." 替换为 show="..."',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/v-show=/, 'show='),
      })
    }

    // 检查 v-model 指令
    if (/v-model/.test(line)) {
      issues.push({
        type: 'directive',
        severity: 'info',
        description: 'v-model 需要转换为 model',
        suggestion: '将 v-model="..." 替换为 model="..."',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/v-model/, 'model'),
      })
    }

    // 检查 v-on: 指令
    if (/v-on:/.test(line)) {
      issues.push({
        type: 'directive',
        severity: 'info',
        description: 'v-on: 需要转换为 on:',
        suggestion: '将 v-on:click="..." 替换为 on:click="..." 或 @click="..."',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/v-on:/, 'on:'),
      })
    }

    // 检查 v-bind: 指令
    if (/v-bind:/.test(line)) {
      issues.push({
        type: 'directive',
        severity: 'info',
        description: 'v-bind: 可以简写为 :',
        suggestion: '将 v-bind:attr="..." 替换为 :attr="..."',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/v-bind:/, ':'),
      })
    }

    // 检查 v-slot: 指令
    if (/v-slot:/.test(line)) {
      issues.push({
        type: 'directive',
        severity: 'info',
        description: 'v-slot: 需要转换为 slot:',
        suggestion: '将 v-slot:name 替换为 slot:name 或 #name',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/v-slot:/, 'slot:'),
      })
    }

    // 检查 v-html 指令
    if (/v-html=/.test(line)) {
      issues.push({
        type: 'directive',
        severity: 'info',
        description: 'v-html 需要转换为 html',
        suggestion: '将 v-html="..." 替换为 html="..."',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/v-html=/, 'html='),
      })
    }

    // 检查 v-text 指令
    if (/v-text=/.test(line)) {
      issues.push({
        type: 'directive',
        severity: 'info',
        description: 'v-text 需要转换为 text',
        suggestion: '将 v-text="..." 替换为 text="..."',
        line: lineNum,
        original: line.trim(),
        replacement: line.trim().replace(/v-text=/, 'text='),
      })
    }

    // 检查 v-memo 指令
    if (/v-memo/.test(line)) {
      issues.push({
        type: 'feature',
        severity: 'error',
        description: 'v-memo 在 Lyt.js 中不支持',
        suggestion: '使用 computed 属性替代手动缓存逻辑',
        line: lineNum,
        original: line.trim(),
      })
    }

    // 检查 $refs 使用
    if (/\$refs/.test(line)) {
      issues.push({
        type: 'api',
        severity: 'warning',
        description: '$refs 在 Lyt.js 中不支持',
        suggestion: '使用 ref() 和模板 ref 属性替代',
        line: lineNum,
        original: line.trim(),
      })
    }

    // 检查 $emit 使用
    if (/\$emit/.test(line)) {
      issues.push({
        type: 'api',
        severity: 'warning',
        description: '$emit 在 Lyt.js 中不支持',
        suggestion: '使用 setup 上下文中的 emit 函数替代',
        line: lineNum,
        original: line.trim(),
      })
    }

    // 检查 $el 使用
    if (/\$el/.test(line)) {
      issues.push({
        type: 'api',
        severity: 'warning',
        description: '$el 在 Lyt.js 中不支持',
        suggestion: '使用 template ref 替代',
        line: lineNum,
        original: line.trim(),
      })
    }

    // 检查 $parent 使用
    if (/\$parent/.test(line)) {
      issues.push({
        type: 'api',
        severity: 'warning',
        description: '$parent 在 Lyt.js 中不支持',
        suggestion: '使用 provide/inject 替代',
        line: lineNum,
        original: line.trim(),
      })
    }

    // 检查 $children 使用
    if (/\$children/.test(line)) {
      issues.push({
        type: 'api',
        severity: 'error',
        description: '$children 在 Lyt.js 中不支持',
        suggestion: '使用 provide/inject 或事件总线替代',
        line: lineNum,
        original: line.trim(),
      })
    }

    // 检查 $forceUpdate 使用
    if (/\$forceUpdate/.test(line)) {
      issues.push({
        type: 'api',
        severity: 'warning',
        description: '$forceUpdate 在 Lyt.js 中不需要',
        suggestion: 'Lyt.js 的响应式系统会自动触发更新',
        line: lineNum,
        original: line.trim(),
      })
    }

    // 检查 $nextTick 使用
    if (/\$nextTick/.test(line)) {
      issues.push({
        type: 'api',
        severity: 'info',
        description: '$nextTick 需要替换为独立的 nextTick 函数',
        suggestion: 'import { nextTick } from "@lytjs/compat"',
        line: lineNum,
        original: line.trim(),
      })
    }

    // 检查 defineProps 使用
    if (/defineProps/.test(line)) {
      issues.push({
        type: 'api',
        severity: 'warning',
        description: 'defineProps 是编译器宏，需要手动转换',
        suggestion: '在 defineComponent({ props: {...} }) 中定义 props',
        line: lineNum,
        original: line.trim(),
      })
    }

    // 检查 defineEmits 使用
    if (/defineEmits/.test(line)) {
      issues.push({
        type: 'api',
        severity: 'warning',
        description: 'defineEmits 是编译器宏，需要手动转换',
        suggestion: '在 defineComponent({ emits: [...] }) 中定义 emits',
        line: lineNum,
        original: line.trim(),
      })
    }

    // 检查 defineExpose 使用
    if (/defineExpose/.test(line)) {
      issues.push({
        type: 'api',
        severity: 'info',
        description: 'defineExpose 在 Lyt.js 中不需要',
        suggestion: 'setup 返回值自动暴露为公共属性',
        line: lineNum,
        original: line.trim(),
      })
    }

    // 检查 CSS Modules
    if (/<style[^>]*module/.test(line)) {
      issues.push({
        type: 'style',
        severity: 'error',
        description: 'CSS Modules 在 Lyt.js 中不支持',
        suggestion: '使用 scoped 样式替代',
        line: lineNum,
        original: line.trim(),
      })
    }

    // 检查 Teleport 组件
    if (/<Teleport/.test(line)) {
      issues.push({
        type: 'component',
        severity: 'info',
        description: 'Teleport 组件已通过 @lytjs/compat 提供',
        suggestion: '确保从 @lytjs/compat 导入 Teleport',
        line: lineNum,
      })
    }

    // 检查 Suspense 组件
    if (/<Suspense/.test(line)) {
      issues.push({
        type: 'component',
        severity: 'info',
        description: 'Suspense 组件已通过 @lytjs/compat 提供',
        suggestion: '确保从 @lytjs/compat 导入 Suspense',
        line: lineNum,
      })
    }

    // 检查 KeepAlive 组件
    if (/<KeepAlive/.test(line)) {
      issues.push({
        type: 'component',
        severity: 'info',
        description: 'KeepAlive 组件已通过 @lytjs/compat 提供',
        suggestion: '确保从 @lytjs/compat 导入 KeepAlive',
        line: lineNum,
      })
    }
  }

  return issues
}

/**
 * 计算兼容性评分
 */
function calculateCompatibilityScore(issues: MigrationIssue[]): number {
  if (issues.length === 0) return 100

  let score = 100

  for (const issue of issues) {
    switch (issue.severity) {
      case 'error':
        score -= 15
        break
      case 'warning':
        score -= 5
        break
      case 'info':
        score -= 1
        break
    }
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * 生成需要手动修改的列表
 */
function generateManualFixes(issues: MigrationIssue[]): string[] {
  const fixes: string[] = []
  const seen = new Set<string>()

  for (const issue of issues) {
    if (issue.severity === 'error' || issue.severity === 'warning') {
      const key = `${issue.type}:${issue.description}`
      if (!seen.has(key)) {
        seen.add(key)
        fixes.push(`- [${issue.severity.toUpperCase()}] ${issue.description}: ${issue.suggestion}`)
      }
    }
  }

  return fixes
}

/**
 * 迁移 Vue 3 SFC 代码到 Lyt.js
 *
 * @param source - Vue 3 SFC 源代码
 * @returns 迁移报告，包含转换后的代码和问题列表
 *
 * @example
 * ```typescript
 * import { migrateVueFile } from '@lytjs/compat/migrate'
 *
 * const report = migrateVueFile(`
 * <template>
 *   <div v-if="show">{{ message }}</div>
 * </template>
 *
 * <script setup>
 * import { ref } from 'vue'
 * const message = ref('Hello')
 * </script>
 * `)
 *
 * console.log(report.code)           // 转换后的代码
 * console.log(report.issues)         // 迁移问题列表
 * console.log(report.compatibilityScore) // 兼容性评分
 * ```
 */
export function migrateVueFile(source: string): MigrationReport {
  // 使用 SFC 转换器进行代码转换
  const conversionResult = convertVueSfcToLytWithWarnings(source)

  // 分析迁移问题
  const issues = analyzeMigrationIssues(source)

  // 将 SFC 转换器的警告也加入问题列表
  for (const warning of conversionResult.warnings) {
    issues.push({
      type: warning.type as MigrationIssueType,
      severity: 'warning',
      description: warning.message,
      suggestion: warning.suggestion || '',
    })
  }

  // 计算统计
  const errorCount = issues.filter(i => i.severity === 'error').length
  const warningCount = issues.filter(i => i.severity === 'warning').length
  const infoCount = issues.filter(i => i.severity === 'info').length

  return {
    code: conversionResult.code,
    issues,
    errorCount,
    warningCount,
    infoCount,
    compatibilityScore: calculateCompatibilityScore(issues),
    manualFixes: generateManualFixes(issues),
  }
}

/**
 * 分析 Vue 3 代码的迁移可行性（不执行转换）
 *
 * @param source - Vue 3 SFC 源代码
 * @returns 迁移问题列表
 */
export function analyzeVueFile(source: string): MigrationIssue[] {
  return analyzeMigrationIssues(source)
}

/**
 * 生成迁移摘要报告（文本格式）
 *
 * @param report - 迁移报告
 * @returns 格式化的文本报告
 */
export function formatMigrationReport(report: MigrationReport): string {
  const lines: string[] = []

  lines.push('========================================')
  lines.push('  Vue 3 -> Lyt.js 迁移报告')
  lines.push('========================================')
  lines.push('')

  // 评分
  lines.push(`兼容性评分: ${report.compatibilityScore}/100`)
  if (report.compatibilityScore >= 80) {
    lines.push('迁移难度: 低 - 大部分代码可以自动转换')
  } else if (report.compatibilityScore >= 50) {
    lines.push('迁移难度: 中 - 需要一些手动调整')
  } else {
    lines.push('迁移难度: 高 - 需要大量手动修改')
  }
  lines.push('')

  // 统计
  lines.push(`问题统计:`)
  lines.push(`  错误: ${report.errorCount}`)
  lines.push(`  警告: ${report.warningCount}`)
  lines.push(`  信息: ${report.infoCount}`)
  lines.push('')

  // 需要手动修改的部分
  if (report.manualFixes.length > 0) {
    lines.push('需要手动修改的部分:')
    for (const fix of report.manualFixes) {
      lines.push(`  ${fix}`)
    }
    lines.push('')
  }

  // 详细问题列表
  if (report.issues.length > 0) {
    lines.push('详细问题列表:')
    lines.push('')

    // 按类型分组
    const grouped = new Map<MigrationIssueType, MigrationIssue[]>()
    for (const issue of report.issues) {
      const list = grouped.get(issue.type) || []
      list.push(issue)
      grouped.set(issue.type, list)
    }

    const typeLabels: Record<MigrationIssueType, string> = {
      import: '导入语句',
      directive: '指令语法',
      lifecycle: '生命周期',
      api: 'API 差异',
      component: '组件',
      style: '样式',
      feature: '不支持的功能',
      ecosystem: '生态系统',
    }

    for (const [type, typeIssues] of grouped) {
      lines.push(`  [${typeLabels[type]}]`)
      for (const issue of typeIssues) {
        const location = issue.line ? ` (行 ${issue.line})` : ''
        lines.push(`    ${issue.severity.toUpperCase()}: ${issue.description}${location}`)
        lines.push(`      建议: ${issue.suggestion}`)
      }
      lines.push('')
    }
  }

  lines.push('========================================')

  return lines.join('\n')
}
