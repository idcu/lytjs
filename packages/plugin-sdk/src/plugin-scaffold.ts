/**
 * Lyt.js Plugin SDK — 插件脚手架
 *
 * 提供插件项目的快速创建功能：
 * - scaffold: 根据模板创建插件项目
 * - 生成标准目录结构
 * - 生成 lyt-plugin.json 清单文件
 * - 生成 package.json（含构建脚本）
 * - 生成 src/index.ts 模板（含 install 方法）
 * - 生成 README.md 模板
 *
 * 纯原生零依赖实现。
 */

import type { LytPluginCategory } from './types';

// ============================================================
// 类型定义
// ============================================================

/** 脚手架选项 */
export interface ScaffoldOptions {
  /** 插件名称（不含 lyt-plugin- 前缀也可，会自动补全） */
  name: string;
  /** 插件描述 */
  description: string;
  /** 插件作者 */
  author: string;
  /** 插件分类 */
  category: LytPluginCategory;
  /** 模板类型 */
  template: 'basic' | 'ui' | 'tool' | 'integration';
  /** 输出目录（默认为当前目录） */
  outputDir?: string;
  /** 插件版本号（默认 1.0.0） */
  version?: string;
  /** 开源协议（默认 MIT） */
  license?: string;
}

// ============================================================
// 模板内容
// ============================================================

/** package.json 模板 */
function packageJsonTemplate(options: ScaffoldOptions): string {
  const fullName = normalizePluginName(options.name);
  return JSON.stringify(
    {
      name: fullName,
      version: options.version || '1.0.0',
      description: options.description,
      main: './dist/index.cjs',
      module: './dist/index.mjs',
      types: './dist/types/index.d.ts',
      exports: {
        '.': {
          types: './dist/types/index.d.ts',
          import: './dist/index.mjs',
          require: './dist/index.cjs',
          default: './dist/index.mjs',
        },
      },
      sideEffects: false,
      files: ['dist'],
      license: options.license || 'MIT',
      author: options.author,
      keywords: ['lyt', 'lytjs', 'plugin', fullName],
      peerDependencies: {
        '@lytjs/core': '^4.0.0',
      },
      devDependencies: {
        '@lytjs/core': 'workspace:*',
        typescript: '^5.0.0',
      },
      scripts: {
        build: 'tsc --noEmit && node ../../scripts/esbuild-bundle.js',
        dev: 'node ../../scripts/esbuild-bundle.js --watch',
        prepublishOnly: 'npm run build',
      },
    },
    null,
    2
  );
}

/** tsconfig.json 模板 */
function tsconfigTemplate(): string {
  return JSON.stringify(
    {
      extends: '../../tsconfig.json',
      compilerOptions: {
        outDir: './dist/types',
        rootDir: './src',
      },
      include: ['src'],
    },
    null,
    2
  );
}

/** lyt-plugin.json 模板 */
function pluginManifestTemplate(options: ScaffoldOptions): string {
  const fullName = normalizePluginName(options.name);
  return JSON.stringify(
    {
      name: fullName,
      version: options.version || '1.0.0',
      description: options.description,
      author: options.author,
      license: options.license || 'MIT',
      keywords: ['lyt', 'lytjs', 'plugin', fullName],
      main: './dist/index.mjs',
      category: options.category,
      permissions: getPermissionsForTemplate(options.template),
      peerDependencies: {
        '@lytjs/core': '^4.0.0',
      },
    },
    null,
    2
  );
}

