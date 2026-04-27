/**
 * 代码补全工具
 *
 * 提供智能代码补全功能
 */

/**
 * 代码补全工具类
 */
export class CodeCompleter {
  /**
   * 获取补全建议
   */
  getCompletions(prefix: string, context: string): CompletionItem[] {
    const completions: CompletionItem[] = []

    // Lyt.js API 补全
    const lytApiCompletions = this.getLytApiCompletions(prefix)
    completions.push(...lytApiCompletions)

    // 组件模板补全
    const templateCompletions = this.getTemplateCompletions(prefix, context)
    completions.push(...templateCompletions)

    return completions
  }

  /**
   * 获取 Lyt.js API 补全
   */
  private getLytApiCompletions(prefix: string): CompletionItem[] {
    const completions: CompletionItem[] = []

    const apiItems = [
      { label: 'ref', kind: 'function', detail: 'import { ref } from "@lytjs/reactivity"', documentation: '创建响应式引用' },
      { label: 'reactive', kind: 'function', detail: 'import { reactive } from "@lytjs/reactivity"', documentation: '创建响应式对象' },
      { label: 'computed', kind: 'function', detail: 'import { computed } from "@lytjs/reactivity"', documentation: '创建计算属性' },
      { label: 'watch', kind: 'function', detail: 'import { watch } from "@lytjs/reactivity"', documentation: '观察响应式数据' },
      { label: 'watchEffect', kind: 'function', detail: 'import { watchEffect } from "@lytjs/reactivity"', documentation: '观察副作用' },
      { label: 'nextTick', kind: 'function', detail: 'import { nextTick } from "@lytjs/reactivity"', documentation: '下一个 tick 执行' },
      { label: 'defineProps', kind: 'function', detail: 'defineProps()', documentation: '定义组件属性' },
      { label: 'defineEmits', kind: 'function', detail: 'defineEmits()', documentation: '定义组件事件' },
      { label: 'onMounted', kind: 'function', detail: 'import { onMounted } from "@lytjs/component"', documentation: '组件挂载时执行' },
      { label: 'onUpdated', kind: 'function', detail: 'import { onUpdated } from "@lytjs/component"', documentation: '组件更新时执行' },
      { label: 'onUnmounted', kind: 'function', detail: 'import { onUnmounted } from "@lytjs/component"', documentation: '组件卸载时执行' },
      { label: 'provide', kind: 'function', detail: 'import { provide } from "@lytjs/core"', documentation: '提供依赖' },
      { label: 'inject', kind: 'function', detail: 'import { inject } from "@lytjs/core"', documentation: '注入依赖' },
    ]

    for (const item of apiItems) {
      if (item.label.toLowerCase().startsWith(prefix.toLowerCase())) {
        completions.push(item)
      }
    }

    return completions
  }

  /**
   * 获取模板补全
   */
  private getTemplateCompletions(prefix: string, context: string): CompletionItem[] {
    const completions: CompletionItem[] = []

    const directiveItems = [
      { label: 'v-if', kind: 'directive', documentation: '条件渲染' },
      { label: 'v-else', kind: 'directive', documentation: '否则渲染' },
      { label: 'v-else-if', kind: 'directive', documentation: '否则如果渲染' },
      { label: 'v-each', kind: 'directive', documentation: '列表渲染' },
      { label: 'v-model', kind: 'directive', documentation: '双向绑定' },
      { label: 'v-on', kind: 'directive', documentation: '事件监听' },
      { label: 'v-bind', kind: 'directive', documentation: '属性绑定' },
      { label: 'v-show', kind: 'directive', documentation: '显示/隐藏' },
    ]

    for (const item of directiveItems) {
      if (item.label.toLowerCase().startsWith(prefix.toLowerCase())) {
        completions.push(item)
      }
    }

    return completions
  }
}

/**
 * 补全项类型
 */
export interface CompletionItem {
  label: string
  kind: 'function' | 'variable' | 'class' | 'interface' | 'directive' | 'component'
  detail?: string
  documentation?: string
  insertText?: string
}
