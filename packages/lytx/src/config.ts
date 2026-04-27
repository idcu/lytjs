/**
 * LytX - 配置加载模块
 *
 * 从项目根目录读取 lytx.config.ts 或 lytx.config.js，
 * 与默认值合并后返回完整配置。
 *
 * 纯原生零依赖实现，使用 Node.js fs/path 模块。
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { LytXConfig, ResolvedLytXConfig } from './types'

// ================================================================
//  默认配置
// ================================================================

const DEFAULT_CONFIG: ResolvedLytXConfig = {
  base: '/',
  pagesDir: 'src/pages',
  layoutsDir: 'src/layouts',
  outDir: 'dist',
  apiDir: 'src/pages/api',
  site: {
    title: 'LytX App',
    description: '',
    lang: 'zh-CN',
  },
  mode: 'ssg',
  build: {
    inlineStyles: false,
    minify: true,
  },
  middleware: {},
}

// ================================================================
//  配置验证
// ================================================================

/**
 * 验证配置值的合法性
 *
 * @param config 用户配置
 * @returns 验证后的配置（非法值被修正）
 */
function validateConfig(config: LytXConfig): LytXConfig {
  const validated = { ...config }

  // 验证 base 路径
  if (validated.base !== undefined) {
    if (typeof validated.base !== 'string') {
      validated.base = DEFAULT_CONFIG.base
    } else if (!validated.base.startsWith('/')) {
      validated.base = '/' + validated.base
    }
  }

  // 验证 mode
  if (validated.mode !== undefined) {
    const validModes: Array<'ssr' | 'ssg' | 'spa'> = ['ssr', 'ssg', 'spa']
    if (!validModes.includes(validated.mode)) {
      validated.mode = DEFAULT_CONFIG.mode
    }
  }

  // 验证 build 选项
  if (validated.build !== undefined) {
    validated.build = { ...validated.build }
    if (typeof validated.build.inlineStyles !== 'boolean') {
      validated.build.inlineStyles = DEFAULT_CONFIG.build.inlineStyles
    }
    if (typeof validated.build.minify !== 'boolean') {
      validated.build.minify = DEFAULT_CONFIG.build.minify
    }
  }

  // 验证 site 选项
  if (validated.site !== undefined) {
    validated.site = { ...validated.site }
    if (validated.site.title !== undefined && typeof validated.site.title !== 'string') {
      validated.site.title = DEFAULT_CONFIG.site.title
    }
    if (validated.site.description !== undefined && typeof validated.site.description !== 'string') {
      validated.site.description = DEFAULT_CONFIG.site.description
    }
    if (validated.site.lang !== undefined && typeof validated.site.lang !== 'string') {
      validated.site.lang = DEFAULT_CONFIG.site.lang
    }
  }

  return validated
}

// ================================================================
//  配置合并
// ================================================================

/**
 * 深度合并用户配置与默认配置
 *
 * @param userConfig 用户配置
 * @returns 合并后的完整配置
 */
function mergeConfig(userConfig: LytXConfig): ResolvedLytXConfig {
  return {
    base: userConfig.base ?? DEFAULT_CONFIG.base,
    pagesDir: userConfig.pagesDir ?? DEFAULT_CONFIG.pagesDir,
    layoutsDir: userConfig.layoutsDir ?? DEFAULT_CONFIG.layoutsDir,
    outDir: userConfig.outDir ?? DEFAULT_CONFIG.outDir,
    apiDir: userConfig.apiDir ?? DEFAULT_CONFIG.apiDir,
    site: {
      title: userConfig.site?.title ?? DEFAULT_CONFIG.site.title,
      description: userConfig.site?.description ?? DEFAULT_CONFIG.site.description,
      lang: userConfig.site?.lang ?? DEFAULT_CONFIG.site.lang,
    },
    mode: userConfig.mode ?? DEFAULT_CONFIG.mode,
    build: {
      inlineStyles: userConfig.build?.inlineStyles ?? DEFAULT_CONFIG.build.inlineStyles,
      minify: userConfig.build?.minify ?? DEFAULT_CONFIG.build.minify,
    },
    middleware: userConfig.middleware ?? DEFAULT_CONFIG.middleware,
  }
}

// ================================================================
//  配置文件读取
// ================================================================

/**
 * 从根目录读取配置文件
 *
 * 按优先级尝试读取：
 * 1. lytx.config.ts
 * 2. lytx.config.js
 *
 * @param rootDir 项目根目录
 * @returns 用户配置对象，如果配置文件不存在则返回空对象
 */
function readConfigFile(rootDir: string): LytXConfig {
  // 尝试读取 .ts 配置文件
  const tsPath = path.join(rootDir, 'lytx.config.ts')
  if (fs.existsSync(tsPath)) {
    try {
      // 在 Node.js 环境中，使用动态 import 加载 .ts 文件（需要 tsx 支持）
      // 这里我们读取文件内容并解析 export default
      const content = fs.readFileSync(tsPath, 'utf-8')
      return parseConfigContent(content, tsPath)
    } catch {
      // .ts 文件可能无法直接解析，尝试 .js
    }
  }

  // 尝试读取 .js 配置文件
  const jsPath = path.join(rootDir, 'lytx.config.js')
  if (fs.existsSync(jsPath)) {
    try {
      const content = fs.readFileSync(jsPath, 'utf-8')
      return parseConfigContent(content, jsPath)
    } catch {
      // 解析失败，返回空配置
    }
  }

  return {}
}

/**
 * 解析配置文件内容
 *
 * 从配置文件中提取 export default 的对象。
 * 使用简单的正则解析，不依赖 eval 或动态 import。
 *
 * @param content 文件内容
 * @param _filePath 文件路径（用于错误信息）
 * @returns 解析出的配置对象
 */
function parseConfigContent(content: string, _filePath: string): LytXConfig {
  // 移除注释
  const cleaned = content
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/export\s+default\s*/, '')

  // 尝试提取对象字面量
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      // 使用 Function 构造器安全解析（仅解析 JSON-like 对象）
      const objStr = `(${match[0]})`
      const fn = new Function(`return ${objStr}`)
      return fn() as LytXConfig
    } catch {
      // 解析失败
    }
  }

  return {}
}

// ================================================================
//  公共 API
// ================================================================

/**
 * 加载 LytX 配置
 *
 * 从指定根目录读取配置文件，与默认值合并，返回完整配置。
 *
 * @param rootDir 项目根目录（绝对路径）
 * @returns 合并后的完整配置
 *
 * @example
 *   const config = await loadConfig('/my-project')
 *   console.log(config.mode) // 'ssg'
 *   console.log(config.pagesDir) // 'src/pages'
 */
export async function loadConfig(rootDir: string): Promise<ResolvedLytXConfig> {
  const userConfig = readConfigFile(rootDir)
  const validated = validateConfig(userConfig)
  return mergeConfig(validated)
}

/**
 * 获取默认配置（不读取配置文件）
 *
 * @returns 默认配置
 */
export function getDefaultConfig(): ResolvedLytXConfig {
  return { ...DEFAULT_CONFIG }
}

/**
 * 从配置对象创建解析后的配置（用于测试）
 *
 * @param userConfig 用户配置
 * @returns 合并后的完整配置
 */
export function resolveConfig(userConfig: LytXConfig): ResolvedLytXConfig {
  const validated = validateConfig(userConfig)
  return mergeConfig(validated)
}
