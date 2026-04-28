/**
 * 模板引擎
 *
 * 负责渲染组件模板
 */

import type { TemplateContext, ComponentConfig, ComponentType } from './types'

/**
 * 组件模板映射
 */
const componentTemplates: Record<ComponentType, string> = {
  functional: `<!-- {{ description || 'Functional Component' }} -->
<template>
  <div class="{{ kebabName }}">
    <slot></slot>
  </div>
</template>

<script setup>
{{#if props}}
import { defineProps } from '@lytjs/core'

const props = defineProps({
{{#each props}}
  {{ name }}: {
    type: {{ type }},
    {{#if required}}required: true,{{/if}}
    {{#if default}}default: {{ default }},{{/if}}
  },
{{/each}}
})
{{/if}}

{{#if emits}}
import { defineEmits } from '@lytjs/core'

const emit = defineEmits({{{JSON.stringify(emits)}}})
{{/if}}
</script>

{{#if style}}
<style scoped>
.{{ kebabName }} {
  /* Component styles */
}
</style>
{{/if}}`,

  button: `<!-- {{ description || 'Button Component' }} -->
<template>
  <button class="{{ kebabName }}" v-on:click="handleClick">
    <slot></slot>
  </button>
</template>

<script setup>
import { defineProps, defineEmits } from '@lytjs/core'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: 'button',
  },
})

const emit = defineEmits(['click'])

const handleClick = (event) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>

{{#if style}}
<style scoped>
.{{ kebabName }} {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.{{ kebabName }}:hover:not(:disabled) {
  background: #2563eb;
}

.{{ kebabName }}:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
</style>
{{/if}}`,

  input: `<!-- {{ description || 'Input Component' }} -->
<template>
  <div class="{{ kebabName }}">
    <input
      :value="modelValue"
      v-on:input="handleInput"
      v-on:change="handleChange"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from '@lytjs/core'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  placeholder: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}

const handleChange = (event) => {
  emit('change', event.target.value)
}
</script>

{{#if style}}
<style scoped>
.{{ kebabName }} {
  display: inline-block;
}

.{{ kebabName }} input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
}

.{{ kebabName }} input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
</style>
{{/if}}`,

  form: `<!-- {{ description || 'Form Component' }} -->
<template>
  <form class="{{ kebabName }}" v-on:submit.prevent="handleSubmit">
    <slot></slot>
  </form>
</template>

<script setup>
import { defineProps, defineEmits } from '@lytjs/core'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const handleSubmit = () => {
  emit('submit', props.modelValue)
}
</script>

{{#if style}}
<style scoped>
.{{ kebabName }} {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
{{/if}}`,

  card: `<!-- {{ description || 'Card Component' }} -->
<template>
  <div class="{{ kebabName }}">
    <div v-if="$slots.header" class="{{ kebabName }}-header">
      <slot name="header"></slot>
    </div>
    <div class="{{ kebabName }}-body">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="{{ kebabName }}-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
// Card component
</script>

{{#if style}}
<style scoped>
.{{ kebabName }} {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.{{ kebabName }}-header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.{{ kebabName }}-body {
  padding: 16px;
}

.{{ kebabName }}-footer {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
}
</style>
{{/if}}`,

  list: `<!-- {{ description || 'List Component' }} -->
<template>
  <ul class="{{ kebabName }}">
    <li
      v-each="(item, index) in items"
      :key="index"
      class="{{ kebabName }}-item"
    >
      <slot name="item" :item="item" :index="index">{{ item }}</slot>
    </li>
  </ul>
</template>

<script setup>
import { defineProps } from '@lytjs/core'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
})
</script>

{{#if style}}
<style scoped>
.{{ kebabName }} {
  list-style: none;
  padding: 0;
  margin: 0;
}

.{{ kebabName }}-item {
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
}

.{{ kebabName }}-item:last-child {
  border-bottom: none;
}
</style>
{{/if}}`,

  table: `<!-- {{ description || 'Table Component' }} -->
<template>
  <table class="{{ kebabName }}">
    <thead>
      <tr>
        <slot name="header"></slot>
      </tr>
    </thead>
    <tbody>
      <tr v-each="(row, index) in data" :key="index">
        <slot name="row" :row="row" :index="index"></slot>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { defineProps } from '@lytjs/core'

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
})
</script>

{{#if style}}
<style scoped>
.{{ kebabName }} {
  width: 100%;
  border-collapse: collapse;
}

.{{ kebabName }} th,
.{{ kebabName }} td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.{{ kebabName }} th {
  font-weight: 600;
  background: #f9fafb;
}
</style>
{{/if}}`,

  modal: `<!-- {{ description || 'Modal Component' }} -->
<template>
  <div v-if="visible" class="{{ kebabName }}-overlay" v-on:click="handleOverlayClick">
    <div class="{{ kebabName }}" v-on:click.stop>
      <div class="{{ kebabName }}-header">
        <slot name="header">{{ title }}</slot>
        <button v-if="closable" class="{{ kebabName }}-close" v-on:click="handleClose">×</button>
      </div>
      <div class="{{ kebabName }}-body">
        <slot></slot>
      </div>
      <div v-if="$slots.footer" class="{{ kebabName }}-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from '@lytjs/core'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  closable: {
    type: Boolean,
    default: true,
  },
  closeOnOverlay: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:visible', 'close'])

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    handleClose()
  }
}
</script>

{{#if style}}
<style scoped>
.{{ kebabName }}-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.{{ kebabName }} {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
}

.{{ kebabName }}-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.{{ kebabName }}-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.{{ kebabName }}-body {
  padding: 16px;
}

.{{ kebabName }}-footer {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
}
</style>
{{/if}}`,

  dropdown: `<!-- {{ description || 'Dropdown Component' }} -->
<template>
  <div class="{{ kebabName }}">
    <button v-on:click="toggle" class="{{ kebabName }}-trigger">
      <slot name="trigger">{{ selectedLabel || 'Select' }}</slot>
    </button>
    <div v-if="open" class="{{ kebabName }}-menu">
      <div
        v-each="(item, index) in options"
        :key="index"
        v-on:click="selectItem(item)"
        class="{{ kebabName }}-item"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from '@lytjs/core'

const open = ref(false)

const props = defineProps({
  modelValue: {
    default: null,
  },
  options: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const selectedLabel = ref('')

const toggle = () => {
  open.value = !open.value
}

const selectItem = (item) => {
  emit('update:modelValue', item.value)
  emit('change', item)
  selectedLabel.value = item.label
  open.value = false
}
</script>

{{#if style}}
<style scoped>
.{{ kebabName }} {
  position: relative;
  display: inline-block;
}

.{{ kebabName }}-trigger {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.{{ kebabName }}-menu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  margin-top: 4px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.{{ kebabName }}-item {
  padding: 8px 16px;
  cursor: pointer;
}

.{{ kebabName }}-item:hover {
  background: #f3f4f6;
}
</style>
{{/if}}`,

  tabs: `<!-- {{ description || 'Tabs Component' }} -->
<template>
  <div class="{{ kebabName }}">
    <div class="{{ kebabName }}-headers">
      <div
        v-each="(tab, index) in tabs"
        :key="index"
        v-on:click="selectTab(index)"
        class="{{ kebabName }}-tab"
        :class="{ active: activeIndex === index }"
      >
        {{ tab.label }}
      </div>
    </div>
    <div class="{{ kebabName }}-content">
      <slot name="content" :index="activeIndex"></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from '@lytjs/core'

const activeIndex = ref(0)

const props = defineProps({
  tabs: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const selectTab = (index) => {
  activeIndex.value = index
  emit('update:modelValue', index)
  emit('change', index)
}
</script>

{{#if style}}
<style scoped>
.{{ kebabName }}-headers {
  display: flex;
  border-bottom: 2px solid #e5e7eb;
}

.{{ kebabName }}-tab {
  padding: 12px 20px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.{{ kebabName }}-tab.active {
  border-bottom-color: #3b82f6;
  color: #3b82f6;
}

.{{ kebabName }}-content {
  padding: 16px 0;
}
</style>
{{/if}}`,

  navigation: `<!-- {{ description || 'Navigation Component' }} -->
<template>
  <nav class="{{ kebabName }}">
    <slot></slot>
  </nav>
</template>

<script setup>
// Navigation component
</script>

{{#if style}}
<style scoped>
.{{ kebabName }} {
  display: flex;
  gap: 8px;
}
</style>
{{/if}}`,

  // 默认模板
  custom: `<!-- {{ description || 'Custom Component' }} -->
<template>
  <div class="{{ kebabName }}" data-component="{{ pascalName }}">
    <!-- Your template here -->
    <slot></slot>
  </div>
</template>

<script setup>
// {{ pascalName }} component
// Usage: const {{ camelName }} = defineComponent({ ... })
{{#if props}}
import { defineProps } from '@lytjs/core'

const props = defineProps({
{{#each props}}
  {{ name }}: {
    type: {{ type }},
    {{#if required}}required: true,{{/if}}
    {{#if default}}default: {{ default }},{{/if}}
  },
{{/each}}
})
{{/if}}

{{#if emits}}
import { defineEmits } from '@lytjs/core'

const emit = defineEmits({{{JSON.stringify(emits)}}})
{{/if}}

// Your logic here
</script>

{{#if style}}
<style scoped>
.{{ kebabName }} {
  /* Component styles */
}
</style>
{{/if}}`,
}

