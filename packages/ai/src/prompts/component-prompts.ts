/**
 * 组件生成专用 Prompt 模板
 *
 * 提供基础组件、复合组件和自定义组件的 Prompt 生成
 */

import type { ComponentConfig } from '../types'

/**
 * Lyt.js 系统上下文 — 所有组件 Prompt 共享
 */
const LYTJS_CONTEXT = `Lyt.js 是一个纯原生、零运行时依赖、超轻量的前端框架，提供与 Vue 3 兼容的 API。

模板语法特点（注意：没有 v- 前缀）：
- 插值：{{ msg }}
- 属性绑定：:class="cls" 或 bind:class="cls"
- 事件绑定：@click="fn" 或 on:click="fn"
- 条件渲染：if="show"
- 列表渲染：each="item in list"
- 双向绑定：model="value"
- 插槽：<slot></slot>、<slot name="header"></slot>

主要导入：
- import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from '@lytjs/component'
- import { reactive, ref, computed, watch, watchEffect, nextTick, toRef, toRefs } from '@lytjs/reactivity'
- import { createApp, provide, inject } from '@lytjs/core'
- import { createRouter, useRouter, useRoute } from '@lytjs/router'
- import { createStore, useStore } from '@lytjs/store'

代码规范：
- 使用 <script setup> 语法
- 使用 Composition API
- 模板使用 Lyt.js 无前缀语法
- 组件使用 kebab-case 标签名
- 样式使用 <style scoped>`

// ============================================================
//  基础组件模板
// ============================================================

/**
 * Button 组件 Prompt
 */
export function buttonComponentPrompt(config: ComponentConfig): string {
  return `${LYTJS_CONTEXT}

请生成一个 Lyt.js Button 按钮组件。

组件名称：${config.name}
${config.description ? `描述：${config.description}` : '描述：一个通用的按钮组件，支持多种类型和状态。'}

要求：
1. 支持 type 属性：primary / success / warning / danger / default
2. 支持 size 属性：small / medium / large
3. 支持 disabled 状态
4. 支持 loading 状态（显示加载动画）
5. 支持图标插槽（icon slot）
6. 使用 <script setup> 语法
7. 包含 scoped 样式
8. 模板使用 Lyt.js 无前缀语法（if、each、model、@click 等）

${config.props ? `额外 Props：${config.props.map(p => `- ${p.name}: ${p.type}${p.required ? ' (required)' : ''}`).join('\n')}` : ''}
${config.emits ? `额外 Emits：${config.emits.join(', ')}` : ''}

请只返回完整的 .lyt 组件代码（包含 template、script setup、style scoped），不要包含任何额外说明。`
}

/**
 * Input 组件 Prompt
 */
export function inputComponentPrompt(config: ComponentConfig): string {
  return `${LYTJS_CONTEXT}

请生成一个 Lyt.js Input 输入框组件。

组件名称：${config.name}
${config.description ? `描述：${config.description}` : '描述：一个功能完善的输入框组件，支持多种类型和验证。'}

要求：
1. 支持 type 属性：text / password / number / email / textarea
2. 支持 v-model 双向绑定（使用 model 语法）
3. 支持 placeholder、disabled、readonly 状态
4. 支持 clearable（一键清空）
5. 支持 prefix/suffix 插槽
6. 支持 maxlength 和 showWordLimit
7. 输入时触发 input/change 事件
8. 使用 <script setup> 语法
9. 包含 scoped 样式

${config.props ? `额外 Props：${config.props.map(p => `- ${p.name}: ${p.type}${p.required ? ' (required)' : ''}`).join('\n')}` : ''}
${config.emits ? `额外 Emits：${config.emits.join(', ')}` : ''}

请只返回完整的 .lyt 组件代码，不要包含任何额外说明。`
}

/**
 * Select 组件 Prompt
 */
