// packages/compiler/src/server-components/index.ts
// Server Components 编译支持
// Phase 1.4: 实现 'use server' 标记与编译

// ============================================================
// 类型定义
// ============================================================

/** Server Component 指令 */
export type ServerDirective = 'use server' | 'use client';

/** Server Component 分析结果 */
export interface ServerComponentAnalysis {
  /** 是否是 Server Component */
  isServerComponent: boolean;
  /** 是否是 Client Component */
  isClientComponent: boolean;
  /** 服务端函数列表 */
  serverFunctions: string[];
  /** 客户端导入列表 */
  clientImports: string[];
  /** 数据获取函数 */
  dataFetchers: string[];
  /** 序列化数据 */
  serializedData: Record<string, unknown>;
}

/** Server Component 编译选项 */
export interface ServerComponentOptions {
  /** 服务端组件输出目录 */
  serverOutputDir?: string;
  /** 客户端组件输出目录 */
  clientOutputDir?: string;
  /** 是否生成客户端桩 */
  generateClientStubs?: boolean;
  /** 服务端函数命名前缀 */
  serverFunctionPrefix?: string;
}

/** Server Component 编译结果 */
export interface ServerComponentResult {
  /** 服务端代码 */
  serverCode: string | null;
  /** 客户端代码 */
  clientCode: string | null;
  /** 类型定义 */
  typeDefinition: string | null;
  /** 分析结果 */
  analysis: ServerComponentAnalysis;
}

// ============================================================
// 指令解析
// ============================================================

/**
 * 检测源码中的 Server Component 指令
 */