/** src/index.ts 模板 */
function indexTemplate(options: ScaffoldOptions): string {
  const fullName = normalizePluginName(options.name);

  switch (options.template) {
    case 'ui':
      return `/**
 * ${fullName} - ${options.description}
 *
 * UI 类型插件模板
 */

import type { LytPluginAPI } from '@lytjs/plugin-sdk';

export interface ${toPascalCase(options.name)}Options {
  /** 自定义主题色 */
  themeColor?: string;
  /** 是否显示标题 */
  showTitle?: boolean;
}

const defaultOptions: ${toPascalCase(options.name)}Options = {
  themeColor: '#1890ff',
  showTitle: true,
};

export async function install(api: LytPluginAPI, options?: Partial<${toPascalCase(options.name)}Options>): Promise<void> {
  const config = { ...defaultOptions, ...options };

  api.logger.info('${fullName} 插件已安装');

  // 注册自定义组件
  // api.app.component('MyComponent', MyComponent);

  // 注册路由
  // api.router.addRoute({ path: '/my-plugin', component: MyPage });

  api.logger.info('${fullName} 配置:', config);
}

export async function uninstall(api: LytPluginAPI): Promise<void> {
  api.logger.info('${fullName} 插件已卸载');
}
`;

    case 'tool':
      return `/**
 * ${fullName} - ${options.description}
 *
 * 工具类型插件模板
 */

import type { LytPluginAPI } from '@lytjs/plugin-sdk';

export interface ${toPascalCase(options.name)}Options {
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 日志级别 */
  logLevel?: 'info' | 'warn' | 'error' | 'debug';
}

const defaultOptions: ${toPascalCase(options.name)}Options = {
  debug: false,
  logLevel: 'info',
};

export async function install(api: LytPluginAPI, options?: Partial<${toPascalCase(options.name)}Options>): Promise<void> {
  const config = { ...defaultOptions, ...options };

  api.logger.info('${fullName} 插件已安装');

  // 注册全局方法
  // api.app.config.globalProperties.$myTool = createTool(config);

  api.logger.info('${fullName} 配置:', config);
}

export async function uninstall(api: LytPluginAPI): Promise<void> {
  api.logger.info('${fullName} 插件已卸载');
}
`;

    case 'integration':
      return `/**
 * ${fullName} - ${options.description}
 *
 * 集成类型插件模板
 */

import type { LytPluginAPI } from '@lytjs/plugin-sdk';

export interface ${toPascalCase(options.name)}Options {
  /** API 端点 */
  endpoint?: string;
  /** API 密钥 */
  apiKey?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
}

const defaultOptions: ${toPascalCase(options.name)}Options = {
  endpoint: 'https://api.example.com',
  timeout: 5000,
};

export async function install(api: LytPluginAPI, options?: Partial<${toPascalCase(options.name)}Options>): Promise<void> {
  const config = { ...defaultOptions, ...options };

  api.logger.info('${fullName} 插件已安装');

  // 初始化第三方服务连接
  // const client = createClient(config);

  // 监听应用事件
  api.on('app:ready', () => {
    api.logger.info('${fullName} 服务已就绪');
  });

  api.logger.info('${fullName} 配置:', config);
}

export async function uninstall(api: LytPluginAPI): Promise<void> {
  api.logger.info('${fullName} 插件已卸载');
}
`;

    case 'basic':
    default:
      return `/**
 * ${fullName} - ${options.description}
 *
 * 基础插件模板
 */

import type { LytPluginAPI } from '@lytjs/plugin-sdk';

export interface ${toPascalCase(options.name)}Options {
  /** 自定义选项 */
  [key: string]: any;
}

export async function install(api: LytPluginAPI, options?: ${toPascalCase(options.name)}Options): Promise<void> {
  api.logger.info('${fullName} 插件已安装');

  // 在此编写插件逻辑
  // api.logger.info('配置:', options);
}

export async function uninstall(api: LytPluginAPI): Promise<void> {
  api.logger.info('${fullName} 插件已卸载');
}
`;
  }
}

