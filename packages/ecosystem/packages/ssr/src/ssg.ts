/**
 * @lytjs/ssr - 静态站点生成（SSG）
 *
 * 预渲染页面配置为静态 HTML 文件
 */

import type { VNode } from '@lytjs/vdom';
import { isString } from '@lytjs/common-is';
import { renderToHtml } from './render';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';

/** SSG 页面配置 */
export interface SSGPage {
  /** 页面路径，如 '/' 或 '/about' */
  path: string;
  /** 页面组件 VNode */
  component: VNode;
  /** 可选布局组件 */
  layout?: VNode;
  /** 页面头部信息 */
  head?: {
    /** 页面标题 */
    title?: string;
    /** 元信息键值对 */
    meta?: Record<string, string>;
  };
  /** 额外的脚本标签 */
  scripts?: string[];
  /** 额外的样式标签 */
  styles?: string[];
}

/** SSG 生成选项 */
export interface SSGOptions {
  /** 站点基础 URL，默认 '/' */
  baseUrl?: string;
  /** 输出目录，默认 'dist' */
  outDir?: string;
  /** 默认页面标题 */
  defaultTitle?: string;
  /** 默认语言 */
  lang?: string;
  /** 是否生成 sitemap */
  generateSitemap?: boolean;
  /** 站点名称（用于 sitemap） */
  siteName?: string;
  /** 是否使用哈希路由 */
  hashMode?: boolean;
  /** 全局额外脚本 */
  globalScripts?: string[];
  /** 全局额外样式 */
  globalStyles?: string[];
  /** ISR 配置（增量静态再生成） */
  isr?: {
    /** 重新验证间隔（秒），0 表示按需重新验证 */
    revalidate?: number;
    /** 是否启用增量静态再生成 */
    enabled?: boolean;
    /** 预渲染 fallback 页面 */
    fallback?: 'blocking' | boolean;
  };
}

/** 默认 SSG 选项 */
const DEFAULT_SSG_OPTIONS: Required<SSGOptions> & {
  isr: Required<NonNullable<SSGOptions['isr']>>;
} = {
  baseUrl: '/',
  outDir: 'dist',
  defaultTitle: 'LytJS App',
  lang: 'zh-CN',
  generateSitemap: false,
  siteName: 'LytJS Site',
  hashMode: false,
  globalScripts: [],
  globalStyles: [],
  isr: {
    revalidate: 60,
    enabled: false,
    fallback: false,
  },
};

/**
 * 规范化页面路径
 *
 * @description
 * 确保路径以 / 开头，去除末尾的 /
 *
 * @param path - 原始路径
 * @returns 规范化后的路径
 */
