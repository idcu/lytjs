/**
 * Lyt.js Plugin SDK — 插件验证器
 *
 * 提供插件清单、配置、权限和兼容性的验证功能：
 * - validateManifest: 验证插件清单（必填字段、版本号格式、名称规范）
 * - validateConfig: 验证插件配置是否符合 Schema
 * - validatePermissions: 验证权限列表
 * - validateCompatibility: 验证插件与框架版本的兼容性
 * - validateName: 验证插件名称规范
 * - validateVersion: 验证语义化版本号
 *
 * 纯原生零依赖实现。
 */

import type {
  LytPlugin,
  LytPluginConfig,
  LytPluginPermission,
  ValidationResult,
} from './types';

// ============================================================
// 常量
// ============================================================

/** 插件清单必填字段 */
const REQUIRED_FIELDS: string[] = [
  'name',
  'version',
  'description',
  'author',
  'main',
  'category',
];

/** 合法的插件分类 */
const VALID_CATEGORIES: string[] = [
  'ui',
  'tool',
  'integration',
  'theme',
  'analytics',
  'auth',
  'storage',
  'other',
];

/** 合法的插件权限 */
const VALID_PERMISSIONS: string[] = [
  'storage',
  'network',
  'clipboard',
  'notification',
  'theme',
  'router',
  'i18n',
];

/** 插件名称正则（lyt-plugin-xxx 或 @scope/lyt-plugin-xxx） */
const NAME_PATTERN = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?lyt-plugin-[a-z0-9-~]+$/;

/** 语义化版本号正则 */
const VERSION_PATTERN = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;

/** 版本范围正则（简化版，支持 >=, ^, ~ 前缀） */
const VERSION_RANGE_PATTERN = /^(\^|~|>=|>|<=|<|=)?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;

// ============================================================
// PluginValidator
// ============================================================

/**
 * 插件验证器
 *
 * 提供一系列静态方法用于验证插件的各个方面。
 */
export class PluginValidator {
  // --------------------------------------------------------
  // 清单验证
  // --------------------------------------------------------

  /**
   * 验证插件清单
   *
   * 检查必填字段、版本号格式、名称规范、分类合法性等。
   *
   * @param manifest - 待验证的清单对象
   * @returns 验证结果
   */
  static validateManifest(manifest: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查是否为对象
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
      return {
        valid: false,
        errors: ['插件清单必须是一个对象'],
        warnings: [],
      };
    }

    // 检查必填字段
    for (const field of REQUIRED_FIELDS) {
      if (!manifest[field] || (typeof manifest[field] === 'string' && manifest[field].trim() === '')) {
        errors.push(`缺少必填字段: ${field}`);
      }
    }

    // 检查名称规范
    if (manifest.name && !PluginValidator.validateName(manifest.name)) {
      errors.push(
        `插件名称 "${manifest.name}" 不符合命名规范，应为 lyt-plugin-xxx 或 @scope/lyt-plugin-xxx`
      );
    }

    // 检查版本号格式
    if (manifest.version && !PluginValidator.validateVersion(manifest.version)) {
      errors.push(`版本号 "${manifest.version}" 不符合语义化版本规范（semver）`);
    }

    // 检查分类合法性
    if (manifest.category && !VALID_CATEGORIES.includes(manifest.category)) {
      errors.push(
        `无效的分类 "${manifest.category}"，合法值: ${VALID_CATEGORIES.join(', ')}`
      );
    }

    // 检查 keywords
    if (!manifest.keywords || !Array.isArray(manifest.keywords)) {
      warnings.push('建议提供 keywords 数组以提高插件可发现性');
    } else if (manifest.keywords.length === 0) {
      warnings.push('keywords 数组为空，建议添加关键词');
    }

    // 检查 license
    if (!manifest.license) {
      warnings.push('建议提供 license 字段');
    }

    // 检查 description 长度
    if (manifest.description && typeof manifest.description === 'string') {
      if (manifest.description.length < 10) {
        warnings.push('description 过短，建议至少 10 个字符');
      }
      if (manifest.description.length > 500) {
        warnings.push('description 过长，建议不超过 500 个字符');
      }
    }

