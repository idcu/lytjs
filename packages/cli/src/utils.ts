/**
 * Lyt CLI 工具函数模块
 * 提供彩色输出、参数解析、文件操作、MIME 类型识别、日志等功能
 * 纯 Node.js 原生实现，不依赖任何第三方包
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// ANSI 颜色常量
// ============================================================

/** ANSI 重置码 */
const RESET = '\x1b[0m';

/** ANSI 颜色映射表 */
const COLORS: Record<string, string> = {
  // 前景色
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  // 亮色
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  // 背景色
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  // 样式
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  strikethrough: '\x1b[9m',
};

// ============================================================
// 彩色文本输出
// ============================================================

/**
 * 为文本添加 ANSI 颜色
 * @param text - 要着色的文本
 * @param color - 颜色名称（支持 black/red/green/yellow/blue/magenta/cyan/white/brightRed 等）
 * @returns 带有 ANSI 转义码的彩色文本
 */
export function colorText(text: string, color: string): string {
  const colorCode = COLORS[color];
  if (!colorCode) {
    return text; // 未知颜色，返回原文
  }
  return `${colorCode}${text}${RESET}`;
}

// ============================================================
// 命令行参数解析
// ============================================================

/** 解析后的命令行参数结构 */
export interface ParsedArgs {
  /** 命令名称（如 create、dev、build） */
  command: string;
  /** 命令参数（如项目名称） */
  args: string[];
  /** 选项键值对（如 { port: '3000', template: 'spa' }） */
  options: Record<string, string | boolean>;
  /** 原始 argv 数组 */
  raw: string[];
}

/**
 * 解析命令行参数（纯手写实现，不依赖任何库）
 * 支持格式：
 *   - 命令：lyt create my-app
 *   - 短选项：lyt dev -p 3000
 *   - 长选项：lyt dev --port 3000
 *   - 布尔选项：lyt build --minify
 *   - 等号选项：lyt dev --port=3000
 *
 * @param argv - process.argv 数组
 * @returns 解析后的参数对象
 */
export function parseArgs(argv: string[]): ParsedArgs {
  // 跳过前两个元素：node 可执行文件路径和脚本路径
  const args = argv.slice(2);

  const result: ParsedArgs = {
    command: '',
    args: [],
    options: {},
    raw: args,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      // 帮助选项
      result.options.help = true;
      i++;
    } else if (arg === '--version' || arg === '-v') {
      // 版本选项
      result.options.version = true;
      i++;
    } else if (arg.startsWith('--')) {
      // 长选项：--port 3000 或 --port=3000
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        // 等号格式：--port=3000
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        result.options[key] = value;
      } else {
        // 空格格式：--port 3000
        const key = arg.slice(2);
        const nextArg = args[i + 1];
        // 判断下一个参数是否是选项（以 - 开头）或不存在
        if (nextArg && !nextArg.startsWith('-')) {
          result.options[key] = nextArg;
          i++; // 额外跳过值
        } else {
          // 布尔选项，如 --minify
          result.options[key] = true;
        }
      }
      i++;
    } else if (arg.startsWith('-') && arg.length > 1) {
      // 短选项：-p 3000
      const key = arg.slice(1);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        result.options[key] = nextArg;
        i++; // 额外跳过值
      } else {
        result.options[key] = true;
      }
      i++;
    } else if (!result.command) {
      // 第一个非选项参数作为命令
      result.command = arg;
      i++;
    } else {
      // 其余非选项参数作为命令参数
      result.args.push(arg);
      i++;
    }
  }

  return result;
}

// ============================================================
// 文件系统操作
// ============================================================

/**
 * 确保目录存在，不存在则递归创建
 * @param dir - 目录路径
 */
export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 检查文件或目录是否存在
 * @param filePath - 文件路径
 * @returns 是否存在
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * 读取文件内容（UTF-8 编码）
 * @param filePath - 文件路径
 * @returns 文件内容字符串
 * @throws 文件不存在时抛出错误
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 写入文件内容（UTF-8 编码）
 * 如果父目录不存在会自动创建
 * @param filePath - 文件路径
 * @param content - 要写入的内容
 */
