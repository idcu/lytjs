/// <reference lib="webworker" />
declare const EdgeRuntime: unique symbol;
// packages/compiler/src/client-server-boundary/index.ts
// Client/Server 边界自动分割
// Phase 1.6: 自动检测和分割客户端/服务端代码

// ============================================================
// 类型定义
// ============================================================

/** 边界类型 */
export type BoundaryType = 'client' | 'server' | 'shared';

/** 边界分析结果 */
export interface BoundaryAnalysis {
  /** 模块边界类型 */
  type: BoundaryType;
  /** 服务端专用导入 */
  serverImports: string[];
  /** 客户端专用导入 */
  clientImports: string[];
  /** 服务端专用函数 */
  serverFunctions: string[];
  /** 客户端专用函数 */
  clientFunctions: string[];
  /** 需要分割的组件 */
  componentsToSplit: ComponentBoundary[];
  /** 是否需要生成客户端桩 */
  needsClientStub: boolean;
  /** 是否需要生成服务端桩 */
  needsServerStub: boolean;
}

/** 组件边界信息 */
export interface ComponentBoundary {
  /** 组件名称 */
  name: string;
  /** 边界类型 */
  type: BoundaryType;
  /** 服务端专用 props */
  serverProps: string[];
  /** 客户端专用 props */
  clientProps: string[];
  /** 服务端专用方法 */
  serverMethods: string[];
  /** 客户端专用方法 */
  clientMethods: string[];
  /** 生命周期钩子位置 */
  lifecycleHooks: {
    name: string;
    type: 'client' | 'server';
  }[];
}

/** 分割结果 */
export interface SplitResult {
  /** 服务端代码 */
  serverCode: string;
  /** 客户端代码 */
  clientCode: string;
  /** 共享代码 */
  sharedCode: string;
  /** 类型定义 */
  typeDefinition: string;
  /** 分析结果 */
  analysis: BoundaryAnalysis;
}

/** 分割选项 */
export interface SplitOptions {
  /** 服务端环境标识符 */
  serverEnvId?: string;
  /** 客户端环境标识符 */
  clientEnvId?: string;
  /** 是否生成类型定义 */
  generateTypes?: boolean;
  /** 是否内联共享代码 */
  inlineShared?: boolean;
}

// ============================================================
// 环境检测模式
// ============================================================

/** 服务端专用 API 模式 */
const SERVER_ONLY_PATTERNS = [
  /^fs$/,
  /^path$/,
  /^crypto$/,
  /^http$/,
  /^https$/,
  /^net$/,
  /^os$/,
  /^child_process$/,
  /^cluster$/,
  /^dgram$/,
  /^dns$/,
  /^readline$/,
  /^repl$/,
  /^stream$/,
  /^tls$/,
  /^tty$/,
  /^url$/,
  /^util$/,
  /^v8$/,
  /^vm$/,
  /^zlib$/,
  /^worker_threads$/,
  /^perf_hooks$/,
  /^async_hooks$/,
];

/** 客户端专用 API 模式 */
const CLIENT_ONLY_PATTERNS = [
  /^window$/,
  /^document$/,
  /^navigator$/,
  /^localStorage$/,
  /^sessionStorage$/,
  /^fetch$/,
  /^WebSocket$/,
  /^XMLHttpRequest$/,
  /^IntersectionObserver$/,
  /^MutationObserver$/,
  /^ResizeObserver$/,
  /^PerformanceObserver$/,
  /^ServiceWorker$/,
  /^Worker$/,
  /^Blob$/,
  /^File$/,
  /^FileReader$/,
  /^URL$/,
  /^URLSearchParams$/,
  /^history$/,
  /^location$/,
  /^alert$/,
  /^confirm$/,
  /^prompt$/,
  /^requestAnimationFrame$/,
  /^cancelAnimationFrame$/,
  /^requestIdleAnimationFrame$/,
  /^cancelIdleAnimationFrame$/,
];

/** 服务端生命周期钩子 */
const SERVER_LIFECYCLE_HOOKS = ['serverPrefetch', 'ssrRender', 'ssrSetup'];

/** 客户端生命周期钩子 */
const CLIENT_LIFECYCLE_HOOKS = [
  'mounted',
  'beforeMount',
  'updated',
  'beforeUpdate',
  'unmounted',
  'beforeUnmount',
  'activated',
  'deactivated',
  'errorCaptured',
  'renderTracked',
  'renderTriggered',
];