function normalizePath(path: string): string {
  // 确保路径以 / 开头
  let normalized = path.startsWith('/') ? path : `/${path}`;
  // 去除末尾的 /（根路径除外）
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

/**
 * 将路径转换为文件路径
 *
 * @description
 * 将 URL 路径转换为文件系统路径，
 * 例如 '/about' -> '/about/index.html'，'/' -> '/index.html'
 *
 * @param path - 规范化后的路径
 * @returns 文件路径
 */
function pathToFilePath(path: string): string {
  if (path === '/') {
    return '/index.html';
  }
  return `${path}/index.html`;
}

/**
 * 生成 meta 标签 HTML 字符串
 *
 * @param meta - 元信息键值对
 * @returns meta 标签 HTML 字符串
 */
function renderMetaTags(meta: Record<string, string>): string {
  return Object.entries(meta)
    .map(([name, content]) => `<meta name="${name}" content="${content}">`)
    .join('\n  ');
}

/**
 * 渲染单个页面为完整 HTML
 *
 * @description
 * 将页面组件和可选布局组合渲染为完整的 HTML 文档字符串。
 * 如果提供了布局，组件内容会被包裹在布局中。
 *
 * @param page - 页面配置
 * @param options - SSG 选项
 * @returns 完整的 HTML 字符串
 */
function renderPage(page: SSGPage, options: Required<SSGOptions>): string {
  const { component, layout, head, scripts, styles } = page;
  const title = head?.title || options.defaultTitle;

  // 构建 head 中的额外内容
  let extraHead = '';
  if (head?.meta) {
    extraHead = renderMetaTags(head.meta);
  }

  // 合并全局和页面的样式
  const allStyles = [...(options.globalStyles || []), ...(styles || [])];
  const allScripts = [...(options.globalScripts || []), ...(scripts || [])];

  // 添加样式标签
  if (allStyles.length > 0) {
    extraHead += '\n  ' + allStyles.join('\n  ');
  }

  // 添加脚本标签到 head 结束之前
  if (allScripts.length > 0) {
    extraHead += '\n  ' + allScripts.join('\n  ');
  }

  // 如果有布局，将组件包裹在布局中
  const content = layout
    ? renderToHtml(component, { title, lang: options.lang, head: extraHead })
    : renderToHtml(component, { title, lang: options.lang, head: extraHead });

  return content;
}

/**
 * 生成 sitemap.xml
 *
 * @param pages - 页面配置数组
 * @param options - SSG 选项
 * @returns sitemap XML 字符串
 */
function generateSitemapXml(pages: SSGPage[], options: Required<SSGOptions>): string {
  const baseUrl = options.baseUrl.endsWith('/') ? options.baseUrl.slice(0, -1) : options.baseUrl;

  const urls = pages
    .map((page) => {
      const path = normalizePath(page.path);
      const fullUrl = options.hashMode ? `${baseUrl}/#${path}` : `${baseUrl}${path}`;
      const lastmod = new Date().toISOString().split('T')[0];

      return `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/**
 * 将生成的 HTML 写入文件系统
 *
 * @description
 * 将 generateStaticPages 生成的结果写入到指定的输出目录。
 * 会自动创建所需的目录结构。
 *
 * @param pages - 页面配置数组
 * @param options - SSG 选项
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await writeStaticFiles(pages, { outDir: 'build' });
 * ```
 */
export async function writeStaticFiles(pages: SSGPage[], options?: SSGOptions): Promise<void> {
  const resolvedOptions = { ...DEFAULT_SSG_OPTIONS, ...options };
  const { outDir, generateSitemap } = resolvedOptions;

  // 验证页面配置
  const errors = validatePages(pages);
  if (errors.length > 0) {
    throw new Error(`页面配置验证失败:\n${errors.join('\n')}`);
  }

  // 生成静态页面
  const staticPages = generateStaticPages(pages, resolvedOptions);

  // 写入每个页面
  for (const [filePath, html] of staticPages) {
    const fullPath = join(outDir, filePath);
    const dir = dirname(fullPath);

    // 创建目录（如果不存在）
    await fs.mkdir(dir, { recursive: true });

    // 写入文件
    await fs.writeFile(fullPath, html, 'utf-8');
  }

  // 如果需要，生成 sitemap
  if (generateSitemap) {
    const sitemapContent = generateSitemapXml(pages, resolvedOptions);
    const sitemapPath = join(outDir, 'sitemap.xml');
    await fs.writeFile(sitemapPath, sitemapContent, 'utf-8');
  }
}

/**
 * 预渲染页面配置数组为静态 HTML
 *
 * @description
 * 接受页面配置数组，为每个页面生成完整的 HTML 内容。
 * 返回一个 Map，键为文件路径，值为 HTML 内容。
 *
 * @param pages - 页面配置数组
 * @param options - SSG 生成选项
 * @returns Map<string, string> 文件路径 -> HTML 内容
 *
 * @example
 * ```typescript
 * const pages: SSGPage[] = [
 *   {
 *     path: '/',
 *     component: h('div', {}, 'Home'),
 *     head: { title: '首页', meta: { description: '欢迎' } },
 *   },
 *   {
 *     path: '/about',
 *     component: h('div', {}, 'About'),
 *   },
 * ];
 *
 * const results = generateStaticPages(pages, {
 *   baseUrl: 'https://example.com',
 *   defaultTitle: 'My Site',
 * });
 *
 * for (const [filePath, html] of results) {
 *   console.log(filePath, html);
 * }
 * ```
 */
export function generateStaticPages(pages: SSGPage[], options?: SSGOptions): Map<string, string> {
  const resolvedOptions = { ...DEFAULT_SSG_OPTIONS, ...options };
  const results = new Map<string, string>();

  for (const page of pages) {
    const normalizedPath = normalizePath(page.path);
    const filePath = pathToFilePath(normalizedPath);
    const html = renderPage(page, resolvedOptions);
    results.set(filePath, html);
  }

  return results;
}

/**
 * 生成页面路由清单
 *
 * @description
 * 根据页面配置生成一个 JSON 格式的路由清单，
 * 可用于客户端路由注册或构建分析。
 *
 * @param pages - 页面配置数组
 * @param baseUrl - 站点基础 URL
 * @returns 路由信息数组
 */
export function generateRouteManifest(
  pages: SSGPage[],
  baseUrl: string = '/',
): Array<{ path: string; filePath: string; title?: string }> {
  return pages.map((page) => {
    const normalizedPath = normalizePath(page.path);
    const filePath = pathToFilePath(normalizedPath);
    return {
      path: `${baseUrl}${normalizedPath}`,
      filePath,
      title: page.head?.title,
    };
  });
}

/**
 * 验证页面配置数组的合法性
 *
 * @description
 * 检查每个页面配置是否包含必要的字段（path 和 component），
 * 以及路径是否合法。返回错误信息数组。
 *
 * @param pages - 页面配置数组
 * @returns 错误信息数组，空数组表示全部合法
 */
export function validatePages(pages: SSGPage[]): string[] {
  const errors: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (!page) {
      errors.push(`页面 ${i}: 无效的页面配置`);
      continue;
    }

    const pagePath = page.path;

    // 检查 path
    if (!pagePath || !isString(pagePath)) {
      errors.push(`页面 ${i}: path 必须是非空字符串`);
      continue;
    }

    // 检查 component
    if (!page.component) {
      errors.push(`页面 "${pagePath}": component 不能为空`);
    }

    // 检查路径合法性
    if (isString(pagePath) && !pagePath.startsWith('/')) {
      errors.push(`页面 "${pagePath}": path 必须以 / 开头`);
    }
  }

  return errors;
}

// ============================================================
// ISR (Incremental Static Regeneration) 功能
// ============================================================

/** ISR 缓存条目 */
interface ISRCacheEntry {
  /** HTML 内容 */
  html: string;
  /** 生成时间戳 */
  timestamp: number;
  /** 是否正在重新生成 */
  isRevalidating: boolean;
}

/** ISR 缓存管理器 */
class ISRCacheManager {
  private cache: Map<string, ISRCacheEntry> = new Map();
  private revalidateTasks: Map<string, Promise<string>> = new Map();

  /**
   * 获取缓存的页面
   */
  get(path: string): ISRCacheEntry | undefined {
    return this.cache.get(path);
  }

  /**
   * 设置缓存
   */
  set(path: string, html: string): void {
    this.cache.set(path, {
      html,
      timestamp: Date.now(),
      isRevalidating: false,
    });
  }

  /**
   * 检查是否需要重新验证
   */
  needsRevalidation(path: string, revalidateSeconds: number): boolean {
    const entry = this.cache.get(path);
    if (!entry) return true;

    const age = (Date.now() - entry.timestamp) / 1000;
    return age > revalidateSeconds && !entry.isRevalidating;
  }

  /**
   * 标记为正在重新生成
   */
  markRevalidating(path: string): void {
    const entry = this.cache.get(path);
    if (entry) {
      entry.isRevalidating = true;
    }
  }

  /**
   * 完成重新生成
   */
  finishRevalidation(path: string, html: string): void {
    this.set(path, html);
    this.revalidateTasks.delete(path);
  }

  /**
   * 获取正在进行的重新生成任务
   */
  getRevalidateTask(path: string): Promise<string> | undefined {
    return this.revalidateTasks.get(path);
  }

  /**
   * 设置重新生成任务
   */
  setRevalidateTask(path: string, task: Promise<string>): void {
    this.revalidateTasks.set(path, task);
  }

  /**
   * 清除过期的缓存
   */
  clearExpired(maxAgeSeconds: number): number {
    const now = Date.now();
    let cleared = 0;

    for (const [path, entry] of this.cache) {
      const age = (now - entry.timestamp) / 1000;
      if (age > maxAgeSeconds) {
        this.cache.delete(path);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    total: number;
    paths: string[];
  } {
    return {
      total: this.cache.size,
      paths: Array.from(this.cache.keys()),
    };
  }
}

// 全局 ISR 缓存实例
const isrCache = new ISRCacheManager();

/**
 * 创建 ISR 中间件
 *
 * @description
 * 创建用于 Express/Fastify 等框架的 ISR 中间件，
 * 支持增量静态再生成和背景重新验证。
 *
 * @param options - ISR 选项
 * @returns 中间件函数
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createISRMiddleware, generateStaticPages } from '@lytjs/ssr';
 *
 * const app = express();
 *
 * // 预生成的页面
 * const pages = [
 *   { path: '/', component: homeComponent },
 * ];
 *
 * const staticPages = generateStaticPages(pages);
 *
 * app.use(createISRMiddleware({
 *   staticPages,
 *   revalidate: 60, // 60秒后重新验证
 *   async regenerate(path) {
 *     const page = pages.find(p => p.path === path);
 *     if (page) {
 *       return generateStaticPages([page]).get('/index.html')!;
 *     }
 *     throw new Error('Page not found');
 *   }
 * }));
 * ```
 */
export function createISRMiddleware(options: {
  /** 预生成的静态页面 */
  staticPages: Map<string, string>;
  /** 重新验证间隔（秒） */
  revalidate?: number;
  /** 是否启用 ISR */
  enabled?: boolean;
  /** 重新生成页面的函数 */
  regenerate?: (path: string) => Promise<string>;
}) {
  const { staticPages, revalidate = 60, enabled = true, regenerate } = options;

  // 初始化缓存
  for (const [path, html] of staticPages) {
    isrCache.set(path, html);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: any, res: any, next: any) => {
    if (!enabled) {
      return next();
    }

    // 获取请求路径
    let path = req.path;
    if (path.endsWith('/')) {
      path = path + 'index.html';
    } else if (!path.endsWith('.html')) {
      path = path + '/index.html';
    }

    // 检查缓存
    const cached = isrCache.get(path);

    if (cached) {
      // 返回缓存内容
      res.setHeader('Cache-Control', `s-maxage=${revalidate}, stale-while-revalidate`);
      res.setHeader('X-ISR-Cache', 'HIT');
      res.setHeader('X-ISR-Timestamp', cached.timestamp.toString());
      res.send(cached.html);

      // 后台重新验证
      if (isrCache.needsRevalidation(path, revalidate) && regenerate) {
        isrCache.markRevalidating(path);

        try {
          const newHtml = await regenerate(path);
          isrCache.finishRevalidation(path, newHtml);
        } catch (error) {
          console.error('[ISR] Revalidation failed for', path, error);
          // 重新验证失败，保持旧缓存
          const entry = isrCache.get(path);
          if (entry) {
            entry.isRevalidating = false;
          }
        }
      }
    } else {
      // 缓存未命中
      if (regenerate) {
        // 动态生成
        try {
          const html = await regenerate(path);
          isrCache.set(path, html);
          res.setHeader('X-ISR-Cache', 'MISS');
          res.send(html);
        } catch (error) {
          next(error);
        }
      } else {
        // 没有重新生成函数，继续
        next();
      }
    }
  };
}

/**
 * 触发按需重新验证
 *
 * @description
 * 手动触发特定路径的重新验证，适合于内容更新后调用。
 *
 * @param path - 要重新验证的路径
 * @param regenerate - 重新生成页面的函数
 * @returns Promise<string> 新生成的 HTML
 *
 * @example
 * ```typescript
 * // 当博客文章更新时
 * await revalidateOnDemand(
 *   '/blog/my-post',
 *   async () => generatePostHTML('my-post')
 * );
 * ```
 */
export async function revalidateOnDemand(
  path: string,
  regenerate: () => Promise<string>,
): Promise<string> {
  // 检查是否已经在重新生成
  const existingTask = isrCache.getRevalidateTask(path);
  if (existingTask) {
    return existingTask;
  }

  // 创建新的重新生成任务
  const task = (async () => {
    isrCache.markRevalidating(path);
    try {
      const html = await regenerate();
      isrCache.finishRevalidation(path, html);
      return html;
    } catch (error) {
      const entry = isrCache.get(path);
      if (entry) {
        entry.isRevalidating = false;
      }
      throw error;
    }
  })();

  isrCache.setRevalidateTask(path, task);
  return task;
}

/**
 * 获取 ISR 缓存统计信息
 *
 * @description
 * 获取当前 ISR 缓存的统计信息，用于监控和调试。
 *
 * @returns 缓存统计信息
 */
export function getISRCacheStats() {
  return isrCache.getStats();
}

/**
 * 清除 ISR 缓存
 *
 * @description
 * 清除指定路径或所有过期的缓存。
 *
 * @param path - 可选，要清除的特定路径
 * @param maxAge - 可选，清除超过指定秒数的缓存
 */
export function clearISRCache(path?: string, maxAge?: number): void {
  if (path) {
    // 清除特定路径
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cache = (isrCache as any).cache;
    cache.delete(path);
  } else if (maxAge) {
    // 清除过期缓存
    isrCache.clearExpired(maxAge);
  }
}