export function writeFile(filePath: string, content: string | Buffer): void {
  // 确保父目录存在
  const dir = path.dirname(filePath);
  ensureDir(dir);
  if (typeof content === 'string') {
    fs.writeFileSync(filePath, content, 'utf-8');
  } else {
    fs.writeFileSync(filePath, content);
  }
}

// ============================================================
// MIME 类型识别
// ============================================================

/**
 * 根据文件扩展名获取 MIME 类型
 * 手写的 MIME 类型映射表，覆盖常见前端文件类型
 * @param filename - 文件名
 * @returns MIME 类型字符串，未知类型返回 application/octet-stream
 */
export function getMIMEType(filename: string): string {
  // 提取文件扩展名（转为小写）
  const ext = path.extname(filename).toLowerCase();

  // MIME 类型映射表
  const mimeMap: Record<string, string> = {
    // HTML
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    // CSS
    '.css': 'text/css; charset=utf-8',
    // JavaScript
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.cjs': 'application/javascript; charset=utf-8',
    // TypeScript（开发服务器会编译为 JS 返回）
    '.ts': 'application/javascript; charset=utf-8',
    '.tsx': 'application/javascript; charset=utf-8',
    // JSON
    '.json': 'application/json; charset=utf-8',
    // 图片
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    // 字体
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.eot': 'application/vnd.ms-fontobject',
    // 文本
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    // 源码映射
    '.map': 'application/json; charset=utf-8',
    // 视频和音频
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    // PDF
    '.pdf': 'application/pdf',
    // 压缩包
    '.zip': 'application/zip',
    '.gz': 'application/gzip',
    // Web Manifest
    '.webmanifest': 'application/manifest+json; charset=utf-8',
  };

  return mimeMap[ext] || 'application/octet-stream';
}

// ============================================================
// 日志工具
// ============================================================

/** 日志工具对象，提供 info/warn/error/success 四种级别 */
export const logger = {
  /**
   * 信息日志（蓝色）
   * @param msg - 日志消息
   */
  info(msg: string): void {
    console.log(`${colorText('[INFO]', 'blue')} ${msg}`);
  },

  /**
   * 警告日志（黄色）
   * @param msg - 日志消息
   */
  warn(msg: string): void {
    console.log(`${colorText('[WARN]', 'yellow')} ${msg}`);
  },

  /**
   * 错误日志（红色）
   * @param msg - 日志消息
   */
  error(msg: string): void {
    console.error(`${colorText('[ERROR]', 'red')} ${msg}`);
  },

  /**
   * 成功日志（绿色）
   * @param msg - 日志消息
   */
  success(msg: string): void {
    console.log(`${colorText('[SUCCESS]', 'green')} ${msg}`);
  },
};

// ============================================================
// 依赖解析工具
// ============================================================

/**
 * 解析 workspace 协议版本号
 *
 * 识别 `workspace:*`、`workspace:~`、`workspace:^` 前缀，
 * 将 workspace 协议转换为实际文件路径引用（`file:../package-name`）。
 *
 * @param packageName - 包名（如 @lytjs/component）
 * @param version - 版本字符串（如 workspace:*）
 * @param workspaceRoot - 工作区根目录路径（可选，默认 process.cwd()）
 * @returns 转换后的版本字符串（如 file:../packages/component）
 */
