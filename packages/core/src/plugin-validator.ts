// src/plugin-validator.ts
// @lytjs/core - 插件验证器实现

import type { EnhancedPlugin, Plugin, PluginDependency } from './types';

/**
 * 验证报告中的单个问题
 */
export interface ValidationIssue {
  /** 问题级别 */
  level: 'error' | 'warning' | 'info';
  /** 问题规则名称 */
  rule: string;
  /** 问题描述 */
  message: string;
}

/**
 * 插件验证报告
 * @description 包含验证结果和所有发现的问题
 */
export interface ValidationReport {
  /** 是否通过验证（无 error 级别问题） */
  valid: boolean;
  /** 插件名称 */
  pluginName: string;
  /** 所有验证问题 */
  issues: ValidationIssue[];
  /** 错误数量 */
  errorCount: number;
  /** 警告数量 */
  warningCount: number;
  /** 信息数量 */
  infoCount: number;
}

/**
 * 验证规则函数类型
 */
type ValidationRule = (
  plugin: EnhancedPlugin | Plugin,
  context: ValidationContext,
) => ValidationIssue[];

/**
 * 验证上下文
 */
interface ValidationContext {
  /** 已知插件名称列表（用于循环依赖检测） */
  knownPlugins: Set<string>;
}

/**
 * 插件验证器
 * @description 对插件进行结构和配置验证，确保插件符合规范
 *
 * @example
 * ```typescript
 * const validator = new PluginValidator();
 *
 * // 验证单个插件
 * const report = validator.validate(myPlugin);
 * if (!report.valid) {
 *   console.error('Plugin validation failed:', report.issues);
 * }
 *
 * // 批量验证
 * const reports = validator.validateAll([plugin1, plugin2, plugin3]);
 * ```
 */
export class PluginValidator {
  /** 内置验证规则列表 */
  private rules: ValidationRule[] = [];

  /** 已知插件名称集合（用于跨插件验证） */
  private knownPlugins = new Set<string>();

  constructor() {
    // 注册默认验证规则（绑定 this 上下文）
    this.rules = [
      this.validateStructure.bind(this),
      this.validateName.bind(this),
      this.validateVersion.bind(this),
      this.validateDependencies.bind(this),
      this.validateConflicts.bind(this),
      this.validatePeerRequirements.bind(this),
      this.validateLifecycleHooks.bind(this),
    ];
  }