export function detectServerDirective(source: string): ServerDirective | null {
  // 匹配 'use server' 或 'use client' 指令
  const useServerMatch = source.match(/^['"]use server['"]/m);
  const useClientMatch = source.match(/^['"]use client['"]/m);

  if (useServerMatch) return 'use server';
  if (useClientMatch) return 'use client';
  return null;
}

/**
 * 分析组件是否为 Server Component
 */
export function analyzeServerComponent(
  source: string,
  _options: ServerComponentOptions = {},
): ServerComponentAnalysis {
  const directive = detectServerDirective(source);
  const isServerComponent = directive === 'use server';
  const isClientComponent = directive === 'use client';

  // 提取服务端函数
  const serverFunctions = extractServerFunctions(source);

  // 提取客户端导入
  const clientImports = extractClientImports(source);

  // 提取数据获取函数
  const dataFetchers = extractDataFetchers(source);

  return {
    isServerComponent,
    isClientComponent,
    serverFunctions,
    clientImports,
    dataFetchers,
    serializedData: {},
  };
}

// ============================================================
// 函数提取
// ============================================================

/**
 * 提取服务端函数名称
 */
function extractServerFunctions(source: string): string[] {
  const functions: string[] = [];

  // 匹配 async function 和 export async function
  const asyncFunctionRegex = /(?:export\s+)?async\s+function\s+(\w+)/g;
  let match;
  while ((match = asyncFunctionRegex.exec(source)) !== null) {
    functions.push(match[1]!);
  }

  // 匹配箭头函数形式的导出
  const arrowFunctionRegex =
    /export\s+(?:async\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>/g;
  while ((match = arrowFunctionRegex.exec(source)) !== null) {
    functions.push(match[1]!);
  }

  return functions;
}

/**
 * 提取客户端导入
 */
function extractClientImports(source: string): string[] {
  const imports: string[] = [];

  // 匹配 import 语句
  const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(source)) !== null) {
    imports.push(match[1]!);
  }

  return imports;
}

/**
 * 提取数据获取函数
 */
function extractDataFetchers(source: string): string[] {
  const fetchers: string[] = [];

  // 匹配以 fetch, load, get 开头的函数
  const fetcherRegex = /(?:export\s+)?(?:async\s+)?function\s+(fetch\w+|load\w+|get\w+)/g;
  let match;
  while ((match = fetcherRegex.exec(source)) !== null) {
    fetchers.push(match[1]!);
  }

  return fetchers;
}

// ============================================================
// 代码生成
// ============================================================

/**
 * 生成服务端组件代码
 */
export function generateServerComponentCode(
  source: string,
  analysis: ServerComponentAnalysis,
  _options: ServerComponentOptions = {},
): string {
  const lines: string[] = [];

  // 添加服务端运行时导入
  lines.push(`import { createServerReference } from '@lytjs/renderer/server';`);
  lines.push('');

  // 保留原始代码（移除 'use server' 指令）
  const cleanedSource = source.replace(/^['"]use server['"]\s*;?\s*\n?/m, '');

  // 为每个服务端函数创建引用
  for (const fn of analysis.serverFunctions) {
    lines.push(`export const ${fn}Reference = createServerReference('${fn}', ${fn});`);
  }

  lines.push('');
  lines.push(cleanedSource);

  return lines.join('\n');
}

/**
 * 生成客户端桩代码
 */
export function generateClientStubCode(
  componentName: string,
  analysis: ServerComponentAnalysis,
  _options: ServerComponentOptions = {},
): string {
  const lines: string[] = [];

  lines.push(`// Client stub for server component: ${componentName}`);
  lines.push(`// This file is auto-generated. Do not edit.`);
  lines.push('');
  lines.push(`import { createServerProxy } from '@lytjs/renderer/client';`);
  lines.push('');

  // 为每个服务端函数生成代理
  for (const fn of analysis.serverFunctions) {
    lines.push(`export const ${fn} = createServerProxy('${componentName}', '${fn}');`);
  }

  lines.push('');

  // 导出数据获取函数的占位符
  for (const fetcher of analysis.dataFetchers) {
    lines.push(`export async function ${fetcher}(...args: unknown[]) {`);
    lines.push(
      `  throw new Error('[LytJS] ${fetcher} is a server-only function and cannot be called on the client.');`,
    );
    lines.push(`}`);
  }

  return lines.join('\n');
}

/**
 * 生成类型定义
 */
export function generateTypeDefinition(
  componentName: string,
  analysis: ServerComponentAnalysis,
): string {
  const lines: string[] = [];

  lines.push(`// Type definitions for server component: ${componentName}`);
  lines.push('');

  // 为服务端函数生成类型
  for (const fn of analysis.serverFunctions) {
    lines.push(`export function ${fn}(...args: unknown[]): Promise<unknown>;`);
  }

  return lines.join('\n');
}

// ============================================================
// 主编译函数
// ============================================================

/**
 * 编译 Server Component
 */
export function compileServerComponent(
  source: string,
  filename: string,
  options: ServerComponentOptions = {},
): ServerComponentResult {
  const analysis = analyzeServerComponent(source, options);

  // 如果不是 Server Component，返回原始代码
  if (!analysis.isServerComponent) {
    return {
      serverCode: null,
      clientCode: source,
      typeDefinition: null,
      analysis,
    };
  }

  const componentName =
    filename
      .replace(/\.[^.]+$/, '')
      .split('/')
      .pop() || 'Component';

  return {
    serverCode: generateServerComponentCode(source, analysis, options),
    clientCode:
      options.generateClientStubs !== false
        ? generateClientStubCode(componentName, analysis, options)
        : null,
    typeDefinition: generateTypeDefinition(componentName, analysis),
    analysis,
  };
}

// ============================================================
// Server Function 运行时支持
// ============================================================

/**
 * 创建服务端函数引用
 * 用于在服务端标记可被客户端调用的函数
 */
export function createServerReference<T extends (...args: unknown[]) => Promise<unknown>>(
  id: string,
  fn: T,
): T {
  const serverFn = fn as T & { __serverReferenceId?: string; __isServerReference?: boolean };
  serverFn.__serverReferenceId = id;
  serverFn.__isServerReference = true;
  return fn;
}

/**
 * 创建客户端代理
 * 用于在客户端调用服务端函数
 */
export function createServerProxy<T extends (...args: unknown[]) => Promise<unknown>>(
  componentName: string,
  functionName: string,
): T {
  return (async (...args: unknown[]) => {
    // 发送请求到服务端
    const response = await fetch('/__lytjs_server_action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Server-Component': componentName,
        'X-Server-Function': functionName,
      },
      body: JSON.stringify({ args }),
    });

    if (!response.ok) {
      throw new Error(`[LytJS] Server function ${functionName} failed: ${response.statusText}`);
    }

    return response.json();
  }) as T;
}
