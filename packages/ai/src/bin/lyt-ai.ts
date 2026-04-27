#!/usr/bin/env node
/**
 * Lyt.js AI CLI 工具
 *
 * 提供智能组件生成功能
 */

import * as fs from 'fs'
import * as path from 'path'
import { createComponent } from '../component-generator'
import type { ComponentConfig, ComponentType } from '../types'

/**
 * CLI 参数解析
 */
interface CliOptions {
  command: string
  name: string
  type: ComponentType
  output?: string
  style: boolean
  help: boolean
}

/**
 * 解析 CLI 参数
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {
    command: 'generate',
    name: '',
    type: 'functional',
    style: true,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '-h':
      case '--help':
        options.help = true
        break
      case '-t':
      case '--type':
        options.type = args[++i] as ComponentType
        break
      case '-o':
      case '--output':
        options.output = args[++i]
        break
      case '--no-style':
        options.style = false
        break
      default:
        if (!options.name) {
          options.name = arg
        }
        break
    }
  }

  return options
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
lyt-ai - Lyt.js AI 辅助开发工具

用法:
  lyt-ai <component-name> [options]

选项:
  -h, --help        显示帮助信息
  -t, --type        组件类型 (default: functional)
                    可选: functional, button, input, card, list, modal, custom
  -o, --output      输出文件路径
  --no-style        不添加样式

示例:
  # 生成一个按钮组件
  lyt-ai MyButton --type button

  # 生成一个模态框组件并保存到文件
  lyt-ai MyModal --type modal --output ./src/components/MyModal.lyt

  # 生成一个纯函数组件（无样式）
  lyt-ai MyComponent --type functional --no-style
`)
}

/**
 * 主函数
 */
function main() {
  const options = parseArgs()

  if (options.help) {
    showHelp()
    process.exit(0)
  }

  if (!options.name) {
    console.error('错误: 请指定组件名称')
    showHelp()
    process.exit(1)
  }

  const config: ComponentConfig = {
    name: options.name,
    type: options.type,
    style: options.style,
    scriptSetup: true,
  }

  console.log(`正在生成组件: ${options.name}`)
  console.log(`组件类型: ${options.type}`)

  const result = createComponent(config)

  // 输出结果
  for (const message of result.messages) {
    console.log(`✓ ${message}`)
  }

  // 保存文件
  if (options.output) {
    const dir = path.dirname(options.output)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(options.output, result.code, 'utf-8')
    console.log(`✓ 组件已保存到: ${options.output}`)
  } else {
    // 如果没有指定输出路径，输出到控制台
    console.log('\n' + '='.repeat(60))
    console.log(result.code)
    console.log('='.repeat(60))
  }
}

// 执行
main()
