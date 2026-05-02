/**
 * @lytjs/common-query
 * URL 查询字符串解析与构建工具
 */

/**
 * 解析后的 URL 结构
 */
export interface ParsedURL {
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  searchParams: Record<string, string>;
  origin: string;
  href: string;
}

/**
 * 解析 URL 查询字符串为对象
 *
 * @param search - 查询字符串，支持 `?key=value` 和 `key=value` 格式
 * @returns 解析后的键值对对象
 */
export function parseQueryString(search: string): Record<string, string> {
  if (!search) return {};

  const str = search.startsWith('?') ? search.slice(1) : search;
  if (!str) return {};

  const result: Record<string, string> = {};

  const pairs = str.split('&');
  for (const pair of pairs) {
    if (!pair) continue;
    const eqIndex = pair.indexOf('=');
    let key: string;
    let value: string;
    if (eqIndex === -1) {
      key = pair;
      value = '';
    } else {
      key = pair.slice(0, eqIndex);
      value = pair.slice(eqIndex + 1);
    }
    try {
      key = decodeURIComponent(key);
    } catch {
      // keep key as-is if decode fails
    }
    try {
      value = decodeURIComponent(value);
    } catch {
      // keep value as-is if decode fails
    }
    result[key] = value;
  }

  return result;
}

/**
 * 将对象序列化为查询字符串
 *
 * @param params - 键值对对象
 * @returns 序列化后的查询字符串（不含前导 ?）
 */
export function stringifyQueryString(
  params: Record<string, string | number | boolean>,
): string {
  const keys = Object.keys(params);
  if (keys.length === 0) return '';

  const parts: string[] = [];
  for (const key of keys) {
    const value = params[key];
    parts.push(
      encodeURIComponent(key) + '=' + encodeURIComponent(String(value)),
    );
  }

  return parts.join('&');
}

/**
 * 解析完整 URL
 *
 * @param url - URL 字符串，支持绝对 URL 和相对 URL
 * @returns 解析后的 ParsedURL 对象
 */
export function parseURL(url: string): ParsedURL {
  let rest = url;

  // Extract hash
  let hash = '';
  const hashIndex = rest.indexOf('#');
  if (hashIndex !== -1) {
    hash = rest.slice(hashIndex);
    rest = rest.slice(0, hashIndex);
  }

  // Extract search
  let search = '';
  const searchIndex = rest.indexOf('?');
  if (searchIndex !== -1) {
    search = rest.slice(searchIndex);
    rest = rest.slice(0, searchIndex);
  }

  // Extract protocol
  let protocol = '';
  const protocolIndex = rest.indexOf('://');
  if (protocolIndex !== -1) {
    protocol = rest.slice(0, protocolIndex + 3);
    rest = rest.slice(protocolIndex + 3);
  }

  // Extract pathname (everything after host)
  let pathname = '';
  let host = '';
  let hostname = '';
  let port = '';

  if (protocol) {
    // Absolute URL: extract host and pathname
    const slashIndex = rest.indexOf('/');
    if (slashIndex !== -1) {
      host = rest.slice(0, slashIndex);
      pathname = rest.slice(slashIndex);
    } else {
      host = rest;
      pathname = '';
    }

    // Parse host into hostname and port
    const colonIndex = host.lastIndexOf(':');
    if (colonIndex !== -1) {
      hostname = host.slice(0, colonIndex);
      port = host.slice(colonIndex + 1);
    } else {
      hostname = host;
      port = '';
    }
  } else {
    // Relative URL
    pathname = rest;
  }

  const searchParams = parseQueryString(search);
  const origin = protocol ? protocol + host : '';

  return {
    protocol,
    host,
    hostname,
    port,
    pathname,
    search,
    hash,
    searchParams,
    origin,
    href: url,
  };
}

/**
 * 构建完整 URL
 *
 * @param base - 基础 URL
 * @param params - 查询参数（可选）
 * @param hash - hash 片段（可选，不含 #）
 * @returns 构建后的完整 URL
 */
export function buildURL(
  base: string,
  params?: Record<string, string | number | boolean>,
  hash?: string,
): string {
  if (!params && !hash) return base;

  // Extract and remove existing hash from base
  let baseWithoutHash = base;
  let existingHash = '';
  const hashIdx = base.indexOf('#');
  if (hashIdx !== -1) {
    existingHash = base.slice(hashIdx);
    baseWithoutHash = base.slice(0, hashIdx);
  }

  // Parse existing query params from base (without hash)
  let existingSearch = '';
  let baseWithoutSearch = baseWithoutHash;
  const searchIdx = baseWithoutHash.indexOf('?');
  if (searchIdx !== -1) {
    existingSearch = baseWithoutHash.slice(searchIdx + 1);
    baseWithoutSearch = baseWithoutHash.slice(0, searchIdx);
  }

  // Merge existing and new params
  const mergedParams = parseQueryString(existingSearch);
  if (params) {
    for (const key of Object.keys(params)) {
      mergedParams[key] = String(params[key]);
    }
  }

  const queryString = stringifyQueryString(mergedParams);
  let result = baseWithoutSearch;
  if (queryString) {
    result += '?' + queryString;
  }
  // Use provided hash, or keep existing hash if no new hash is given
  const finalHash = hash !== undefined ? '#' + hash : existingHash;
  if (finalHash) {
    result += finalHash;
  }

  return result;
}
