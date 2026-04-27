/**
 * Lyt.js Core Shared - Path Utilities
 *
 * 路径处理工具函数
 * 纯原生零依赖实现
 */

/**
 * 标准化路径拼接
 * 处理父路径和子路径的拼接，确保没有重复的 /
 */
export function normalizePath(parent: string, child: string): string {
  const p = parent.replace(/\/+$/, '');
  const c = child.replace(/^\/+/, '');

  if (!c) return p || '/';

  return p + '/' + c;
}

/**
 * 拼接路径片段
 */
export function joinPath(...paths: string[]): string {
  return paths.reduce((acc, path) => normalizePath(acc, path), '');
}

/**
 * 获取路径的目录部分
 */
export function dirname(path: string): string {
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 1) return path.startsWith('/') ? '/' : '';
  const dir = parts.slice(0, -1).join('/');
  return path.startsWith('/') ? '/' + dir : dir;
}

/**
 * 获取路径的文件名部分
 */
export function basename(path: string, ext?: string): string {
  const parts = path.split('/');
  let name = parts[parts.length - 1] || '';
  if (ext && name.endsWith(ext)) {
    name = name.slice(0, -ext.length);
  }
  return name;
}

/**
 * 获取路径的扩展名
 */
export function extname(path: string): string {
  const name = basename(path);
  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.slice(dotIndex) : '';
}

/**
 * 将路径模式转换为正则表达式
 * 支持 :param 动态参数和 * 通配符
 */
export function pathToRegex(pattern: string): {
  regex: RegExp;
  paramKeys: string[];
  isWildcard: boolean;
} {
  const paramKeys: string[] = [];
  let isWildcard = false;

  const segments = pattern.split('/');
  const regexParts: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (segment === '') {
      continue;
    }

    if (segment === '*') {
      regexParts.push('(.+)');
      paramKeys.push('*');
      isWildcard = true;
    } else if (segment.startsWith(':')) {
      const paramName = segment.slice(1);
      regexParts.push('([^/]+)');
      paramKeys.push(paramName);
    } else {
      regexParts.push(escapeRegExp(segment));
    }
  }

  const regexStr = '^/' + regexParts.join('/') + '$';

  return {
    regex: new RegExp(regexStr),
    paramKeys,
    isWildcard,
  };
}

/**
 * 判断路径是否匹配指定模式
 */
export function matchPath(pattern: string, path: string): {
  matched: boolean;
  params?: Record<string, string>;
} {
  const { regex, paramKeys } = pathToRegex(pattern);
  const normalizedPath = path.replace(/\/+$/, '') || '/';
  const match = normalizedPath.match(regex);

  if (match) {
    const params: Record<string, string> = {};
    for (let i = 0; i < paramKeys.length; i++) {
      params[paramKeys[i]] = match[i + 1] || '';
    }
    return { matched: true, params };
  }

  return { matched: false };
}

/**
 * 转义正则特殊字符
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 判断路径是否为绝对路径
 */
export function isAbsolute(path: string): boolean {
  return path.startsWith('/');
}

/**
 * 判断路径是否为相对路径
 */
export function isRelative(path: string): boolean {
  return !isAbsolute(path);
}

/**
 * 解析路径
 */
export function parsePath(path: string): {
  dir: string;
  base: string;
  name: string;
  ext: string;
} {
  const ext = extname(path);
  const name = basename(path, ext);
  const dir = dirname(path);
  const base = basename(path);

  return { dir, base, name, ext };
}

/**
 * 规范化路径（解析 . 和 ..）
 */
export function resolvePath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const resolved: string[] = [];

  for (const segment of segments) {
    if (segment === '.') {
      continue;
    } else if (segment === '..') {
      if (resolved.length > 0) {
        resolved.pop();
      }
    } else {
      resolved.push(segment);
    }
  }

  const result = '/' + resolved.join('/');
  return path.startsWith('/') ? result : result.slice(1) || '.';
}
