/**
 * @lytjs/router-fs - 工具函数
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join, normalize, relative } from 'path';
import type { RouteConfig } from './types';

/** 检查是否为目录 */
export function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

/** 检查是否为文件 */
export function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

/** 转换文件路径到路由路径 */
export function filePathToRoutePath(
  filePath: string,
  baseDir: string,
  extensions: string[],
): string {
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
export function extractDynamicParams(routePath: string): string[] {
  const matches = routePath.match(/:(\w+)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}

/** 递归扫描目录收集路由文件 */
export function scanDirectory(
  dir: string,
  baseDir: string,
  extensions: string[],
  ignorePatterns: string[],
): RouteConfig[] {
  const routes: RouteConfig[] = [];
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
      routes.push(...scanDirectory(fullPath, baseDir, extensions, ignorePatterns));
    } else if (isFile(fullPath)) {
      const ext = extensions.find((e) => file.endsWith(e));
      if (ext) {
        const routePath = filePathToRoutePath(fullPath, baseDir, extensions);
        const params = extractDynamicParams(routePath);
        routes.push({
          path: routePath,
          componentPath: fullPath,
          isDynamic: params.length > 0,
          params,
          isNested: routePath.split('/').length > 2,
        });
      }
    }
  }
  return routes;
}