  /**
   * 验证插件
   * @param plugin - 要验证的插件
   * @returns 验证报告
   */
  validate(plugin: EnhancedPlugin | Plugin): ValidationReport {
    const pluginName = this.getPluginName(plugin) ?? 'anonymous';
    const context: ValidationContext = {
      knownPlugins: this.knownPlugins,
    };

    const issues: ValidationIssue[] = [];

    // 执行所有验证规则
    for (const rule of this.rules) {
      try {
        const ruleIssues = rule(plugin, context);
        issues.push(...ruleIssues);
      } catch (err) {
        issues.push({
          level: 'error',
          rule: 'rule-execution',
          message: `Validation rule execution failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    // 统计各级别问题数量
    const errorCount = issues.filter((i) => i.level === 'error').length;
    const warningCount = issues.filter((i) => i.level === 'warning').length;
    const infoCount = issues.filter((i) => i.level === 'info').length;

    return {
      valid: errorCount === 0,
      pluginName,
      issues,
      errorCount,
      warningCount,
      infoCount,
    };
  }

  /**
   * 批量验证多个插件
   * @param plugins - 要验证的插件列表
   * @returns 验证报告列表
   */
  validateAll(plugins: (EnhancedPlugin | Plugin)[]): ValidationReport[] {
    return plugins.map((plugin) => this.validate(plugin));
  }

  /**
   * 注册已知插件名称（用于跨插件验证）
   * @param names - 插件名称列表
   */
  registerKnownPlugins(names: string[]): void {
    for (const name of names) {
      this.knownPlugins.add(name);
    }
  }

  /**
   * 添加自定义验证规则
   * @param rule - 验证规则函数
   */
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * 移除验证规则
   * @param rule - 要移除的验证规则函数
   */
  removeRule(rule: ValidationRule): void {
    const index = this.rules.indexOf(rule);
    if (index !== -1) {
      this.rules.splice(index, 1);
    }
  }

  // ==================== 内置验证规则 ====================

  /**
   * 规则：验证插件基本结构
   * @description 确保插件有 install 方法
   */
  private validateStructure(plugin: EnhancedPlugin | Plugin): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!plugin || typeof plugin !== 'object') {
      issues.push({
        level: 'error',
        rule: 'validate-structure',
        message: 'Plugin must be an object.',
      });
      return issues;
    }

    if (typeof plugin.install !== 'function') {
      issues.push({
        level: 'error',
        rule: 'validate-structure',
        message: 'Plugin must have an "install" method that is a function.',
      });
    }

    return issues;
  }

  /**
   * 规则：验证插件名称
   * @description 确保名称有效且不冲突
   */
  private validateName(plugin: EnhancedPlugin | Plugin): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 非对象插件跳过名称验证（由 validateStructure 处理）
    if (!plugin || typeof plugin !== 'object') {
      return issues;
    }

    const name = this.getPluginName(plugin);

    if (name === undefined) {
      issues.push({
        level: 'warning',
        rule: 'validate-name',
        message:
          'Plugin has no name. It is recommended to use EnhancedPlugin with a "name" property for better debugging and dependency management.',
      });
      return issues;
    }

    // 名称格式检查
    if (typeof name !== 'string') {
      issues.push({
        level: 'error',
        rule: 'validate-name',
        message: `Plugin name must be a string, got ${typeof name}.`,
      });
      return issues;
    }

    if (name.trim().length === 0) {
      issues.push({
        level: 'error',
        rule: 'validate-name',
        message: 'Plugin name must not be empty.',
      });
      return issues;
    }

    // 名称格式规范：推荐 kebab-case
    const validNamePattern = /^[a-z][a-z0-9-]*$/;
    if (!validNamePattern.test(name)) {
      issues.push({
        level: 'warning',
        rule: 'validate-name',
        message: `Plugin name "${name}" does not follow kebab-case convention (e.g., "my-plugin").`,
      });
    }

    // 名称长度限制
    if (name.length > 100) {
      issues.push({
        level: 'warning',
        rule: 'validate-name',
        message: `Plugin name "${name}" is too long (max 100 characters).`,
      });
    }

    return issues;
  }

  /**
   * 规则：验证版本号格式
   * @description 确保版本号符合 semver 格式
   */
  private validateVersion(plugin: EnhancedPlugin | Plugin): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!this.isEnhancedPlugin(plugin)) {
      return issues;
    }

    if (plugin.version !== undefined) {
      if (typeof plugin.version !== 'string') {
        issues.push({
          level: 'error',
          rule: 'validate-version',
          message: `Plugin version must be a string, got ${typeof plugin.version}.`,
        });
      } else {
        // semver 格式检查（主版本.次版本.修订号）
        const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
        if (!semverPattern.test(plugin.version)) {
          issues.push({
            level: 'warning',
            rule: 'validate-version',
            message: `Plugin version "${plugin.version}" does not follow semver format (e.g., "1.0.0").`,
          });
        }
      }
    } else {
      issues.push({
        level: 'info',
        rule: 'validate-version',
        message:
          'Plugin has no version. It is recommended to provide a version for compatibility checks.',
      });
    }

    return issues;
  }

  /**
   * 规则：验证依赖声明
   * @description 检查依赖格式和已知性
   */
  private validateDependencies(plugin: EnhancedPlugin | Plugin): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!this.isEnhancedPlugin(plugin)) {
      return issues;
    }

    // 验证必需依赖
    if (plugin.dependencies) {
      if (!Array.isArray(plugin.dependencies)) {
        issues.push({
          level: 'error',
          rule: 'validate-dependencies',
          message: 'Plugin "dependencies" must be an array.',
        });
      } else {
        issues.push(...this.validateDependencyArray(plugin.dependencies, 'dependencies', false));
      }
    }

    // 验证可选依赖
    if (plugin.optionalDependencies) {
      if (!Array.isArray(plugin.optionalDependencies)) {
        issues.push({
          level: 'error',
          rule: 'validate-dependencies',
          message: 'Plugin "optionalDependencies" must be an array.',
        });
      } else {
        issues.push(
          ...this.validateDependencyArray(
            plugin.optionalDependencies,
            'optionalDependencies',
            true,
          ),
        );
      }
    }

    // 检查依赖是否与自身冲突
    if (plugin.dependencies && plugin.name) {
      for (const dep of plugin.dependencies) {
        if (dep.name === plugin.name) {
          issues.push({
            level: 'error',
            rule: 'validate-dependencies',
            message: `Plugin "${plugin.name}" cannot depend on itself.`,
          });
        }
      }
    }

    return issues;
  }

  /**
   * 验证依赖数组
   */
  private validateDependencyArray(
    deps: PluginDependency[],
    field: string,
    isOptional: boolean,
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const seenNames = new Set<string>();

    for (const dep of deps) {
      // 检查依赖名称
      if (!dep.name || typeof dep.name !== 'string') {
        issues.push({
          level: 'error',
          rule: 'validate-dependencies',
          message: `Each dependency in "${field}" must have a valid "name" string.`,
        });
        continue;
      }

      // 检查重复依赖
      if (seenNames.has(dep.name)) {
        issues.push({
          level: 'warning',
          rule: 'validate-dependencies',
          message: `Duplicate dependency "${dep.name}" in "${field}".`,
        });
      }
      seenNames.add(dep.name);

      // 检查版本格式
      if (dep.version !== undefined && typeof dep.version !== 'string') {
        issues.push({
          level: 'error',
          rule: 'validate-dependencies',
          message: `Dependency "${dep.name}" version must be a string.`,
        });
      }

      // 检查 optional 标记是否合理
      if (dep.optional && !isOptional) {
        issues.push({
          level: 'info',
          rule: 'validate-dependencies',
          message: `Dependency "${dep.name}" has "optional: true" but is in required "${field}". Consider moving it to "optionalDependencies".`,
        });
      }
    }

    return issues;
  }

  /**
   * 规则：验证冲突声明
   * @description 检查冲突列表格式
   */
  private validateConflicts(plugin: EnhancedPlugin | Plugin): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!this.isEnhancedPlugin(plugin)) {
      return issues;
    }

    if (plugin.conflicts) {
      if (!Array.isArray(plugin.conflicts)) {
        issues.push({
          level: 'error',
          rule: 'validate-conflicts',
          message: 'Plugin "conflicts" must be an array of plugin name strings.',
        });
      } else {
        for (const conflict of plugin.conflicts) {
          if (typeof conflict !== 'string') {
            issues.push({
              level: 'error',
              rule: 'validate-conflicts',
              message: `Each conflict entry must be a string, got ${typeof conflict}.`,
            });
          }
        }

        // 检查是否与自身冲突
        if (plugin.name && plugin.conflicts.includes(plugin.name)) {
          issues.push({
            level: 'error',
            rule: 'validate-conflicts',
            message: `Plugin "${plugin.name}" cannot conflict with itself.`,
          });
        }
      }
    }

    return issues;
  }

  /**
   * 规则：验证 peerRequirements
   * @description 检查宿主框架版本要求格式
   */
  private validatePeerRequirements(plugin: EnhancedPlugin | Plugin): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!this.isEnhancedPlugin(plugin)) {
      return issues;
    }

    if (plugin.peerRequirements) {
      if (typeof plugin.peerRequirements !== 'object' || plugin.peerRequirements === null) {
        issues.push({
          level: 'error',
          rule: 'validate-peer-requirements',
          message: 'Plugin "peerRequirements" must be an object.',
        });
        return issues;
      }

      const { lytjs, node } = plugin.peerRequirements;

      if (lytjs !== undefined && typeof lytjs !== 'string') {
        issues.push({
          level: 'error',
          rule: 'validate-peer-requirements',
          message: 'peerRequirements.lytjs must be a version range string.',
        });
      }

      if (node !== undefined && typeof node !== 'string') {
        issues.push({
          level: 'error',
          rule: 'validate-peer-requirements',
          message: 'peerRequirements.node must be a version range string.',
        });
      }
    }

    return issues;
  }

  /**
   * 规则：验证生命周期钩子
   * @description 确保生命周期钩子是函数
   */
  private validateLifecycleHooks(plugin: EnhancedPlugin | Plugin): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!this.isEnhancedPlugin(plugin)) {
      return issues;
    }

    const hooks: Array<{ name: string; value: unknown }> = [
      { name: 'beforeInstall', value: plugin.beforeInstall },
      { name: 'afterInstall', value: plugin.afterInstall },
      { name: 'beforeMount', value: plugin.beforeMount },
      { name: 'afterMount', value: plugin.afterMount },
      { name: 'cleanup', value: plugin.cleanup },
    ];

    for (const hook of hooks) {
      if (hook.value !== undefined && typeof hook.value !== 'function') {
        issues.push({
          level: 'error',
          rule: 'validate-lifecycle-hooks',
          message: `Plugin lifecycle hook "${hook.name}" must be a function, got ${typeof hook.value}.`,
        });
      }
    }

    return issues;
  }

  // ==================== 工具方法 ====================

  /**
   * 获取插件名称
   */
  private getPluginName(plugin: EnhancedPlugin | Plugin): string | undefined {
    if (this.isEnhancedPlugin(plugin)) {
      return plugin.name;
    }
    // 基础 Plugin 尝试从 name 属性获取
    if (plugin == null || typeof plugin !== 'object') {
      return undefined;
    }
    const rawName = (plugin as unknown as Record<string, unknown>).name;
    return typeof rawName === 'string' ? rawName : undefined;
  }

  /**
   * 检查是否为 EnhancedPlugin
   */
  private isEnhancedPlugin(plugin: EnhancedPlugin | Plugin): plugin is EnhancedPlugin {
    return (
      plugin != null &&
      typeof plugin === 'object' &&
      'name' in plugin &&
      typeof (plugin as EnhancedPlugin).name === 'string'
    );
  }
}
