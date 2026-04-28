/**
 * Lyt.js Codemod - Vue 3 到 Lyt.js 自动代码转换
 *
 * 提供自动化的代码转换功能，将 Vue 3 代码转换为 Lyt.js 兼容代码。
 * 支持单文件转换和目录批量转换。
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ================================================================
//  类型定义
// ================================================================

export interface CodemodOptions {
  /** 只报告不修改 */
  dryRun?: boolean
  /** 详细输出 */
  verbose?: boolean
}

export interface CodemodChange {
  /** 变更类型 */
  type: 'import' | 'template' | 'script' | 'style'
  /** 原始内容 */
  original: string
  /** 替换内容 */
  replacement: string
  /** 行号 */
  line: number
}

export interface CodemodResult {
  /** 文件路径 */
  file: string
  /** 变更列表 */
  changes: CodemodChange[]
  /** 转换后的代码（dryRun 时为原始代码） */
  transformedCode?: string
  /** 是否需要重命名文件扩展名 */
  needsRename?: boolean
}

// ================================================================
//  转换规则
// ================================================================

/** 导入转换规则 */
const importRules: Array<{
  pattern: RegExp
  replacement: string
  type: CodemodChange['type']
}> = [
  {
    pattern: /from\s+['"]vue['"]/g,
    replacement: "from '@lytjs/compat'",
    type: 'import',
  },
  {
    pattern: /from\s+['"]@vue\/reactivity['"]/g,
    replacement: "from '@lytjs/reactivity'",
    type: 'import',
  },
  {
    pattern: /from\s+['"]@vue\/runtime-core['"]/g,
    replacement: "from '@lytjs/compat'",
    type: 'import',
  },
  {
    pattern: /from\s+['"]vue-router['"]/g,
    replacement: "from '@lytjs/plugin-vue-router'",
    type: 'import',
  },
  {
    pattern: /from\s+['"]pinia['"]/g,
    replacement: "from '@lytjs/plugin-pinia'",
    type: 'import',
  },
]

/** 模板转换规则 */
const templateRules: Array<{
  pattern: RegExp
  replacement: string
  type: CodemodChange['type']
}> = [
  {
    pattern: /\bv-for=/g,
    replacement: 'v-each=',
    type: 'template',
  },
  {
    pattern: /\bv-if=/g,
    replacement: 'if=',
    type: 'template',
  },
  {
    pattern: /\bv-else-if=/g,
    replacement: 'else-if=',
    type: 'template',
  },
  {
    pattern: /\bv-else\b/g,
    replacement: 'else',
    type: 'template',
  },
  {
    pattern: /\bv-show=/g,
    replacement: 'show=',
    type: 'template',
  },
  {
    pattern: /\bv-on:/g,
    replacement: 'on:',
    type: 'template',
  },
  {
    pattern: /\bv-bind:/g,
    replacement: ':',
    type: 'template',
  },
  {
    pattern: /\bv-slot:/g,
    replacement: 'slot:',
    type: 'template',
  },
  {
    pattern: /\bv-html=/g,
    replacement: 'html=',
    type: 'template',
  },
  {
    pattern: /\bv-text=/g,
    replacement: 'text=',
    type: 'template',
  },
  {
    pattern: /\bv-model:/g,
    replacement: 'model:',
    type: 'template',
  },
  {
    pattern: /\bv-model(?![\w-])/g,
    replacement: 'model',
    type: 'template',
  },
]

/** 样式转换规则 */
const styleRules: Array<{
  pattern: RegExp
  replacement: string
  type: CodemodChange['type']
}> = [
  {
    pattern: /(<style[^>]*?)scoped([^>]*?>)/g,
    replacement: '$1$2/* [scoped] */',
    type: 'style',
  },
]

// ================================================================
//  核心转换函数
// ================================================================

/**
 * 对单个文件执行 codemod 转换
 *
 * @param filePath  文件路径
 * @param options   转换选项
 * @returns 转换结果
 */
export function codemodFile(filePath: string, options?: CodemodOptions): CodemodResult {
  const absPath = path.resolve(filePath)
  if (!fs.existsSync(absPath)) {
    throw new Error(`文件不存在: ${absPath}`)
  }

  const source = fs.readFileSync(absPath, 'utf-8')
  const changes: CodemodChange[] = []
  let transformed = source
  const lines = source.split('\n')

  // 检测是否为 .vue 文件
  const needsRename = absPath.endsWith('.vue')

  // ---- 1. 导入转换 ----
  for (const rule of importRules) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (rule.pattern.test(line)) {
        const original = line.trim()
        const replacement = line.trim().replace(rule.pattern, rule.replacement)
        if (original !== replacement) {
          changes.push({
            type: rule.type,
            original,
            replacement,
            line: i + 1,
          })
          // 应用转换
          transformed = transformed.replace(line, line.replace(rule.pattern, rule.replacement))
        }
        // 重置正则状态
        rule.pattern.lastIndex = 0
      }
    }
  }

  // ---- 2. 模板转换（仅在 <template> 标签内） ----
  const templateMatch = source.match(/<template[^>]*>([\s\S]*?)<\/template>/)
  if (templateMatch) {
    const templateContent = templateMatch[1]
    let newTemplate = templateContent

    for (const rule of templateRules) {
      const templateLines = templateContent.split('\n')
      for (let i = 0; i < templateLines.length; i++) {
        const line = templateLines[i]
        if (rule.pattern.test(line)) {
          const original = line.trim()
          const replacement = line.trim().replace(rule.pattern, rule.replacement)
          if (original !== replacement) {
            // 计算在源文件中的实际行号
            const templateStartLine = source.substring(0, source.indexOf(templateContent)).split('\n').length
            changes.push({
              type: rule.type,
              original,
              replacement,
              line: templateStartLine + i,
            })
          }
          rule.pattern.lastIndex = 0
        }
      }
      newTemplate = newTemplate.replace(rule.pattern, rule.replacement)
      rule.pattern.lastIndex = 0
    }

    transformed = transformed.replace(templateMatch[0], `<template>${newTemplate}</template>`)
  }

  // ---- 3. 样式转换 ----
  for (const rule of styleRules) {
    const styleMatch = source.match(rule.pattern)
    if (styleMatch) {
      const idx = source.indexOf(styleMatch[0])
      const lineNum = source.substring(0, idx).split('\n').length
      changes.push({
        type: rule.type,
        original: styleMatch[0],
        replacement: styleMatch[0].replace(rule.pattern, rule.replacement),
        line: lineNum,
      })
      transformed = transformed.replace(rule.pattern, rule.replacement)
      rule.pattern.lastIndex = 0
    }
  }

  // ---- 4. $refs 转换 ----
  const refsPattern = /\$refs\.(\w+)/g
  let refsMatch: RegExpExecArray | null
  const refsSource = transformed
  while ((refsMatch = refsPattern.exec(refsSource)) !== null) {
    const lineNum = refsSource.substring(0, refsMatch.index).split('\n').length
    changes.push({
      type: 'script',
      original: refsMatch[0],
      replacement: `refs.${refsMatch[1]}.value`,
      line: lineNum,
    })
  }
  transformed = transformed.replace(/\$refs\.(\w+)/g, 'refs.$1.value')

  // ---- 5. $emit 转换 ----
  const emitPattern = /\$emit\(/g
  const emitSource = transformed
  while ((refsMatch = emitPattern.exec(emitSource)) !== null) {
    const lineNum = emitSource.substring(0, refsMatch.index).split('\n').length
    changes.push({
      type: 'script',
      original: refsMatch[0],
      replacement: 'emit(',
      line: lineNum,
    })
  }
  transformed = transformed.replace(/\$emit\(/g, 'emit(')

  // ---- 6. $nextTick 转换 ----
  const nextTickPattern = /\$nextTick/g
  const ntSource = transformed
  while ((refsMatch = nextTickPattern.exec(ntSource)) !== null) {
    const lineNum = ntSource.substring(0, refsMatch.index).split('\n').length
    changes.push({
      type: 'script',
      original: refsMatch[0],
      replacement: 'nextTick',
      line: lineNum,
    })
  }
  transformed = transformed.replace(/\$nextTick/g, 'nextTick')

  // ---- 7. <script setup> 转换提示 ----
  if (/<script[^>]*setup[^>]*>/.test(transformed)) {
    const setupMatch = transformed.match(/<script[^>]*setup[^>]*>/)
    if (setupMatch) {
      const idx = transformed.indexOf(setupMatch[0])
      const lineNum = transformed.substring(0, idx).split('\n').length
      changes.push({
        type: 'script',
        original: setupMatch[0],
        replacement: '<!-- [MANUAL] 需要将 <script setup> 内容转换为 defineComponent({ setup() { ... } }) -->\n<script>',
        line: lineNum,
      })
      // 不自动转换 script setup，只添加注释提示
    }
  }

  // 详细输出
  if (options?.verbose && changes.length > 0) {
    console.log(`\n[codemod] ${absPath}:`)
    for (const change of changes) {
      console.log(`  L${change.line} [${change.type}] ${change.original} -> ${change.replacement}`)
    }
  }

  // 写入文件（非 dryRun 模式）
  if (!options?.dryRun && changes.length > 0) {
    fs.writeFileSync(absPath, transformed, 'utf-8')

    // 重命名 .vue -> .lyt
    if (needsRename) {
      const newPath = absPath.replace(/\.vue$/, '.lyt')
      fs.renameSync(absPath, newPath)
    }
  }

  return {
    file: absPath,
    changes,
    transformedCode: transformed,
    needsRename,
  }
}

/**
 * 对目录执行批量 codemod 转换
 *
 * 递归扫描目录中的 .vue, .ts, .js, .tsx, .jsx 文件，
 * 对每个文件执行转换。
 *
 * @param dirPath   目录路径
 * @param options   转换选项
 * @returns 所有文件的转换结果
 */
export function codemodDir(dirPath: string, options?: CodemodOptions): CodemodResult[] {
  const absDir = path.resolve(dirPath)
  if (!fs.existsSync(absDir)) {
    throw new Error(`目录不存在: ${absDir}`)
  }

  const stat = fs.statSync(absDir)
  if (!stat.isDirectory()) {
    throw new Error(`路径不是目录: ${absDir}`)
  }

  const results: CodemodResult[] = []
  const targetExtensions = ['.vue', '.ts', '.tsx', '.js', '.jsx']

  // 递归扫描目录
  function scan(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      // 跳过 node_modules, dist, .git 等目录
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', '.git', '.next', 'build', 'coverage'].includes(entry.name)) {
          continue
        }
        scan(fullPath)
        continue
      }

      // 只处理目标扩展名文件
      const ext = path.extname(entry.name)
      if (targetExtensions.includes(ext)) {
        try {
          const result = codemodFile(fullPath, options)
          if (result.changes.length > 0) {
            results.push(result)
          }
        } catch (err: any) {
          console.warn(`[codemod] 跳过文件 ${fullPath}: ${err.message}`)
        }
      }
    }
  }

  scan(absDir)

  // 汇总输出
  if (options?.verbose) {
    const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0)
    console.log(`\n[codemod] 扫描完成: ${results.length} 个文件, ${totalChanges} 处变更`)
  }

  return results
}
