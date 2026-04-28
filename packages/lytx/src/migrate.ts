/**
 * LytX CLI - migrate 命令
 *
 * 提供 Vue 3 到 Lyt.js 的迁移分析和自动转换功能。
 *
 * 用法：
 *   lytx migrate              - 分析当前目录下的 Vue 3 项目
 *   lytx migrate --apply      - 执行自动转换
 *   lytx migrate --dry-run    - 只报告不修改
 *   lytx migrate <path>       - 指定目录
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ================================================================
//  类型定义
// ================================================================

export interface MigrateOptions {
  /** 执行路径 */
  dir: string
  /** 是否执行转换 */
  apply: boolean
  /** 只报告不修改 */
  dryRun: boolean
  /** 详细输出 */
  verbose: boolean
}

export interface MigrateResult {
  /** 扫描的文件数 */
  totalFiles: number
  /** 需要迁移的文件数 */
  affectedFiles: number
  /** 总问题数 */
  totalIssues: number
  /** 错误数 */
  errorCount: number
  /** 警告数 */
  warningCount: number
  /** 信息数 */
  infoCount: number
  /** 兼容性评分 (0-100) */
  compatibilityScore: number
  /** 各文件的问题列表 */
  fileReports: FileMigrateReport[]
}

export interface FileMigrateReport {
  /** 文件相对路径 */
  file: string
  /** 问题数量 */
  issueCount: number
  /** 是否为 Vue SFC */
  isVueFile: boolean
}

// ================================================================
//  Vue 3 API 检测模式
// ================================================================

interface DetectionPattern {
  pattern: RegExp
  description: string
  severity: 'error' | 'warning' | 'info'
  suggestion: string
}

