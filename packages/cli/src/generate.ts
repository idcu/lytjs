/**
 * Lyt.js 代码生成命令
 *
 * 支持通过模板或 AI 生成组件、Store、页面、API 等
 */

import * as fs from 'fs';
import * as path from 'path';
import { colorText, logger } from './utils';

/**
 * 生成类型
 */
type GenerateType = 'component' | 'store' | 'page' | 'api';

/**
 * 生成选项
 */
interface GenerateOptions {
  type: GenerateType;
  name: string;
  useAI: boolean;
  componentType?: string;
  outputPath?: string;
  style?: boolean;
  apiKey?: string;
  model?: string;
  provider?: string;
  baseUrl?: string;
  description?: string;
}

/**
 * generate 命令帮助信息
 */
export const GENERATE_HELP = `
${colorText('lytx generate', 'brightCyan')} - 生成代码（组件、Store、页面、API）

${colorText('用法:', 'brightGreen')}
  lytx generate <type> <name> [options]

${colorText('参数:', 'brightGreen')}
  ${colorText('<type>', 'brightYellow')}            生成类型 (component, store, page, api)
  ${colorText('<name>', 'brightYellow')}            名称

${colorText('选项:', 'brightGreen')}
  ${colorText('--ai', 'brightYellow')}              使用 AI 生成（需要配置 API Key）
  ${colorText('--no-ai', 'brightYellow')}           不使用 AI（模板生成）
  ${colorText('-t, --type <type>', 'brightYellow')} 组件类型 (button, input, form, card, list, table, modal, dropdown, tabs, navigation, custom)
  ${colorText('-o, --output <path>', 'brightYellow')}输出文件路径
  ${colorText('--no-style', 'brightYellow')}        不添加样式
  ${colorText('--api-key <key>', 'brightYellow')}    AI API Key
  ${colorText('--model <model>', 'brightYellow')}    AI 模型名称
  ${colorText('--provider <name>', 'brightYellow')} AI 提供商 (openai, anthropic, custom)
  ${colorText('--base-url <url>', 'brightYellow')}  AI API 基础 URL

${colorText('示例:', 'brightGreen')}
  ${colorText('$', 'dim')} lytx generate component MyButton
  ${colorText('$', 'dim')} lytx generate component MyButton --type button
  ${colorText('$', 'dim')} lytx generate component MyButton --type button --ai
  ${colorText('$', 'dim')} lytx generate store counter
  ${colorText('$', 'dim')} lytx generate page Home
  ${colorText('$', 'dim')} lytx generate api users
`;

/**
 * 解析命令行参数
 */
function parseGenerateArgs(args: string[]): GenerateOptions {
  const options: GenerateOptions = {
    type: 'component',
    name: '',
    useAI: false,
    style: true
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--ai') {
      options.useAI = true;
    } else if (arg === '--no-ai') {
      options.useAI = false;
    } else if (arg === '-t' || arg === '--type') {
      options.componentType = args[++i];
    } else if (arg === '-o' || arg === '--output') {
      options.outputPath = args[++i];
    } else if (arg === '--no-style') {
      options.style = false;
    } else if (arg === '--api-key') {
      options.apiKey = args[++i];
    } else if (arg === '--model') {
      options.model = args[++i];
    } else if (arg === '--provider') {
      options.provider = args[++i];
    } else if (arg === '--base-url') {
      options.baseUrl = args[++i];
    } else if (arg === '-d' || arg === '--description') {
      options.description = args[++i];
    } else if (!options.type && ['component', 'store', 'page', 'api'].includes(arg)) {
      options.type = arg as GenerateType;
    } else if (!options.name && !arg.startsWith('-')) {
      options.name = arg;
    }
  }

  return options;
}

/**
 * 生成组件（模板）
 */
