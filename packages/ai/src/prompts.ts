/**
 * AI 提示词模板
 */

import type { ComponentConfig, StoreConfig, PageConfig, APIConfig } from './types'

/**
 * 系统提示词
 */
export const SYSTEM_PROMPT = `你是一个专业的 Lyt.js 前端开发助手。
Lyt.js 是一个纯原生、零运行时依赖、超轻量的前端框架，提供与 Vue 3 兼容的 API。
- 使用 Composition API 和 script setup 语法

Lyt.js 的模板语法特点：
- 插值：{{ msg }}
- 属性绑定：:class="cls"
- 事件绑定：@click="fn"
- 条件渲染：if="show" (没有 v- 前缀)
- 列表渲染：each="item in list" (没有 v- 前缀)
- 双向绑定：model="value" (没有 v- 前缀)

主要导入：
- import { defineComponent, ref, computed, watch } from '@lytjs/component'
- import { reactive, ref, computed, watch } from '@lytjs/reactivity'
- import { createApp } from '@lytjs/core'
- import { createRouter } from '@lytjs/router'
- import { createStore } from '@lytjs/store'

请生成高质量、可运行的 Lyt.js 代码。`

/**
 * 生成组件提示词
 */
export function generateComponentPrompt(config: ComponentConfig): string {
  const { name, type, description, props, emits, slots, style, scriptSetup } = config

  let prompt = `请生成一个 Lyt.js 组件。

组件名称：${name}
组件类型：${type}
${description ? `描述：${description}` : ''}

请确保：
1. 使用 Composition API 和 script setup 语法
2. 模板使用 Lyt.js 语法（无前缀）
3. 代码简洁、规范
4. 添加适当的注释

要求：`

  if (props && props.length > 0) {
    prompt += `\nProps：\n${props.map(p => `- ${p.name}: ${p.type}${p.required ? ' (required)' : ''}${p.default !== undefined ? ` = ${p.default}` : ''}`).join('\n')}`
  }

  if (emits && emits.length > 0) {
    prompt += `\nEmits：${emits.join(', ')}`
  }

  if (slots && slots.length > 0) {
    prompt += `\nSlots：${slots.join(', ')}`
  }

  if (style) {
    prompt += `\n包含 scoped 样式`
  }

  prompt += `\n\n请只返回代码，不要包含任何额外说明。`

  return prompt
}

/**
 * 生成 Store 提示词
 */
export function generateStorePrompt(config: StoreConfig): string {
  const { name, state, getters, actions, description } = config

  let prompt = `请生成一个 Lyt.js Store。

Store 名称：${name}
${description ? `描述：${description}` : ''}

使用 @lytjs/store 的 createStore API。

要求：`

  if (state) {
    prompt += `\n初始状态：\n${JSON.stringify(state, null, 2)}`
  }

  if (getters) {
    prompt += `\nGetters：\n${Object.entries(getters).map(([key, value]) => `- ${key}: ${value}`).join('\n')}`
  }

  if (actions && actions.length > 0) {
    prompt += `\nActions：${actions.join(', ')}`
  }

  prompt += `\n\n请只返回代码，不要包含任何额外说明。`

  return prompt
}

/**
 * 生成页面提示词
 */
export function generatePagePrompt(config: PageConfig): string {
  const { name, path, layout, description } = config

  let prompt = `请生成一个 Lyt.js 页面组件。

页面名称：${name}
${path ? `路由路径：${path}` : ''}
${layout ? `布局：${layout}` : ''}
${description ? `描述：${description}` : ''}

要求：
1. 使用 Composition API
2. 包含适当的路由相关代码
3. 代码规范、可运行

请只返回代码，不要包含任何额外说明。`

  return prompt
}

/**
 * 生成 API 提示词
 */
export function generateAPIPrompt(config: APIConfig): string {
  const { name, path, method, description } = config

  let prompt = `请生成一个 Lyt.js API Route。

API 名称：${name}
${path ? `路径：${path}` : ''}
${method ? `方法：${method}` : ''}
${description ? `描述：${description}` : ''}

使用 @lytjs/lytx 的 API 路由语法。

请只返回代码，不要包含任何额外说明。`

  return prompt
}
