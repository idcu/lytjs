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

  // 默认模板
  custom: `<!-- {{ description || 'Custom Component' }} -->
<template>
  <div class="{{ kebabName }}">
    <!-- Your template here -->
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

// 为缺失的类型提供默认模板
;['form', 'table', 'dropdown', 'tabs', 'navigation'].forEach((type) => {
  componentTemplates[type as ComponentType] = componentTemplates.custom
})

/**
 * 模板引擎类
 */
export class TemplateEngine {
  /**
   * 渲染模板
   */
  render(template: string, context: TemplateContext): string {
    let result = template

    // 简单的模板替换
    // {{ variable }} -> value
    result = result.replace(/\{\{(\s*)([^{}]+)(\s*)\}\}/g, (_, __, key) => {
      const value = this.getValue(context, key.trim())
      return value !== undefined ? String(value) : ''
    })

    // {{#if condition}} ... {{/if}}
    result = this.processIfBlocks(result, context)

    // {{#each array}} ... {{/each}}
    result = this.processEachBlocks(result, context)

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
   * 处理 if 块
   */
  private processIfBlocks(template: string, context: TemplateContext): string {
    let result = template
    const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g

    let match
    while ((match = ifRegex.exec(result)) !== null) {
      const condition = match[1].trim()
      const content = match[2]
      const value = this.getValue(context, condition)
      const replacement = value ? content : ''
      result = result.replace(match[0], replacement)
    }

    return result
  }

  /**
   * 处理 each 块
   */
  private processEachBlocks(template: string, context: TemplateContext): string {
    let result = template
    const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g

    let match
    while ((match = eachRegex.exec(result)) !== null) {
      const arrayPath = match[1].trim()
      const content = match[2]
      const array = this.getValue(context, arrayPath)

      if (Array.isArray(array)) {
        const renderedItems = array
          .map((item, index) => {
            // 简单的替换，将 {{ name }} 等替换为 item 的属性
            let itemContent = content
            // 对于 props 数组，我们需要特殊处理
            itemContent = itemContent.replace(/\{\{(\s*)name(\s*)\}\}/g, item.name || '')
            itemContent = itemContent.replace(/\{\{(\s*)type(\s*)\}\}/g, item.type || 'String')
            itemContent = itemContent.replace(/\{\{(\s*)required(\s*)\}\}/g, item.required ? 'true' : 'false')
            itemContent = itemContent.replace(/\{\{(\s*)default(\s*)\}\}/g, item.default !== undefined ? item.default : '')
            return itemContent
          })
          .join('')
        result = result.replace(match[0], renderedItems)
      } else {
        result = result.replace(match[0], '')
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