/**
 * 把「匹配整个 import 路径」的锚点模式转成「匹配源码里出现的标识符」的正则
 *
 * ★ 2026-10-20 修复：上面两组模式是为 `p.test(importPath)` 写的（`/^fs$/` 正好匹配整个路径）。
 *   但扫描源码时原先写的是 `new RegExp('\\b' + pattern.source + '\\b')` ⇒ 实际得到 `\b^fs$\b`，
 *   **只有整个源文件恰好等于 `fs` 才匹配** ⇒ **全局 API 检测整体失效**（实测：用了 `document` /
 *   `fetch` / `fs` 的源码，`clientImports` / `serverImports` 全为空，模块类型被误判成 `shared`，
 *   函数级归属与 client/server 桩判定跟着全错）。
 */
function globalApiPattern(pattern: RegExp): RegExp {
  const bare = pattern.source.replace(/^\^/, '').replace(/\$$/, '');
  return new RegExp(`\\b${bare}\\b`);
}

/**
 * 判断一个标识符是否**可 import 的模块**（而不是 `window` / `document` 这类全局对象名）
 *
 * ★ 2026-10-20：修复全局检测后会有一批「全局对象名」进入 `clientImports` / `serverImports`，
 *   而生成器原来无条件写 `import '${id}';` ⇒ 会产出 `import 'document';` 这种**非法代码**。
 */
function isImportableModule(id: string): boolean {
  if (id.startsWith('.') || id.startsWith('/') || id.startsWith('@') || id.startsWith('node:')) {
    return true;
  }
  // 裸标识符里只有 Node 内置模块（fs / path / …）才是可 import 的
  return SERVER_ONLY_PATTERNS.some((p) => p.test(id));
}

/**
 * 从 `{` 所在下标提取**配平**的花括号内容（能处理嵌套对象）
 *
 * ★ 2026-10-20 修复：组件扫描原先用 `defineComponent\s*\(\s*\{([^}]+)\}` —— `[^}]+` 在**第一个** `}`
 *   处就停，而真实组件几乎总有嵌套对象（`props: { … }` / `data() { return { … } }`）⇒ 组件体被截断，
 *   排在 `props` **之后**的生命周期钩子永远扫不到 ⇒ `componentsToSplit` 实际恒为空。
 */
function extractBalanced(source: string, openBraceIndex: number): string {
  let depth = 0;
  for (let i = openBraceIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(openBraceIndex + 1, i);
    }
  }
  return source.slice(openBraceIndex + 1);
}

// ============================================================
// 边界分析
// ============================================================

/**
 * 分析源码的客户端/服务端边界
 */