/** README.md 模板 */
function readmeTemplate(options: ScaffoldOptions): string {
  const fullName = normalizePluginName(options.name);
  const displayName = toDisplayName(options.name);

  return `# ${displayName}

${options.description}

## 安装

\`\`\`bash
npm install ${fullName}
\`\`\`

## 使用

\`\`\`typescript
import { createApp } from '@lytjs/core';
import { install, uninstall } from '${fullName}';

const app = createApp({});

// 安装插件
app.use({ install });

// 卸载插件
// app.use({ uninstall });
\`\`\`

## 配置

\`\`\`typescript
import { install } from '${fullName}';

app.use({
  install: (api) => install(api, {
    // 自定义配置
  }),
});
\`\`\`

## 开发

\`\`\`bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build
\`\`\`

## 许可

${options.license || 'MIT'}
`;
}

// ============================================================
// 辅助函数
// ============================================================

/** 规范化插件名称（自动补全 lyt-plugin- 前缀） */
function normalizePluginName(name: string): string {
  if (name.startsWith('@')) {
    // @scope/xxx 格式
    const parts = name.split('/');
    if (parts.length === 2 && !parts[1].startsWith('lyt-plugin-')) {
      return `${parts[0]}/lyt-plugin-${parts[1]}`;
    }
    return name;
  }
  if (!name.startsWith('lyt-plugin-')) {
    return `lyt-plugin-${name}`;
  }
  return name;
}

/** 将名称转为 PascalCase */
function toPascalCase(name: string): string {
  const clean = name
    .replace(/^@.*\//, '')       // 移除 scope
    .replace(/^lyt-plugin-/, '') // 移除前缀
    .replace(/-./g, (m) => m[1].toUpperCase());
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** 将名称转为显示名称 */
function toDisplayName(name: string): string {
  const clean = name
    .replace(/^@.*\//, '')
    .replace(/^lyt-plugin-/, '');
  return clean
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** 根据模板类型获取默认权限 */
function getPermissionsForTemplate(template: ScaffoldOptions['template']): string[] {
  switch (template) {
    case 'ui':
      return ['theme'];
    case 'tool':
      return ['storage'];
    case 'integration':
      return ['network', 'storage'];
    case 'basic':
    default:
      return [];
  }
}

// ============================================================
// PluginScaffold
// ============================================================

/**
 * 插件脚手架
 *
 * 根据模板快速创建插件项目，生成标准目录结构和文件。
 */
export class PluginScaffold {
  /**
   * 创建插件项目
   *
   * 生成标准目录结构：
   * ```
   * lyt-plugin-xxx/
   *   ├── package.json
   *   ├── tsconfig.json
   *   ├── src/
   *   │   └── index.ts
   *   ├── README.md
   *   └── lyt-plugin.json
   * ```
   *
   * @param options - 脚手架选项
   */
  async scaffold(options: ScaffoldOptions): Promise<void> {
    const fullName = normalizePluginName(options.name);
    const baseDir = options.outputDir || process.cwd();
    const projectDir = `${baseDir}/${fullName}`;

    // 使用 Node.js fs 模块创建目录和文件
    const fs = await import('fs');
    const path = await import('path');

    // 创建目录结构
    const dirs = [
      projectDir,
      `${projectDir}/src`,
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // 生成文件
    const files: Record<string, string> = {
      'package.json': packageJsonTemplate(options),
      'tsconfig.json': tsconfigTemplate(),
      'lyt-plugin.json': pluginManifestTemplate(options),
      'src/index.ts': indexTemplate(options),
      'README.md': readmeTemplate(options),
    };

    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(projectDir, filePath);
      fs.writeFileSync(fullPath, content, 'utf-8');
    }

    console.log(`[PluginScaffold] 插件项目已创建: ${projectDir}`);
    console.log('');
    console.log('  目录结构:');
    console.log('  ' + fullName + '/');
    console.log('  ├── package.json');
    console.log('  ├── tsconfig.json');
    console.log('  ├── lyt-plugin.json');
    console.log('  ├── src/');
    console.log('  │   └── index.ts');
    console.log('  └── README.md');
    console.log('');
    console.log('  下一步:');
    console.log(`  cd ${fullName}`);
    console.log('  pnpm install');
    console.log('  pnpm dev');
  }
}