    // 检查 main 字段
    if (manifest.main && typeof manifest.main === 'string') {
      if (!manifest.main.endsWith('.js') && !manifest.main.endsWith('.ts') && !manifest.main.endsWith('.mjs')) {
        warnings.push(`main 字段 "${manifest.main}" 建议使用 .js / .ts / .mjs 扩展名`);
      }
    }

    // 检查 peerDependencies 中的框架版本
    if (manifest.peerDependencies && typeof manifest.peerDependencies === 'object') {
      if (manifest.peerDependencies['@lytjs/core']) {
        const range = manifest.peerDependencies['@lytjs/core'];
        if (!VERSION_RANGE_PATTERN.test(range)) {
          errors.push(`peerDependencies["@lytjs/core"] 的版本范围 "${range}" 格式无效`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // --------------------------------------------------------
  // 配置验证
  // --------------------------------------------------------

  /**
   * 验证插件配置
   *
   * 根据提供的 Schema 验证配置值的类型和必填项。
   *
   * @param config - 待验证的配置对象
   * @param schema - 配置 Schema
   * @returns 验证结果
   */
  static validateConfig(config: any, schema: LytPluginConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return {
        valid: false,
        errors: ['配置必须是一个对象'],
        warnings: [],
      };
    }

    if (!schema || !schema.schema || typeof schema.schema !== 'object') {
      return {
        valid: false,
        errors: ['配置 Schema 无效'],
        warnings: [],
      };
    }

    const schemaDef = schema.schema;
    const properties = schemaDef.properties || {};
    const required = schema.required || schemaDef.required || [];

    // 检查必填字段
    for (const field of required) {
      if (config[field] === undefined || config[field] === null) {
        errors.push(`缺少必填配置项: ${field}`);
      }
    }

    // 检查字段类型
    for (const [key, value] of Object.entries(config)) {
      const propSchema = properties[key];
      if (!propSchema) {
        warnings.push(`未知配置项: ${key}`);
        continue;
      }

      const expectedType = (propSchema as any).type;
      if (expectedType && !PluginValidator.checkType(value, expectedType)) {
        errors.push(
          `配置项 "${key}" 类型错误：期望 ${expectedType}，实际为 ${typeof value}`
        );
      }

      // 检查枚举值
      const enumValues = (propSchema as any).enum;
      if (enumValues && Array.isArray(enumValues) && !enumValues.includes(value)) {
        errors.push(
          `配置项 "${key}" 的值 "${value}" 不在允许范围内: ${enumValues.join(', ')}`
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // --------------------------------------------------------
  // 权限验证
  // --------------------------------------------------------

  /**
   * 验证权限列表
   *
   * @param permissions - 待验证的权限列表
   * @returns 验证结果
   */
  static validatePermissions(permissions: LytPluginPermission[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(permissions)) {
      return {
        valid: false,
        errors: ['权限列表必须是一个数组'],
        warnings: [],
      };
    }

    const seen = new Set<string>();
    for (const perm of permissions) {
      if (!VALID_PERMISSIONS.includes(perm)) {
        errors.push(`无效的权限: ${perm}，合法值: ${VALID_PERMISSIONS.join(', ')}`);
      }
      if (seen.has(perm)) {
        warnings.push(`权限 "${perm}" 重复声明`);
      }
      seen.add(perm);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // --------------------------------------------------------
  // 兼容性验证
  // --------------------------------------------------------

  /**
   * 验证插件与框架版本的兼容性
   *
   * @param plugin - 插件对象
   * @param frameworkVersion - 框架版本号
   * @returns 验证结果
   */
  static validateCompatibility(plugin: LytPlugin, frameworkVersion: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查框架版本号格式
    if (!PluginValidator.validateVersion(frameworkVersion)) {
      errors.push(`框架版本号 "${frameworkVersion}" 格式无效`);
      return { valid: false, errors, warnings };
    }

    // 检查插件的 lytVersion 要求
    if (plugin.lytVersion) {
      const satisfied = PluginValidator.satisfiesVersion(frameworkVersion, plugin.lytVersion);
      if (!satisfied) {
        errors.push(
          `插件要求框架版本 ${plugin.lytVersion}，当前版本为 ${frameworkVersion}`
        );
      }
    }

    // 检查 peerDependencies 中的 @lytjs/core
    if (plugin.peerDependencies && plugin.peerDependencies['@lytjs/core']) {
      const range = plugin.peerDependencies['@lytjs/core'];
      const satisfied = PluginValidator.satisfiesVersion(frameworkVersion, range);
      if (!satisfied) {
        errors.push(
          `插件要求 @lytjs/core 版本 ${range}，当前版本为 ${frameworkVersion}`
        );
      }
    }

    if (errors.length === 0 && !plugin.lytVersion && !(plugin.peerDependencies && plugin.peerDependencies['@lytjs/core'])) {
      warnings.push('插件未声明框架版本要求，可能存在兼容性风险');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // --------------------------------------------------------
  // 名称验证
  // --------------------------------------------------------

  /**
   * 验证插件名称规范
   *
   * 合法格式：
   * - lyt-plugin-xxx
   * - @scope/lyt-plugin-xxx
   *
   * @param name - 插件名称
   * @returns 是否合法
   */
  static validateName(name: string): boolean {
    return NAME_PATTERN.test(name);
  }

  // --------------------------------------------------------
  // 版本验证
  // --------------------------------------------------------

  /**
   * 验证语义化版本号
   *
   * 合法格式：x.y.z 或 x.y.z-prerelease
   *
   * @param version - 版本号字符串
   * @returns 是否合法
   */
  static validateVersion(version: string): boolean {
    return VERSION_PATTERN.test(version);
  }

  // --------------------------------------------------------
  // 内部工具方法
  // --------------------------------------------------------

  /**
   * 检查值是否符合指定类型
   */
  private static checkType(value: any, expectedType: string): boolean {
    if (expectedType === 'string') return typeof value === 'string';
    if (expectedType === 'number') return typeof value === 'number' && !isNaN(value);
    if (expectedType === 'boolean') return typeof value === 'boolean';
    if (expectedType === 'object') return typeof value === 'object' && value !== null && !Array.isArray(value);
    if (expectedType === 'array') return Array.isArray(value);
    if (expectedType === 'integer') return Number.isInteger(value);
    return true;
  }

  /**
   * 检查版本号是否满足版本范围
   *
   * 支持前缀：
   * - ^: 兼容主版本（>=x.y.z 且 <(x+1).0.0）
   * - ~: 兼容次版本（>=x.y.z 且 <x.(y+1).0）
   * - >=: 大于等于
   * - >: 大于
   * - <=: 小于等于
   * - <: 小于
   * - 无前缀: 精确匹配
   *
   * @param version - 当前版本号
   * @param range - 版本范围
   * @returns 是否满足
   */
  private static satisfiesVersion(version: string, range: string): boolean {
    // 提取前缀和目标版本
    let prefix = '';
    let target = range;

    if (range.startsWith('>=')) { prefix = '>='; target = range.slice(2); }
    else if (range.startsWith('<=')) { prefix = '<='; target = range.slice(2); }
    else if (range.startsWith('>')) { prefix = '>'; target = range.slice(1); }
    else if (range.startsWith('<')) { prefix = '<'; target = range.slice(1); }
    else if (range.startsWith('^')) { prefix = '^'; target = range.slice(1); }
    else if (range.startsWith('~')) { prefix = '~'; target = range.slice(1); }
    else if (range.startsWith('=')) { prefix = '='; target = range.slice(1); }

    const vParts = version.split('.').map(Number);
    const tParts = target.split('.').map(Number);

    const compare = (): number => {
      for (let i = 0; i < 3; i++) {
        const v = vParts[i] || 0;
        const t = tParts[i] || 0;
        if (v > t) return 1;
        if (v < t) return -1;
      }
      return 0;
    };

    switch (prefix) {
      case '>=': return compare() >= 0;
      case '>': return compare() > 0;
      case '<=': return compare() <= 0;
      case '<': return compare() < 0;
      case '=':
      case '': return compare() === 0;
      case '^': {
        // >=target 且 <(major+1).0.0
        if (compare() < 0) return false;
        return vParts[0] === tParts[0];
      }
      case '~': {
        // >=target 且 <major.(minor+1).0
        if (compare() < 0) return false;
        return vParts[0] === tParts[0] && vParts[1] === tParts[1];
      }
      default: return compare() === 0;
    }
  }
}
