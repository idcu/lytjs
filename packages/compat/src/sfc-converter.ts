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
  customBlocks: Array<{ tag: string; content: string; attrs: Record<string, string> }>
}

/**
 * 转换警告信息
 */
interface ConversionWarning {
  type: 'directive' | 'syntax' | 'api' | 'feature'
  message: string
  line?: number
  suggestion?: string
}

/**
 * 转换结果
 */
interface ConversionResult {
  code: string
  warnings: ConversionWarning[]
}

/**
 * Vue SFC 转换器类
 */
export class VueSfcConverter {
  private content: string
  private warnings: ConversionWarning[] = []

  constructor(content: string) {
    this.content = content
  }

  /**
   * 获取转换过程中的警告
   */
  getWarnings(): ConversionWarning[] {
    return [...this.warnings]
  }

  /**
   * 添加警告
   */
  private addWarning(type: ConversionWarning['type'], message: string, suggestion?: string): void {
    this.warnings.push({ type, message, suggestion })
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
      customBlocks: [],
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

    // 解析自定义块（如 <i18n>、<docs> 等）
    const customBlockRegex = /<(template|script|style)([^>]*)>([\s\S]*?)<\/\1>/g
    const allBlocks = this.content.match(/<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g) || []
    for (const block of allBlocks) {
      const blockTagMatch = block.match(/^<(\w+)/)
      if (!blockTagMatch) continue
      const tag = blockTagMatch[1]
      if (['template', 'script', 'style'].includes(tag)) continue

      const blockContentMatch = block.match(new RegExp(`^<${tag}[^>]*>([\\s\\S]*?)</${tag}>$`))
      if (!blockContentMatch) continue

      const attrs: Record<string, string> = {}
      const attrMatchStr = block.match(new RegExp(`^<${tag}([^>]*)>`))
      if (attrMatchStr) {
        const attrMatches = attrMatchStr[1].match(/(\w+)(?:="([^"]*)")?/g)
        if (attrMatches) {
          for (const attr of attrMatches) {
            const [key, value] = attr.split('=')
            attrs[key.trim()] = value ? value.replace(/"/g, '') : ''
          }
        }
      }

      result.customBlocks.push({
        tag,
        content: blockContentMatch[1].trim(),
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

    // 转换 v-for -> v-each (Lyt.js 使用 v-each)
    converted = converted.replace(/v-for="([^"]*)"/g, 'v-each="$1"')

    // 转换 :key -> key
    converted = converted.replace(/:key=/g, 'key=')

    // 转换 v-if / v-else-if / v-else
    converted = converted.replace(/v-if=/g, 'if=')
    converted = converted.replace(/v-else-if=/g, 'else-if=')
    converted = converted.replace(/v-else/g, 'else')

    // 转换 v-show
    converted = converted.replace(/v-show=/g, 'show=')

    // 转换 v-html
    converted = converted.replace(/v-html=/g, 'html=')

    // 转换 v-text
    converted = converted.replace(/v-text=/g, 'text=')

    // 转换 v-once
    converted = converted.replace(/\bv-once\b/g, 'once')

    // 转换 v-pre
    converted = converted.replace(/\bv-pre\b/g, 'pre')

    // 转换 v-cloak
    converted = converted.replace(/\bv-cloak\b/g, 'cloak')

    // 转换 v-slot -> slot
    converted = converted.replace(/v-slot:/g, 'slot:')
    // #slot 语法保持不变

    // 转换 v-on: -> on:
    converted = converted.replace(/v-on:/g, 'on:')
    // @click 语法保持不变（Lyt.js 也支持 @）

    // 转换 v-model 修饰符
    // v-model.trim="x" -> model.trim="x"
    converted = converted.replace(/v-model\.(\w+)="/g, 'model.$1="')
    // v-model="x" -> model="x"
    converted = converted.replace(/v-model="/g, 'model="')

    // 转换 v-on 修饰符
    // v-on:click.stop="fn" -> @click.stop="fn" (Lyt.js 支持 @ 语法)
    // v-on:click.prevent="fn" -> @click.prevent="fn"

    // 转换 v-bind: -> : (已经是标准写法)
    converted = converted.replace(/v-bind:/g, ':')

    // 转换 v-memo (Lyt.js 不支持，添加警告)
    if (/v-memo/.test(converted)) {
      this.addWarning(
        'directive',
        'v-memo 指令在 Lyt.js 中不支持',
        '使用 computed 属性替代手动缓存'
      )
      converted = converted.replace(/\s*v-memo="[^"]*"/g, '')
    }

    // 转换 v-is (动态组件)
    if (/v-is/.test(converted)) {
      this.addWarning(
        'directive',
        'v-is 动态组件语法在 Lyt.js 中可能需要调整',
        '使用 :is 属性替代 v-is'
      )
      converted = converted.replace(/v-is=/g, ':is=')
    }

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

    // 转换 vue-router 导入
    converted = converted.replace(
      /from\s+['"]vue-router['"]/g,
      "from '@lytjs/router'"
    )

    // 转换 pinia 导入
    converted = converted.replace(
      /from\s+['"]pinia['"]/g,
      "from '@lytjs/store'"
    )

    // 转换 vuex 导入
    converted = converted.replace(
      /from\s+['"]vuex['"]/g,
      "from '@lytjs/store'"
    )

    // 如果是 script setup，进行额外的转换
    if (isSetup) {
      // 转换 defineProps 使用
      if (/defineProps/.test(converted)) {
        this.addWarning(
          'api',
          'defineProps 是编译器宏，需要手动转换为 defineComponent({ props: {...} })',
          '在 Lyt.js 中使用 defineComponent 的 props 选项'
        )
      }

      // 转换 defineEmits 使用
      if (/defineEmits/.test(converted)) {
        this.addWarning(
          'api',
          'defineEmits 是编译器宏，需要手动转换为 defineComponent({ emits: {...} })',
          '在 Lyt.js 中使用 defineComponent 的 emits 选项'
        )
      }

      // 转换 defineExpose 使用
      if (/defineExpose/.test(converted)) {
        this.addWarning(
          'api',
          'defineExpose 在 Lyt.js 中不需要',
          '在 Lyt.js 中 setup 返回的对象自动暴露为公共属性'
        )
      }

      // 转换 withDefaults 使用
      if (/withDefaults/.test(converted)) {
        this.addWarning(
          'api',
          'withDefaults 是编译器宏，需要手动转换',
          '在 defineComponent 的 props 选项中使用 default 字段'
        )
      }

      // 转换 useSlots 使用
      if (/useSlots/.test(converted)) {
        this.addWarning(
          'api',
          'useSlots 在 Lyt.js 中需要通过 setup 上下文访问',
          '使用 setup(props, { slots }) 访问插槽'
        )
      }

      // 转换 useAttrs 使用
      if (/useAttrs/.test(converted)) {
        this.addWarning(
          'api',
          'useAttrs 在 Lyt.js 中需要通过 setup 上下文访问',
          '使用 setup(props, { attrs }) 访问 attrs'
        )
      }

      // 转换 <script setup> 中的顶层变量为 setup 函数返回值
      // 注意：这是一个简化的转换，复杂的 script setup 语法需要手动调整
      converted = this.convertScriptSetupToSetup(converted)
    }

    return converted
  }

  /**
   * 将 <script setup> 语法转换为 setup() 函数
   */
  private convertScriptSetupToSetup(script: string): string {
    let converted = script

    // 移除 defineProps 调用（保留注释说明）
    converted = converted.replace(
      /const\s+\w+\s*=\s*defineProps\s*\([^)]*\)\s*;?\s*\n?/g,
      '// [Compat] defineProps 已移除，请在 defineComponent({ props: {...} }) 中定义\n'
    )

    // 移除 defineEmits 调用
    converted = converted.replace(
      /const\s+\w+\s*=\s*defineEmits\s*\([^)]*\)\s*;?\s*\n?/g,
      '// [Compat] defineEmits 已移除，请在 defineComponent({ emits: [...] }) 中定义\n'
    )

    // 移除 defineExpose 调用
    converted = converted.replace(
      /defineExpose\s*\([^)]*\)\s*;?\s*\n?/g,
      '// [Compat] defineExpose 已移除，setup 返回值自动暴露\n'
    )

    // 移除 withDefaults 调用
    converted = converted.replace(
      /const\s+\w+\s*=\s*withDefaults\s*\([^)]*\)\s*;?\s*\n?/g,
      '// [Compat] withDefaults 已移除，请在 props 选项中使用 default\n'
    )

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

      // scoped 样式保持不变（Lyt.js 支持 scoped）
      // CSS Modules 不支持，添加警告
      if (style.attrs.module !== undefined) {
        this.addWarning(
          'feature',
          'CSS Modules 在 Lyt.js 中不支持',
          '使用 scoped 样式替代'
        )
      }

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

    // 保留自定义块
    for (const block of parsed.customBlocks) {
      const attrs = Object.entries(block.attrs)
        .map(([key, value]) => value ? `${key}="${value}"` : key)
        .join(' ')
      parts.push(`<${block.tag}${attrs ? ' ' + attrs : ''}>
${block.content}
</${block.tag}>`)
    }

    return parts.join('\n\n')
  }

  /**
   * 执行完整转换并返回结果（含警告）
   */
  convertWithWarnings(): ConversionResult {
    this.warnings = []
    const code = this.convert()
    return { code, warnings: this.warnings }
  }
}

/**
 * 便捷函数：转换 Vue SFC 内容为 Lyt.js SFC
 */
export function convertVueSfcToLyt(content: string): string {
  const converter = new VueSfcConverter(content)
  return converter.convert()
}

/**
 * 便捷函数：转换 Vue SFC 内容并返回警告
 */
export function convertVueSfcToLytWithWarnings(content: string): ConversionResult {
  const converter = new VueSfcConverter(content)
  return converter.convertWithWarnings()
}