export function resolveWorkspaceProtocol(
  packageName: string,
  version: string,
  workspaceRoot?: string,
): string {
  // 检查是否为 workspace 协议
  if (!version.startsWith('workspace:')) {
    return version;
  }

  const root = workspaceRoot || process.cwd();

  // 提取 workspace 协议后的版本部分
  const workspaceVersion = version.slice('workspace:'.length);

  // workspace:* 或 workspace:~ 或 workspace:^ 表示使用工作区中的最新版本
  // 转换为 file: 协议引用
  if (workspaceVersion === '*' || workspaceVersion === '~' || workspaceVersion === '^') {
    // 将包名转换为路径
    // 例如: @lytjs/component -> packages/component
    // 例如: plugin-virtual-list -> packages/plugin-virtual-list
    const scopeMatch = packageName.match(/^@([^/]+)\/(.+)$/);
    let relativePath: string;

    if (scopeMatch) {
      // 作用域包: @lytjs/component -> packages/component
      relativePath = `packages/${scopeMatch[2]}`;
    } else {
      // 普通包: plugin-virtual-list -> packages/plugin-virtual-list
      relativePath = `packages/${packageName}`;
    }

    return `file:${relativePath}`;
  }

  // workspace:1.2.3 等具体版本，保留原样（使用工作区中满足该版本的包）
  // 在实际安装时，包管理器会解析到工作区中匹配的包
  return version;
}

/**
 * 解析 peer dependencies
 *
 * 读取 package.json 中的 peerDependencies 字段，
 * 将 peer dependencies 添加到依赖列表中。
 *
 * @param packageJson - package.json 对象
 * @returns peer dependencies 列表 [{ name, version }]
 */
export function resolvePeerDependencies(
  packageJson: Record<string, any>,
): Array<{ name: string; version: string }> {
  const peerDeps = packageJson.peerDependencies;
  if (!peerDeps || typeof peerDeps !== 'object') {
    return [];
  }

  const result: Array<{ name: string; version: string }> = [];

  for (const [name, version] of Object.entries(peerDeps)) {
    if (typeof version === 'string') {
      result.push({ name, version });
    }
  }

  return result;
}

/**
 * 增强版依赖解析
 *
 * 解析 package.json 中的所有依赖（dependencies、devDependencies、peerDependencies），
 * 支持 workspace 协议转换。
 *
 * @param packageJson - package.json 对象
 * @param options - 解析选项
 * @returns 所有依赖列表 [{ name, version, type }]
 */
export function resolveAllDependencies(
  packageJson: Record<string, any>,
  options?: {
    /** 工作区根目录路径 */
    workspaceRoot?: string;
    /** 是否包含 devDependencies，默认 true */
    includeDev?: boolean;
    /** 是否包含 peerDependencies，默认 true */
    includePeer?: boolean;
    /** 是否转换 workspace 协议，默认 true */
    resolveWorkspace?: boolean;
  },
): Array<{ name: string; version: string; type: string }> {
  const opts = {
    includeDev: true,
    includePeer: true,
    resolveWorkspace: true,
    ...options,
  };

  const result: Array<{ name: string; version: string; type: string }> = [];

  // 解析 dependencies
  const deps = packageJson.dependencies;
  if (deps && typeof deps === 'object') {
    for (const [name, version] of Object.entries(deps)) {
      const ver = typeof version === 'string' ? version : '';
      const resolvedVer = opts.resolveWorkspace
        ? resolveWorkspaceProtocol(name, ver, opts.workspaceRoot)
        : ver;
      result.push({ name, version: resolvedVer, type: 'dependency' });
    }
  }

  // 解析 devDependencies
  if (opts.includeDev) {
    const devDeps = packageJson.devDependencies;
    if (devDeps && typeof devDeps === 'object') {
      for (const [name, version] of Object.entries(devDeps)) {
        const ver = typeof version === 'string' ? version : '';
        const resolvedVer = opts.resolveWorkspace
          ? resolveWorkspaceProtocol(name, ver, opts.workspaceRoot)
          : ver;
        result.push({ name, version: resolvedVer, type: 'devDependency' });
      }
    }
  }

  // 解析 peerDependencies
  if (opts.includePeer) {
    const peers = resolvePeerDependencies(packageJson);
    for (const peer of peers) {
      const resolvedVer = opts.resolveWorkspace
        ? resolveWorkspaceProtocol(peer.name, peer.version, opts.workspaceRoot)
        : peer.version;
      result.push({ name: peer.name, version: resolvedVer, type: 'peerDependency' });
    }
  }

  return result;
}