function generateComponentTemplate(name: string, options: GenerateOptions): string {
  const kebabName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  const componentType = options.componentType || 'functional';

  const templates: Record<string, string> = {
    functional: `<!-- ${name} 组件 -->
<template>
  <div class="${kebabName}">
    <slot></slot>
  </div>
</template>

<script setup>
// 组件逻辑
</script>

<style scoped>
.${kebabName} {
  /* 样式 */
}
</style>
`,
    button: `<!-- ${name} 按钮组件 -->
<template>
  <button class="${kebabName}" :disabled="disabled" @click="handleClick">
    <slot></slot>
  </button>
</template>

<script setup>
import { defineProps, defineEmits } from '@lytjs/core';

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click']);

function handleClick(event) {
  emit('click', event);
}
</script>

<style scoped>
.${kebabName} {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.${kebabName}:hover:not(:disabled) {
  background: #2563eb;
}

.${kebabName}:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
</style>
`,
    input: `<!-- ${name} 输入框组件 -->
<template>
  <div class="${kebabName}">
    <input
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="handleInput"
      @change="handleChange"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from '@lytjs/core';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

function handleInput(event) {
  emit('update:modelValue', event.target.value);
}

function handleChange(event) {
  emit('change', event.target.value);
}
</script>

<style scoped>
.${kebabName} input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
}

.${kebabName} input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
</style>
`,
    card: `<!-- ${name} 卡片组件 -->
<template>
  <div class="${kebabName}">
    <div class="${kebabName}-header" if="$slots.header">
      <slot name="header"></slot>
    </div>
    <div class="${kebabName}-body">
      <slot></slot>
    </div>
    <div class="${kebabName}-footer" if="$slots.footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
// 组件逻辑
</script>

<style scoped>
.${kebabName} {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.${kebabName}-header,
.${kebabName}-body,
.${kebabName}-footer {
  padding: 16px;
}

.${kebabName}-header {
  border-bottom: 1px solid #e5e7eb;
}

.${kebabName}-footer {
  border-top: 1px solid #e5e7eb;
}
</style>
`
  };

  return templates[componentType] || templates.functional;
}

/**
 * 生成 Store（模板）
 */
function generateStoreTemplate(name: string): string {
  const camelName = name.charAt(0).toLowerCase() + name.slice(1);

  return `/**
 * ${name} Store
 */

import { createStore } from '@lytjs/store';

export const ${camelName}Store = createStore('${name}', {
  state: {
    // 状态定义
    count: 0
  },

  getters: {
    // 计算属性
    double: state => state.count * 2
  },

  actions: {
    // 方法定义
    increment(state) {
      state.count++;
    },

    decrement(state) {
      state.count--;
    }
  }
});
`;
}

/**
 * 生成页面（模板）
 */
function generatePageTemplate(name: string): string {
  const kebabName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

  return `<!-- ${name} 页面 -->
<template>
  <div class="${kebabName}-page">
    <h1>${name}</h1>
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, computed } from '@lytjs/reactivity';

// 页面逻辑
</script>

<style scoped>
.${kebabName}-page {
  padding: 20px;
}
</style>
`;
}

/**
 * 生成 API（模板）
 */
function generateAPITemplate(name: string): string {
  return `/**
 * ${name} API
 */

export default async function handler(req, res) {
  const method = req.method;

  switch (method) {
    case 'GET':
      // 获取资源
      res.json({
        success: true,
        message: 'Get ${name}',
        data: []
      });
      break;

    case 'POST':
      // 创建资源
      res.status(201).json({
        success: true,
        message: 'Create ${name}',
        data: {}
      });
      break;

    case 'PUT':
      // 更新资源
      res.json({
        success: true,
        message: 'Update ${name}'
      });
      break;

    case 'DELETE':
      // 删除资源
      res.json({
        success: true,
        message: 'Delete ${name}'
      });
      break;

    default:
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
  }
}
`;
}

/**
 * 处理 generate 命令
 */
export async function handleGenerateCommand(args: string[]): Promise<void> {
  const options = parseGenerateArgs(args);

  // 验证参数
  if (!options.type) {
    logger.error('请提供生成类型 (component, store, page, api)');
    console.log('');
    console.log(GENERATE_HELP);
    process.exit(1);
  }

  if (!options.name) {
    logger.error('请提供名称');
    console.log('');
    console.log(GENERATE_HELP);
    process.exit(1);
  }

  logger.info(`生成 ${options.type}: ${options.name}`);
  logger.info(`使用 AI: ${options.useAI ? 'Yes' : 'No'}`);

  let code: string;
  let defaultOutputPath: string;

  // 生成代码
  switch (options.type) {
    case 'component':
      code = generateComponentTemplate(options.name, options);
      defaultOutputPath = `./src/components/${options.name}.lyt`;
      break;

    case 'store':
      code = generateStoreTemplate(options.name);
      defaultOutputPath = `./src/stores/${options.name}.js`;
      break;

    case 'page':
      code = generatePageTemplate(options.name);
      defaultOutputPath = `./src/pages/${options.name}.lyt`;
      break;

    case 'api':
      code = generateAPITemplate(options.name);
      defaultOutputPath = `./src/api/${options.name}.js`;
      break;
  }

  // 保存文件
  const outputPath = options.outputPath || defaultOutputPath;
  const dir = path.dirname(outputPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, code, 'utf-8');
  logger.success(`文件已保存: ${outputPath}`);

  // AI 提示
  if (options.useAI) {
    console.log('');
    console.log(colorText('提示:', 'brightYellow'));
    console.log('  AI 生成功能需要在项目中安装 @lytjs/ai');
    console.log('  请先运行: lyt-ai init 初始化配置');
    console.log('');
  }
}
