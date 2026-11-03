/**
 * @lytjs/api - 工具函数
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join, normalize, relative } from 'path';
import type { ApiRouteConfig } from './types';
import type { HttpMethod } from '@lytjs/shared-types';

/** 检查是否为目录 */
export function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

/** 检查是否为文件 */
export function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

/** HTTP 请求方法列表 */
const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

/** 词边界字符：方法名必须被这些字符（或首尾）夹住 */
const METHOD_BOUNDARIES = '.-_/[]';

/**
 * 文件名里是否把 `method` 当作**独立的词**出现。
 *
 * ★ 2026-10-25 修复：`extractHttpMethods` 原先用 `filename.includes(method)` ——
 *   **裸子串**匹配，于是普通单词里的片段被当成 HTTP 方法：
 *   `postal.ts` ⇒ POST、`dispatch.ts` ⇒ PATCH（`dispatch` 里含 `patch`）、
 *   `budget.ts` ⇒ GET（凑巧与默认值相同，把问题掩盖了）。
 *   表现是**接口静默 404**（方法对不上路由表），不是报错。
 *   现在要求方法名两侧是 `.` `-` `_` `/` `[` `]` 或字符串首尾：
 *   `users.get.ts` / `get-users.ts` / `users_post.ts` / `[id].put.ts` 都能识别，
 *   而 `postal` / `dispatch` / `budget` 不会。
 */
function hasMethodToken(filename: string, method: string): boolean {
  const haystack = filename.toLowerCase();
  const needle = method.toLowerCase();

  let index = haystack.indexOf(needle);
  while (index !== -1) {
    const before = index === 0 ? '' : haystack[index - 1];
    const after = haystack[index + needle.length] ?? '';
    const leftOk = index === 0 || METHOD_BOUNDARIES.includes(before!);
    const rightOk = after === '' || METHOD_BOUNDARIES.includes(after);

    if (leftOk && rightOk) return true;
    index = haystack.indexOf(needle, index + 1);
  }

  return false;
}

/**
 * 文件名里是否**显式**写了方法（`users.get.ts` / `[id].put.ts`）。
 *
 * ⚠️ 2026-11-03 新增。此前「没有方法词 ⇒ 默认 GET」被当成事实，于是
 *   `posts.ts` 里写 `export const POST = ...` 时：路由表只登记了 GET，
 *   POST 请求直接 404，GET 请求又「找不到 handler」→ 500。
 *   现在把「方法来自文件名」和「方法由模块导出决定」区分开：
 *   前者以文件名为准，后者在加载模块后再判定（见 `dynamicMethods`）。
 */
export function hasExplicitMethod(filename: string): boolean {
  return HTTP_METHODS.some((method) => hasMethodToken(filename, method));
}

/** 从文件名中提取 HTTP 方法 */
export function extractHttpMethods(filename: string): HttpMethod[] {
  const methods: HttpMethod[] = [];

  for (const method of HTTP_METHODS) {
    if (hasMethodToken(filename, method)) {
      methods.push(method);
    }
  }

  // 如果没有找到方法，默认支持 GET
  return methods.length > 0 ? methods : ['GET'];
}

