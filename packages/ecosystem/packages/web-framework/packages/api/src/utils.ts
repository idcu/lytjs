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

    // 检查是否应该忽略
    if (
      ignorePatterns.some((pattern) => {
        if (relativePath.includes(pattern)) return true;
        return file.includes(pattern);
      })
    ) {
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