/**
 * 模板引擎类
 */
export class TemplateEngine {
  /**
   * 渲染模板
   */
  render(template: string, context: TemplateContext): string {
    let result = template

    // 先处理块级指令（if/each），再处理简单变量替换
    // {{#if condition}} ... {{/if}}
    result = this.processIfBlocks(result, context)

    // {{#each array}} ... {{/each}}
    result = this.processEachBlocks(result, context)

    // 简单的模板替换
    // {{ variable }} -> value
    result = result.replace(/\{\{(\s*)([^{}#\/]+)(\s*)\}\}/g, (_, __, key) => {
      const value = this.getValue(context, key.trim())
      return value !== undefined ? String(value) : ''
    })

    return result
  }

  /**
   * 从上下文中获取值（支持点号路径）
   */
  private getValue(context: TemplateContext, path: string): any {
    if (path.includes('.')) {
      const parts = path.split('.')
      let value: any = context
      for (const part of parts) {
        if (value === undefined || value === null) return undefined
        value = value[part]
      }
      return value
    }
    return context[path as keyof TemplateContext]
  }

  /**
   * 处理 if 块（支持嵌套）
   */
  private processIfBlocks(template: string, context: TemplateContext): string {
    let result = ''
    let i = 0
    const len = template.length

    while (i < len) {
      // 查找下一个 {{#if
      const openIdx = template.indexOf('{{#if', i)
      if (openIdx === -1) {
        result += template.slice(i)
        break
      }

      // 添加 {{#if 之前的内容
      result += template.slice(i, openIdx)

      // 找到完整的 {{#if condition}}
      const openEnd = template.indexOf('}}', openIdx)
      if (openEnd === -1) {
        result += template.slice(openIdx)
        break
      }
      const condition = template.slice(openIdx + 5, openEnd).trim()

      // 用栈找到匹配的 {{/if}}
      let depth = 1
      let pos = openEnd + 2
      while (pos < len && depth > 0) {
        const nextOpen = template.indexOf('{{#if', pos)
        const nextClose = template.indexOf('{{/if}}', pos)
        if (nextClose === -1) break
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++
          pos = nextOpen + 5
        } else {
          depth--
          if (depth === 0) {
            // 找到匹配的 {{/if}}
            const content = template.slice(openEnd + 2, nextClose)
            const value = this.getValue(context, condition)
            // 递归处理嵌套的 if 块
            const processed = this.processIfBlocks(content, context)
            result += value ? processed : ''
            pos = nextClose + 7
          } else {
            pos = nextClose + 7
          }
        }
      }

      if (depth > 0) {
        // 没有找到匹配的 {{/if}}，保留原始内容
        result += template.slice(openIdx, openEnd + 2)
        i = openEnd + 2
      } else {
        i = pos
      }
    }

    return result
  }

  /**
   * 处理 each 块（支持嵌套）
   */
  private processEachBlocks(template: string, context: TemplateContext): string {
    let result = ''
    let i = 0
    const len = template.length

    while (i < len) {
      // 查找下一个 {{#each
      const openIdx = template.indexOf('{{#each', i)
      if (openIdx === -1) {
        result += template.slice(i)
        break
      }

      // 添加 {{#each 之前的内容
      result += template.slice(i, openIdx)

      // 找到完整的 {{#each array}}
      const openEnd = template.indexOf('}}', openIdx)
      if (openEnd === -1) {
        result += template.slice(openIdx)
        break
      }
      const arrayPath = template.slice(openIdx + 7, openEnd).trim()

      // 用栈找到匹配的 {{/each}}
      let depth = 1
      let pos = openEnd + 2
      while (pos < len && depth > 0) {
        const nextOpen = template.indexOf('{{#each', pos)
        const nextClose = template.indexOf('{{/each}}', pos)
        if (nextClose === -1) break
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++
          pos = nextOpen + 7
        } else {
          depth--
          if (depth === 0) {
            // 找到匹配的 {{/each}}
            const content = template.slice(openEnd + 2, nextClose)
            const array = this.getValue(context, arrayPath)

            if (Array.isArray(array)) {
              const renderedItems = array
                .map((item, index) => {
                  let itemContent = content
                  itemContent = itemContent.replace(/\{\{(\s*)name(\s*)\}\}/g, item.name || '')
                  itemContent = itemContent.replace(/\{\{(\s*)type(\s*)\}\}/g, item.type || 'String')
                  itemContent = itemContent.replace(/\{\{(\s*)required(\s*)\}\}/g, item.required ? 'true' : 'false')
                  itemContent = itemContent.replace(/\{\{(\s*)default(\s*)\}\}/g, item.default !== undefined ? item.default : '')
                  return itemContent
                })
                .join('')
              result += renderedItems
            }
            // 非数组时不添加任何内容

            pos = nextClose + 9
          } else {
            pos = nextClose + 9
          }
        }
      }

      if (depth > 0) {
        result += template.slice(openIdx, openEnd + 2)
        i = openEnd + 2
      } else {
        i = pos
      }
    }

    return result
  }

  /**
   * 获取组件模板
   */
  getComponentTemplate(type: ComponentType): string {
    return componentTemplates[type] || componentTemplates.custom
  }
}
