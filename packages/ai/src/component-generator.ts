/**
 * 组件生成器
 *
 * 提供智能组件生成功能
 */

import { TemplateEngine } from './template-engine'
import type { ComponentConfig, TemplateContext, GenerateResult } from './types'

/**
 * 组件生成器类
 */
export class ComponentGenerator {
  private templateEngine: TemplateEngine

  constructor() {
    this.templateEngine = new TemplateEngine()
  }

  /**
   * 生成组件
   */
  generate(config: ComponentConfig): GenerateResult {
    const context = this.buildContext(config)
    const template = this.templateEngine.getComponentTemplate(config.type)
    const code = this.templateEngine.render(template, context)

    return {
      code,
      messages: [
        `Component "${config.name}" generated successfully.`,
        `Type: ${config.type}`,
        `Style: ${config.style ? 'Enabled' : 'Disabled'}`,
      ],
    }
  }

  /**
   * 构建模板上下文
   */
  private buildContext(config: ComponentConfig): TemplateContext {
    // 转换组件名称格式
    const pascalName = this.toPascalCase(config.name)
    const camelName = this.toCamelCase(config.name)
    const kebabName = this.toKebabCase(config.name)

    return {
      ...config,
      pascalName,
      camelName,
      kebabName,
    }
  }

  /**
   * 转换为大驼峰格式
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^([a-z])/, (c) => c.toUpperCase())
  }

  /**
   * 转换为小驼峰格式
   */
  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str)
    return pascal.charAt(0).toLowerCase() + pascal.slice(1)
  }

  /**
   * 转换为短横线格式
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
      .replace(/[-_\s]+/g, '-')
  }
}

/**
 * 便捷函数：创建组件
 */
export function createComponent(config: ComponentConfig): GenerateResult {
  const generator = new ComponentGenerator()
  return generator.generate(config)
}