/** 转换文件路径到 API 路径 */
export function filePathToApiPath(filePath: string, baseDir: string, extensions: string[]): string {
  let normalized = normalize(relative(baseDir, filePath));
  // 移除扩展名
  for (const ext of extensions) {
    if (normalized.endsWith(ext)) {
      normalized = normalized.slice(0, -ext.length);
      break;
    }
  }
  // 处理 Windows 路径分隔符
  normalized = normalized.replace(/\\/g, '/');
  // 移除文件名中的方法名
  for (const method of HTTP_METHODS) {
    if (normalized.toLowerCase().endsWith('.' + method.toLowerCase())) {
      normalized = normalized.slice(0, -(method.length + 1));
    }
  }
  // 移除 index 后缀
  if (normalized.endsWith('/index')) {
    normalized = normalized.slice(0, -6);
  } else if (normalized === 'index') {
    normalized = '';
  }
  // 处理动态路由 [] 标记
  normalized = normalized.replace(/\[(\w+)\]/g, ':$1');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

/** 提取动态路由参数名 */
export function extractDynamicParams(apiPath: string): string[] {
  const matches = apiPath.match(/:(\w+)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}

/**
 * 是否命中忽略规则。
 *
 * ⚠️ 2026-11-03 修（P1）：此前是 `relativePath.includes(pattern) || file.includes(pattern)` ——
 *   **子串**匹配，于是默认忽略项 `dist` 会把 `distribution.ts` / `disk-status.ts`
 *   这类合法路由一并跳过（接口静默 404，且没有任何提示）。
 *   现在按**路径段**精确比较：只有整段等于 `dist` / `node_modules` / `.git` 才算忽略。
 */
export function isIgnoredPath(relativePath: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  const segments = relativePath.split(/[\\/]/).filter(Boolean);
  const fileName = segments[segments.length - 1] ?? '';
  // 去掉扩展名后再比一次：`['_middleware']` 应该能忽略 `_middleware.ts`
  // （但仍不会让 `dist` 命中 `distribution.ts`）
  const stem = fileName.replace(/\.[^.]+$/, '');
  return patterns.some((pattern) => segments.includes(pattern) || stem === pattern);
}

/** 递归扫描目录收集 API 路由文件 */
export function scanApiDirectory(
  dir: string,
  baseDir: string,
  extensions: string[],
  ignorePatterns: string[],
): ApiRouteConfig[] {
  const routes: ApiRouteConfig[] = [];
  if (!isDirectory(dir)) return routes;

  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    const relativePath = relative(baseDir, fullPath);

    // 检查是否应该忽略（按路径段，见 isIgnoredPath 的说明）
    if (isIgnoredPath(relativePath, ignorePatterns)) {
      continue;
    }

    if (isDirectory(fullPath)) {
      routes.push(...scanApiDirectory(fullPath, baseDir, extensions, ignorePatterns));
    } else if (isFile(fullPath)) {
      const ext = extensions.find((e) => file.endsWith(e));
      if (ext) {
        const apiPath = filePathToApiPath(fullPath, baseDir, extensions);
        const params = extractDynamicParams(apiPath);
        const methods = extractHttpMethods(file);
        routes.push({
          path: apiPath,
          methods,
          handlerPath: fullPath,
          isDynamic: params.length > 0,
          params,
        });
      }
    }
  }
  return routes;
}

/**
 * 扫描结果：路由 + 每个目录的中间件链（root → leaf）。
 *
 * ⚠️ 2026-11-03 新增。`middlewarePattern` 与 `ApiRouteConfig.middlewarePaths` 早就
 *   在类型里声明了，但**实现里一次都没用过** —— 用户放一个 `_middleware.ts` 期望做鉴权，
 *   实际它被当成普通路由注册成 `/_middleware`，鉴权从未发生（最坏的一种「看起来安全」）。
 */
export interface ScanTreeResult {
  routes: ApiRouteConfig[];
  /** 被识别为中间件（不是路由）的文件 */
  middlewareFiles: string[];
  /**
   * 根目录的中间件链。
   *
   * 根中间件作用于**所有**请求（包括没有命中任何路由的 404）——
   * 鉴权 / CORS / 限流这类逻辑不能因为「路径不存在」就被跳过。
   */
  rootMiddleware: string[];
}

/** 文件名（去扩展名）是否就是中间件名 */
function isMiddlewareFile(fileName: string, extensions: string[], pattern: string): boolean {
  const ext = extensions.find((e) => fileName.endsWith(e));
  if (!ext) return false;
  return fileName.slice(0, -ext.length) === pattern;
}

/**
 * 递归扫描，同时把「当前目录及其祖先目录的中间件」串成链挂到路由上。
 *
 * 语义与 Next.js 的 `_middleware` 一致：**目录内的中间件作用于该目录及其子目录**，
 * 执行顺序从根到叶。
 */
export function scanApiTree(
  dir: string,
  baseDir: string,
  extensions: string[],
  ignorePatterns: string[],
  middlewarePattern: string = '_middleware',
  inheritedChain: string[] = [],
): ScanTreeResult {
  const routes: ApiRouteConfig[] = [];
  const middlewareFiles: string[] = [];
  if (!isDirectory(dir)) return { routes, middlewareFiles, rootMiddleware: [] };

  const entries = readdirSync(dir, { withFileTypes: true }).filter(
    (entry) => !isIgnoredPath(relative(baseDir, join(dir, entry.name)), ignorePatterns),
  );

  // 先收集本层中间件（顺序：根 → 叶）
  const chain = [...inheritedChain];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (isMiddlewareFile(entry.name, extensions, middlewarePattern)) {
      const full = join(dir, entry.name);
      chain.push(full);
      middlewareFiles.push(full);
    }
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const child = scanApiTree(
        fullPath,
        baseDir,
        extensions,
        ignorePatterns,
        middlewarePattern,
        chain,
      );
      routes.push(...child.routes);
      middlewareFiles.push(...child.middlewareFiles);
      continue;
    }
    if (!entry.isFile()) continue;

    const ext = extensions.find((e) => entry.name.endsWith(e));
    if (!ext) continue;
    if (isMiddlewareFile(entry.name, extensions, middlewarePattern)) continue;

    const apiPath = filePathToApiPath(fullPath, baseDir, extensions);
    const params = extractDynamicParams(apiPath);
    routes.push({
      path: apiPath,
      methods: extractHttpMethods(entry.name),
      handlerPath: fullPath,
      isDynamic: params.length > 0,
      params,
      // 文件名没写方法 ⇒ 方法由模块导出决定（default/handler ⇒ GET；export const POST ⇒ POST）
      ...(hasExplicitMethod(entry.name) ? {} : { dynamicMethods: true }),
      ...(chain.length > 0 ? { middlewarePaths: [...chain] } : {}),
    });
  }

  return {
    routes,
    middlewareFiles,
    // 只有根目录那一层（inheritedChain 为空）才有「全局中间件」
    rootMiddleware: inheritedChain.length === 0 ? [...chain] : [],
  };
}