export function analyzeBoundary(source: string): BoundaryAnalysis {
  const serverImports: string[] = [];
  const clientImports: string[] = [];
  const serverFunctions: string[] = [];
  const clientFunctions: string[] = [];
  const componentsToSplit: ComponentBoundary[] = [];

  // 分析导入语句
  const importMatches = source.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
  for (const match of importMatches) {
    const importPath = match[1]!;
    if (isServerOnlyImport(importPath)) {
      serverImports.push(importPath);
    } else if (isClientOnlyImport(importPath)) {
      clientImports.push(importPath);
    }
  }

  // 分析全局 API 使用
  for (const pattern of CLIENT_ONLY_PATTERNS) {
    if (globalApiPattern(pattern).test(source)) {
      clientImports.push(pattern.source.replace(/^\^/, '').replace(/\$$/, ''));
    }
  }

  for (const pattern of SERVER_ONLY_PATTERNS) {
    if (globalApiPattern(pattern).test(source)) {
      serverImports.push(pattern.source.replace(/^\^/, '').replace(/\$$/, ''));
    }
  }

  // 分析函数定义
  const functionMatches = source.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g);
  for (const match of functionMatches) {
    const fnName = match[1]!;
    const fnBody = extractFunctionBody(source, fnName);

    if (fnBody) {
      const usesClientAPI = CLIENT_ONLY_PATTERNS.some((p) => globalApiPattern(p).test(fnBody));
      const usesServerAPI = SERVER_ONLY_PATTERNS.some((p) => globalApiPattern(p).test(fnBody));

      if (usesClientAPI && !usesServerAPI) {
        clientFunctions.push(fnName);
      } else if (usesServerAPI && !usesClientAPI) {
        serverFunctions.push(fnName);
      }
    }
  }

  // 分析组件定义（★ 用配平提取，见 `extractBalanced` 的说明）
  const componentMatches = source.matchAll(/defineComponent\s*\(\s*\{/g);
  for (const match of componentMatches) {
    const openIndex = match.index + match[0].length - 1; // 指向 '{'
    const componentBody = extractBalanced(source, openIndex);
    const componentName =
      componentBody.match(/name\s*:\s*['"](\w+)['"]/)?.[1] || 'AnonymousComponent';

    const componentBoundary = analyzeComponentBoundary(componentName, componentBody);
    if (componentBoundary.serverMethods.length > 0 || componentBoundary.clientMethods.length > 0) {
      componentsToSplit.push(componentBoundary);
    }
  }

  // 确定模块类型
  let type: BoundaryType = 'shared';
  if (serverImports.length > 0 && clientImports.length === 0) {
    type = 'server';
  } else if (clientImports.length > 0 && serverImports.length === 0) {
    type = 'client';
  }

  return {
    type,
    serverImports,
    clientImports,
    serverFunctions,
    clientFunctions,
    componentsToSplit,
    needsClientStub: serverImports.length > 0 || serverFunctions.length > 0,
    needsServerStub: clientImports.length > 0 || clientFunctions.length > 0,
  };
}

/**
 * 分析组件边界
 */
function analyzeComponentBoundary(name: string, componentBody: string): ComponentBoundary {
  const serverProps: string[] = [];
  const clientProps: string[] = [];
  const serverMethods: string[] = [];
  const clientMethods: string[] = [];
  const lifecycleHooks: { name: string; type: 'client' | 'server' }[] = [];

  // 分析 props
  const propsMatch = componentBody.match(/props\s*:\s*\{([^}]+)\}/);
  if (propsMatch) {
    const propsBody = propsMatch[1]!;
    const propNames = propsBody.matchAll(/(\w+)\s*:/g);
    for (const match of propNames) {
      const propName = match[1]!;
      // 简单启发式：以 server 开头的 prop 是服务端专用的
      if (propName.startsWith('server')) {
        serverProps.push(propName);
      } else if (propName.startsWith('client')) {
        clientProps.push(propName);
      }
    }
  }

  // 分析方法
  const methodMatches = componentBody.matchAll(/(\w+)\s*\([^)]*\)\s*\{/g);
  for (const match of methodMatches) {
    const methodName = match[1]!;
    if (SERVER_LIFECYCLE_HOOKS.includes(methodName)) {
      serverMethods.push(methodName);
      lifecycleHooks.push({ name: methodName, type: 'server' });
    } else if (CLIENT_LIFECYCLE_HOOKS.includes(methodName)) {
      clientMethods.push(methodName);
      lifecycleHooks.push({ name: methodName, type: 'client' });
    }
  }

  return {
    name,
    type:
      serverMethods.length > 0 && clientMethods.length === 0
        ? 'server'
        : clientMethods.length > 0 && serverMethods.length === 0
          ? 'client'
          : 'shared',
    serverProps,
    clientProps,
    serverMethods,
    clientMethods,
    lifecycleHooks,
  };
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 检查是否是服务端专用导入
 */
function isServerOnlyImport(importPath: string): boolean {
  // Node.js 内置模块
  if (importPath.startsWith('node:')) return true;
  if (SERVER_ONLY_PATTERNS.some((p) => p.test(importPath))) return true;
  return false;
}

/**
 * 检查是否是客户端专用导入
 */
function isClientOnlyImport(importPath: string): boolean {
  // 浏览器专用模块
  if (CLIENT_ONLY_PATTERNS.some((p) => p.test(importPath))) return true;
  return false;
}

/**
 * 提取函数体
 */
function extractFunctionBody(source: string, fnName: string): string | null {
  const regex = new RegExp(`function\\s+${fnName}\\s*\\([^)]*\\)\\s*\\{`, 'g');
  const match = regex.exec(source);
  if (!match) return null;

  let depth = 1;
  const start = match.index + match[0].length;
  let end = start;

  while (depth > 0 && end < source.length) {
    if (source[end] === '{') depth++;
    else if (source[end] === '}') depth--;
    end++;
  }

  return source.slice(start, end - 1);
}

// ============================================================
// 代码分割
// ============================================================

/**
 * 分割客户端/服务端代码
 */
export function splitClientServer(source: string, options: SplitOptions = {}): SplitResult {
  const analysis = analyzeBoundary(source);

  // 如果是纯客户端或纯服务端模块，不需要分割
  if (analysis.type !== 'shared') {
    return {
      serverCode: analysis.type === 'server' ? source : '',
      clientCode: analysis.type === 'client' ? source : '',
      sharedCode: '',
      typeDefinition: '',
      analysis,
    };
  }

  // 生成分割后的代码
  const serverCode = generateServerCode(source, analysis, options);
  const clientCode = generateClientCode(source, analysis, options);
  const sharedCode = generateSharedCode(source, analysis, options);
  const typeDefinition =
    options.generateTypes !== false ? generateTypeDefinition(source, analysis) : '';

  return {
    serverCode,
    clientCode,
    sharedCode,
    typeDefinition,
    analysis,
  };
}

/**
 * 生成服务端代码
 */
function generateServerCode(
  _source: string,
  _analysis: BoundaryAnalysis,
  _options: SplitOptions,
): string {
  const lines: string[] = [];

  lines.push("'use server';");
  lines.push('');

  for (const imp of _analysis.serverImports) {
    // ★ 2026-10-20：只对**可 import 的模块**生成 import（全局对象名不是模块）
    if (isImportableModule(imp)) lines.push(`import '${imp}';`);
  }

  for (const fn of _analysis.serverFunctions) {
    lines.push(`export { ${fn} };`);
  }

  lines.push('');
  lines.push('// Server-side code');
  lines.push(_source);

  return lines.join('\n');
}

/**
 * 生成客户端代码
 */
function generateClientCode(
  _source: string,
  _analysis: BoundaryAnalysis,
  _options: SplitOptions,
): string {
  const lines: string[] = [];

  lines.push("'use client';");
  lines.push('');

  for (const imp of _analysis.clientImports) {
    // ★ 2026-10-20：`window` / `document` / `fetch` 是浏览器全局，**不是模块** ⇒
    //   生成 `import 'document';` 是非法代码。只对真模块生成 import。
    if (isImportableModule(imp)) lines.push(`import '${imp}';`);
  }

  for (const fn of _analysis.clientFunctions) {
    lines.push(`export { ${fn} };`);
  }

  lines.push('');
  lines.push('// Client-side code');
  lines.push(_source);

  return lines.join('\n');
}

/**
 * 生成共享代码
 */
function generateSharedCode(
  _source: string,
  _analysis: BoundaryAnalysis,
  _options: SplitOptions,
): string {
  const lines: string[] = [];

  lines.push('// Shared code - runs on both client and server');
  lines.push('');

  // 导出共享函数和类型
  lines.push('export const isServer = typeof window === "undefined";');
  lines.push('export const isClient = typeof window !== "undefined";');
  lines.push('');

  return lines.join('\n');
}

/**
 * 生成类型定义
 */
function generateTypeDefinition(_source: string, analysis: BoundaryAnalysis): string {
  const lines: string[] = [];

  lines.push('// Auto-generated type definitions');
  lines.push('');

  // 服务端函数类型
  for (const fn of analysis.serverFunctions) {
    lines.push(`export function ${fn}(...args: unknown[]): Promise<unknown>;`);
  }

  // 客户端函数类型
  for (const fn of analysis.clientFunctions) {
    lines.push(`export function ${fn}(...args: unknown[]): void;`);
  }

  return lines.join('\n');
}

// ============================================================
// 运行时边界检测
// ============================================================

/**
 * 运行时环境检测
 */
export const runtime = {
  /** 是否是服务端 */
  isServer: typeof window === 'undefined',
  /** 是否是客户端 */
  isClient: typeof window !== 'undefined',
  /** 是否是 Web Worker */
  isWorker: typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope,
  /** 是否是 Node.js */
  isNode: typeof process !== 'undefined' && process.versions?.node !== undefined,
  /** 是否是 Edge Runtime */
  isEdge: typeof EdgeRuntime !== 'undefined',
};

/**
 * 条件执行：仅在服务端执行
 */
export function serverOnly<T>(fn: () => T): T | undefined {
  if (runtime.isServer) {
    return fn();
  }
  return undefined;
}

/**
 * 条件执行：仅在客户端执行
 */
export function clientOnly<T>(fn: () => T): T | undefined {
  if (runtime.isClient) {
    return fn();
  }
  return undefined;
}

/**
 * 创建环境特定的值
 */
export function createEnvironmentValue<T>(options: {
  server?: () => T;
  client?: () => T;
}): T | undefined {
  if (runtime.isServer && options.server) {
    return options.server();
  }
  if (runtime.isClient && options.client) {
    return options.client();
  }
  return undefined;
}
