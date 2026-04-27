/**
 * Vue SFC 转换器
 *
 * 将 Vue 的 .vue 文件转换为 Lyt.js 的 .lyt 文件
 */

/**
 * SFC 解析结果
 */
interface SFCParseResult {
  template: string | null
  script: string | null
  scriptSetup: string | null
  styles: Array<{ content: string; attrs: Record<string, string> }>
}

/**
 * Vue SFC 转换器类
 */
export class VueSfcConverter {
  private content: string

  constructor(content: string) {
    this.content = content
  }

  /**
   * 解析 Vue SFC
   */
  parse(): SFCParseResult {
    const result: SFCParseResult = {
      template: null,
      script: null,
      scriptSetup: null,
      styles: [],
    }

    // 解析 <template>
    const templateMatch = this.content.match(/<template[^>]*>([\s\S]*?)<\/template>/)
    if (templateMatch) {
      result.template = templateMatch[1].trim()
    }

    // 解析 <script setup>
    const scriptSetupMatch = this.content.match(/<script[^>]*setup[^>]*>([\s\S]*?)<\/script>/)
    if (scriptSetupMatch) {
      result.scriptSetup = scriptSetupMatch[1].trim()
    }

    // 解析普通 <script>
    if (!result.scriptSetup) {
      const scriptMatch = this.content.match(/<script(?:\s[^>]*?)?>([\s\S]*?)<\/script>/)
      if (scriptMatch) {
        result.script = scriptMatch[1].trim()
      }
    }

    // 解析 <style>
    const styleRegex = /<style([^>]*)>([\s\S]*?)<\/style>/g
    let styleMatch
    while ((styleMatch = styleRegex.exec(this.content)) !== null) {
      const attrs: Record<string, string> = {}
      const attrMatch = styleMatch[1].match(/(\w+)(?:="([^"]*)")?/g)
      if (attrMatch) {
        for (const attr of attrMatch) {
          const [key, value] = attr.split('=')
          attrs[key.trim()] = value ? value.replace(/"/g, '') : ''
        }
      }
      result.styles.push({
        content: styleMatch[2].trim(),
        attrs,
      })
    }

    return result
  }

  /**
   * 转换模板语法
   */
  convertTemplate(template: string): string {
    let converted = template

    // 转换指令语法（保持兼容）
    // v-if -> v-if (Lyt.js 已支持)
    // v-for -> v-each (Lyt.js 使用 v-each)
    converted = converted.replace(/v-for="([^"]*)"/g, 'v-each="$1"')

    // 转换 :key -> key
    converted = converted.replace(/:key=/g, 'key=')

    // 转换 v-model 语法
    converted = converted.replace(/v-model=/g, 'v-model=')

    // 转换插槽语法
    // #slot -> #slot
    // v-slot -> #slot

    return converted
  }

  /**
   * 转换脚本
   */
  convertScript(script: string, isSetup: boolean = false): string {
    let converted = script

    // 转换导入语句
    // import { ref } from 'vue' -> import { ref } from '@lytjs/compat'
    converted = converted.replace(
      /from\s+['"]vue['"]/g,
      "from '@lytjs/compat'"
    )

    // 如果是 script setup，保持原样
    if (isSetup) {
      return converted
    }

    // 如果是 Options API，建议转换为 Composition API（但保持原样）
    return converted
  }

  /**
   * 转换样式
   */
  convertStyles(styles: SFCParseResult['styles']): string {
    const styleBlocks: string[] = []

    for (const style of styles) {
      const attrs = Object.entries(style.attrs)
        .map(([key, value]) => value ? `${key}="${value}"` : key)
        .join(' ')

      styleBlocks.push(`<style${attrs ? ' ' + attrs : ''}>
${style.content}
</style>`)
    }

    return styleBlocks.join('\n\n')
  }

  /**
   * 执行完整转换
   */
  convert(): string {
    const parsed = this.parse()
    const parts: string[] = []

    // 转换模板
    if (parsed.template) {
      const convertedTemplate = this.convertTemplate(parsed.template)
      parts.push(`<template>
${convertedTemplate}
</template>`)
    }

    // 转换脚本
    if (parsed.scriptSetup) {
      const convertedScript = this.convertScript(parsed.scriptSetup, true)
      parts.push(`<script setup>
${convertedScript}
</script>`)
    } else if (parsed.script) {
      const convertedScript = this.convertScript(parsed.script, false)
      parts.push(`<script>
${convertedScript}
</script>`)
    }

    // 转换样式
    if (parsed.styles.length > 0) {
      parts.push(this.convertStyles(parsed.styles))
    }

    return parts.join('\n\n')
  }
}

/**
 * 便捷函数：转换 Vue SFC 内容为 Lyt.js SFC
 */
export function convertVueSfcToLyt(content: string): string {
  const converter = new VueSfcConverter(content)
  return converter.convert()
}