const vuePatterns: DetectionPattern[] = [
  // 导入
  { pattern: /from\s+['"]vue['"]/, description: '从 "vue" 导入', severity: 'warning', suggestion: '替换为 from "@lytjs/compat"' },
  { pattern: /from\s+['"]vue-router['"]/, description: '从 "vue-router" 导入', severity: 'warning', suggestion: '替换为 from "@lytjs/plugin-vue-router"' },
  { pattern: /from\s+['"]pinia['"]/, description: '从 "pinia" 导入', severity: 'warning', suggestion: '替换为 from "@lytjs/plugin-pinia"' },
  { pattern: /from\s+['"]vuex['"]/, description: '从 "vuex" 导入', severity: 'warning', suggestion: '替换为 from "@lytjs/store"' },

  // 指令
  { pattern: /\bv-for=/, description: 'v-for 指令', severity: 'info', suggestion: '替换为 v-each' },
  { pattern: /\bv-if=/, description: 'v-if 指令', severity: 'info', suggestion: '替换为 if' },
  { pattern: /\bv-else-if=/, description: 'v-else-if 指令', severity: 'info', suggestion: '替换为 else-if' },
  { pattern: /\bv-else\b/, description: 'v-else 指令', severity: 'info', suggestion: '替换为 else' },
  { pattern: /\bv-show=/, description: 'v-show 指令', severity: 'info', suggestion: '替换为 show' },
  { pattern: /\bv-model:/, description: 'v-model 命名参数', severity: 'warning', suggestion: '替换为 model:' },
  { pattern: /\bv-model(?![\w-])/, description: 'v-model 指令', severity: 'info', suggestion: '替换为 model' },
  { pattern: /\bv-on:/, description: 'v-on: 指令', severity: 'info', suggestion: '替换为 on:' },
  { pattern: /\bv-bind:/, description: 'v-bind: 指令', severity: 'info', suggestion: '替换为 :' },
  { pattern: /\bv-slot:/, description: 'v-slot: 指令', severity: 'info', suggestion: '替换为 slot:' },
  { pattern: /\bv-html=/, description: 'v-html 指令', severity: 'info', suggestion: '替换为 html' },
  { pattern: /\bv-text=/, description: 'v-text 指令', severity: 'info', suggestion: '替换为 text' },
  { pattern: /\bv-memo/, description: 'v-memo 指令', severity: 'error', suggestion: '不支持，使用 computed 替代' },

  // API
  { pattern: /\$refs/, description: '$refs 使用', severity: 'warning', suggestion: '使用 ref() 替代' },
  { pattern: /\$emit/, description: '$emit 使用', severity: 'warning', suggestion: '使用 setup 上下文中的 emit' },
  { pattern: /\$el/, description: '$el 使用', severity: 'warning', suggestion: '使用 template ref 替代' },
  { pattern: /\$parent/, description: '$parent 使用', severity: 'warning', suggestion: '使用 provide/inject 替代' },
  { pattern: /\$children/, description: '$children 使用', severity: 'error', suggestion: '使用 provide/inject 或事件总线替代' },
  { pattern: /\$forceUpdate/, description: '$forceUpdate 使用', severity: 'warning', suggestion: 'Lyt.js 自动触发更新' },
  { pattern: /\$nextTick/, description: '$nextTick 使用', severity: 'info', suggestion: '使用独立的 nextTick 函数' },

  // 编译器宏
  { pattern: /\bdefineProps\b/, description: 'defineProps 宏', severity: 'warning', suggestion: '在 defineComponent({ props }) 中定义' },
  { pattern: /\bdefineEmits\b/, description: 'defineEmits 宏', severity: 'warning', suggestion: '在 defineComponent({ emits }) 中定义' },
  { pattern: /\bdefineExpose\b/, description: 'defineExpose 宏', severity: 'info', suggestion: 'Lyt.js 中不需要' },
  { pattern: /\bdefineModel\b/, description: 'defineModel (Vue 3.4+)', severity: 'warning', suggestion: '使用 modelValue prop + update:modelValue 事件' },
  { pattern: /\buseTemplateRef\b/, description: 'useTemplateRef (Vue 3.5+)', severity: 'warning', suggestion: '使用 ref() 配合 template ref' },
  { pattern: /\bdefineSlots\b/, description: 'defineSlots (Vue 3.3+)', severity: 'info', suggestion: 'Lyt.js slots 通过上下文自动可用' },
  { pattern: /\btoValue\b/, description: 'toValue', severity: 'info', suggestion: '使用 @lytjs/compat 兼容函数' },
  { pattern: /\btoRefs\b/, description: 'toRefs', severity: 'info', suggestion: '使用 @lytjs/compat 兼容函数' },
  { pattern: /\buseId\b/, description: 'useId (Vue 3.5+)', severity: 'info', suggestion: '使用 @lytjs/compat 兼容函数' },

  // 语法
  { pattern: /<script[^>]*setup[^>]*>/, description: '<script setup> 语法', severity: 'warning', suggestion: '转换为 defineComponent({ setup() })' },
  { pattern: /<style[^>]*module/, description: 'CSS Modules', severity: 'error', suggestion: '使用 scoped 样式替代' },
  { pattern: /<style[^>]*scoped/, description: '<style scoped>', severity: 'warning', suggestion: '转换为 Lyt.js scoped 样式' },

  // 组件
  { pattern: /<Teleport/, description: 'Teleport 组件', severity: 'info', suggestion: '从 @lytjs/compat 导入' },
  { pattern: /<Suspense/, description: 'Suspense 组件', severity: 'info', suggestion: '从 @lytjs/compat 导入' },
  { pattern: /<KeepAlive/, description: 'KeepAlive 组件', severity: 'info', suggestion: '从 @lytjs/compat 导入' },
  { pattern: /<Transition[^>]*>/, description: 'Transition 组件', severity: 'info', suggestion: '从 @lytjs/compat 导入' },
  { pattern: /<TransitionGroup/, description: 'TransitionGroup 组件', severity: 'info', suggestion: '从 @lytjs/compat 导入' },

  // 生态系统
  { pattern: /\bdefineStore\b/, description: 'Pinia defineStore', severity: 'warning', suggestion: '替换为 @lytjs/plugin-pinia' },
  { pattern: /\bcreatePinia\b/, description: 'Pinia createPinia', severity: 'warning', suggestion: '替换为 @lytjs/plugin-pinia' },
  { pattern: /\buseRoute\b/, description: 'Vue Router useRoute', severity: 'warning', suggestion: '替换为 @lytjs/plugin-vue-router' },
  { pattern: /\buseRouter\b/, description: 'Vue Router useRouter', severity: 'warning', suggestion: '替换为 @lytjs/plugin-vue-router' },
  { pattern: /\bcreateRouter\b/, description: 'Vue Router createRouter', severity: 'warning', suggestion: '替换为 @lytjs/plugin-vue-router' },
]

// ================================================================
//  分析函数
// ================================================================

/**
 * 分析单个文件
 */
function analyzeFile(filePath: string): { issues: Array<{ description: string; severity: string; suggestion: string; line: number }> } {
  const source = fs.readFileSync(filePath, 'utf-8')
  const issues: Array<{ description: string; severity: string; suggestion: string; line: number }> = []
  const lines = source.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const pattern of vuePatterns) {
      if (pattern.pattern.test(line)) {
        issues.push({
          description: pattern.description,
          severity: pattern.severity,
          suggestion: pattern.suggestion,
          line: i + 1,
        })
        pattern.pattern.lastIndex = 0
      }
    }
  }

  return { issues }
}

/**
 * 计算兼容性评分
 */
function calculateScore(totalIssues: number, errorCount: number, warningCount: number, infoCount: number): number {
  if (totalIssues === 0) return 100
  let score = 100
  score -= errorCount * 15
  score -= warningCount * 5
  score -= infoCount * 1
  return Math.max(0, Math.min(100, score))
}

// ================================================================
//  主函数
// ================================================================

/**
 * 执行迁移分析
 *
 * @param options 迁移选项
 * @returns 迁移结果
 */
export function runMigrate(options: MigrateOptions): MigrateResult {
  const absDir = path.resolve(options.dir)

  if (!fs.existsSync(absDir)) {
    throw new Error(`目录不存在: ${absDir}`)
  }

  const stat = fs.statSync(absDir)
  if (!stat.isDirectory()) {
    throw new Error(`路径不是目录: ${absDir}`)
  }

  console.log(`\n[LytX Migrate] 分析目录: ${absDir}`)
  console.log('')

  const targetExtensions = ['.vue', '.ts', '.tsx', '.js', '.jsx']
  const fileReports: FileMigrateReport[] = []
  let totalFiles = 0
  let affectedFiles = 0
  let totalIssues = 0
  let errorCount = 0
  let warningCount = 0
  let infoCount = 0

  // 递归扫描
  function scan(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (['node_modules', 'dist', '.git', '.next', 'build', 'coverage'].includes(entry.name)) {
          continue
        }
        scan(fullPath)
        continue
      }

      const ext = path.extname(entry.name)
      if (!targetExtensions.includes(ext)) continue

      totalFiles++
      const relPath = path.relative(absDir, fullPath)
      const result = analyzeFile(fullPath)

      if (result.issues.length > 0) {
        affectedFiles++
        totalIssues += result.issues.length

        for (const issue of result.issues) {
          if (issue.severity === 'error') errorCount++
          else if (issue.severity === 'warning') warningCount++
          else infoCount++
        }

        fileReports.push({
          file: relPath,
          issueCount: result.issues.length,
          isVueFile: ext === '.vue',
        })

        // 详细输出
        if (options.verbose) {
          console.log(`  ${relPath}: ${result.issues.length} 个问题`)
          for (const issue of result.issues) {
            console.log(`    L${issue.line} [${issue.severity.toUpperCase()}] ${issue.description}`)
            console.log(`      -> ${issue.suggestion}`)
          }
        }
      }
    }
  }

  scan(absDir)

  const compatibilityScore = calculateScore(totalIssues, errorCount, warningCount, infoCount)

  // 打印摘要
  console.log('========================================')
  console.log('  Vue 3 -> Lyt.js 迁移分析报告')
  console.log('========================================')
  console.log('')
  console.log(`扫描文件: ${totalFiles}`)
  console.log(`受影响文件: ${affectedFiles}`)
  console.log(`总问题数: ${totalIssues}`)
  console.log(`  错误: ${errorCount}`)
  console.log(`  警告: ${warningCount}`)
  console.log(`  信息: ${infoCount}`)
  console.log('')
  console.log(`兼容性评分: ${compatibilityScore}/100`)

  if (compatibilityScore >= 80) {
    console.log('迁移难度: 低 - 大部分代码可以自动转换')
  } else if (compatibilityScore >= 50) {
    console.log('迁移难度: 中 - 需要一些手动调整')
  } else {
    console.log('迁移难度: 高 - 需要大量手动修改')
  }

  if (!options.verbose && affectedFiles > 0) {
    console.log('')
    console.log('受影响文件:')
    for (const report of fileReports) {
      console.log(`  ${report.file} (${report.issueCount} 个问题)`)
    }
  }

  if (!options.apply && !options.dryRun && affectedFiles > 0) {
    console.log('')
    console.log('提示: 使用 --apply 执行自动转换, --dry-run 预览变更')
  }

  if (options.apply && affectedFiles > 0) {
    console.log('')
    console.log('执行自动转换...')
    try {
      // 动态导入 codemod 模块
      const { codemodDir } = require('@lytjs/compat/codemod')
      const results = codemodDir(absDir, { dryRun: false, verbose: options.verbose })
      console.log(`转换完成: ${results.length} 个文件已修改`)
    } catch (err: any) {
      console.warn(`自动转换失败: ${err.message}`)
      console.warn('请确保 @lytjs/compat 已安装')
    }
  }

  if (options.dryRun && affectedFiles > 0) {
    console.log('')
    console.log('[DRY RUN] 不会执行任何修改')
    try {
      const { codemodDir } = require('@lytjs/compat/codemod')
      const results = codemodDir(absDir, { dryRun: true, verbose: options.verbose })
      console.log(`预览完成: ${results.length} 个文件将被修改`)
    } catch (err: any) {
      console.warn(`预览失败: ${err.message}`)
    }
  }

  console.log('')
  console.log('========================================')

  return {
    totalFiles,
    affectedFiles,
    totalIssues,
    errorCount,
    warningCount,
    infoCount,
    compatibilityScore,
    fileReports,
  }
}

/**
 * 解析 migrate 命令参数
 */
export function parseMigrateArgs(args: string[]): MigrateOptions {
  const options: MigrateOptions = {
    dir: process.cwd(),
    apply: false,
    dryRun: false,
    verbose: false,
  }

  for (const arg of args) {
    if (arg === '--apply') {
      options.apply = true
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (!arg.startsWith('--')) {
      options.dir = arg
    }
  }

  return options
}