export function selectComponentPrompt(config: ComponentConfig): string {
  return `${LYTJS_CONTEXT}

请生成一个 Lyt.js Select 选择器组件。

组件名称：${config.name}
${config.description ? `描述：${config.description}` : '描述：一个下拉选择器组件，支持单选和多选。'}

要求：
1. 支持 options 属性（数组格式：[{ label, value, disabled? }]）
2. 支持 v-model 双向绑定
3. 支持 placeholder
4. 支持 disabled 状态
5. 支持 clearable（一键清空）
6. 支持 filterable（可搜索）
7. 点击外部自动关闭
8. 使用 <script setup> 语法
9. 包含 scoped 样式

${config.props ? `额外 Props：${config.props.map(p => `- ${p.name}: ${p.type}${p.required ? ' (required)' : ''}`).join('\n')}` : ''}
${config.emits ? `额外 Emits：${config.emits.join(', ')}` : ''}

请只返回完整的 .lyt 组件代码，不要包含任何额外说明。`
}

/**
 * 通用基础组件 Prompt 生成器
 */
export function basicComponentPrompt(config: ComponentConfig): string {
  const typePrompts: Record<string, (config: ComponentConfig) => string> = {
    button: buttonComponentPrompt,
    input: inputComponentPrompt,
    select: selectComponentPrompt,
  }

  const generator = typePrompts[config.type]
  if (generator) {
    return generator(config)
  }

  return `${LYTJS_CONTEXT}

请生成一个 Lyt.js 基础组件。

组件名称：${config.name}
组件类型：${config.type}
${config.description ? `描述：${config.description}` : ''}

要求：
1. 使用 <script setup> 语法
2. 模板使用 Lyt.js 无前缀语法
3. 包含 scoped 样式
4. 代码简洁、规范、可复用

${config.props ? `Props：${config.props.map(p => `- ${p.name}: ${p.type}${p.required ? ' (required)' : ''}${p.default !== undefined ? ` = ${p.default}` : ''}`).join('\n')}` : ''}
${config.emits ? `Emits：${config.emits.join(', ')}` : ''}
${config.slots ? `Slots：${config.slots.join(', ')}` : ''}

请只返回完整的 .lyt 组件代码，不要包含任何额外说明。`
}

// ============================================================
//  复合组件模板
// ============================================================

/**
 * Form 表单组件 Prompt
 */
export function formComponentPrompt(config: ComponentConfig): string {
  return `${LYTJS_CONTEXT}

请生成一个 Lyt.js Form 表单组件。

组件名称：${config.name}
${config.description ? `描述：${config.description}` : '描述：一个功能完善的表单组件，支持验证和布局。'}

要求：
1. 支持 model 属性（表单数据对象）
2. 支持 rules 属性（验证规则）
3. 支持 label-width 属性
4. 支持 inline 模式
5. 提供 validate / resetFields 方法
6. 包含 FormItem 子组件（通过 slot 或独立组件）
7. 支持必填标记（*）
8. 支持错误提示信息
9. 使用 <script setup> 语法
10. 包含 scoped 样式

${config.props ? `额外 Props：${config.props.map(p => `- ${p.name}: ${p.type}${p.required ? ' (required)' : ''}`).join('\n')}` : ''}
${config.emits ? `额外 Emits：${config.emits.join(', ')}` : ''}

请只返回完整的 .lyt 组件代码，不要包含任何额外说明。`
}

/**
 * Table 表格组件 Prompt
 */
export function tableComponentPrompt(config: ComponentConfig): string {
  return `${LYTJS_CONTEXT}

请生成一个 Lyt.js Table 表格组件。

组件名称：${config.name}
${config.description ? `描述：${config.description}` : '描述：一个功能丰富的表格组件，支持排序、筛选和分页。'}

要求：
1. 支持 columns 属性（列配置：[{ key, title, width, sortable?, align? }]）
2. 支持 data 属性（表格数据）
3. 支持 loading 状态
4. 支持 stripe（斑马纹）
5. 支持 border（边框）
6. 支持排序（点击表头排序）
7. 支持空数据提示（empty slot）
8. 支持行选择（checkbox 列）
9. 使用 <script setup> 语法
10. 包含 scoped 样式

${config.props ? `额外 Props：${config.props.map(p => `- ${p.name}: ${p.type}${p.required ? ' (required)' : ''}`).join('\n')}` : ''}
${config.emits ? `额外 Emits：${config.emits.join(', ')}` : ''}

请只返回完整的 .lyt 组件代码，不要包含任何额外说明。`
}

/**
 * Modal 对话框组件 Prompt
 */
export function modalComponentPrompt(config: ComponentConfig): string {
  return `${LYTJS_CONTEXT}

请生成一个 Lyt.js Modal 对话框组件。

组件名称：${config.name}
${config.description ? `描述：${config.description}` : '描述：一个模态对话框组件，支持自定义内容和动画。'}

要求：
1. 支持 visible 属性（v-model 控制显示）
2. 支持 title 属性
3. 支持 width 属性
4. 支持 closable（显示关闭按钮）
5. 支持 closeOnOverlay（点击遮罩关闭）
6. 支持 confirm / cancel 事件
7. 支持 header / default / footer 三个插槽
8. 打开/关闭动画效果
9. ESC 键关闭
10. 使用 <script setup> 语法
11. 包含 scoped 样式

${config.props ? `额外 Props：${config.props.map(p => `- ${p.name}: ${p.type}${p.required ? ' (required)' : ''}`).join('\n')}` : ''}
${config.emits ? `额外 Emits：${config.emits.join(', ')}` : ''}

请只返回完整的 .lyt 组件代码，不要包含任何额外说明。`
}

/**
 * 通用复合组件 Prompt 生成器
 */
export function compositeComponentPrompt(config: ComponentConfig): string {
  const typePrompts: Record<string, (config: ComponentConfig) => string> = {
    form: formComponentPrompt,
    table: tableComponentPrompt,
    modal: modalComponentPrompt,
  }

  const generator = typePrompts[config.type]
  if (generator) {
    return generator(config)
  }

  return `${LYTJS_CONTEXT}

请生成一个 Lyt.js 复合组件。

组件名称：${config.name}
组件类型：${config.type}
${config.description ? `描述：${config.description}` : ''}

要求：
1. 使用 <script setup> 语法
2. 模板使用 Lyt.js 无前缀语法
3. 包含 scoped 样式
4. 提供完整的 Props/Emits/Slots 定义
5. 组件可复用、可扩展
6. 包含适当的生命周期钩子

${config.props ? `Props：${config.props.map(p => `- ${p.name}: ${p.type}${p.required ? ' (required)' : ''}${p.default !== undefined ? ` = ${p.default}` : ''}`).join('\n')}` : ''}
${config.emits ? `Emits：${config.emits.join(', ')}` : ''}
${config.slots ? `Slots：${config.slots.join(', ')}` : ''}

请只返回完整的 .lyt 组件代码，不要包含任何额外说明。`
}

// ============================================================
//  自定义组件模板
// ============================================================

/**
 * 自定义组件 Prompt 生成器
 * 根据自然语言描述生成组件
 */
export function customComponentPrompt(description: string, extra?: {
  name?: string
  style?: string
  framework?: string
}): string {
  return `${LYTJS_CONTEXT}

请根据以下描述生成一个 Lyt.js 组件。

${extra?.name ? `建议组件名称：${extra.name}` : ''}
描述：${description}
${extra?.style ? `风格偏好：${extra.style}` : ''}
${extra?.framework ? `参考框架：${extra.framework}` : ''}

要求：
1. 使用 <script setup> 语法
2. 模板使用 Lyt.js 无前缀语法（if、each、model、@click 等）
3. 包含 scoped 样式
4. 合理拆分 Props/Emits/Slots
5. 代码简洁、规范、可维护
6. 添加适当的中文注释
7. 确保组件可直接使用

请只返回完整的 .lyt 组件代码（包含 template、script setup、style scoped），不要包含任何额外说明。`
}

/**
 * 根据组件类型自动选择合适的 Prompt 模板
 */
export function getComponentPrompt(config: ComponentConfig): string {
  const basicTypes = ['button', 'input', 'select', 'functional']
  const compositeTypes = ['form', 'table', 'modal', 'card', 'list', 'dropdown', 'tabs', 'navigation']

  if (basicTypes.includes(config.type)) {
    return basicComponentPrompt(config)
  }

  if (compositeTypes.includes(config.type)) {
    return compositeComponentPrompt(config)
  }

  // 自定义类型 — 使用描述生成
  if (config.description) {
    return customComponentPrompt(config.description, { name: config.name })
  }

  return basicComponentPrompt(config)
}
