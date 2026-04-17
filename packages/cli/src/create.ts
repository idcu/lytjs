/**
 * Lyt CLI 项目脚手架模块
 * 实现 `lyt create <name>` 命令，用于创建新的 Lyt 项目
 * 纯 Node.js 原生实现，不依赖任何第三方包
 */

import * as path from 'path';
import { ensureDir, writeFile, fileExists, colorText, logger } from './utils';

// ============================================================
// 模板定义
// ============================================================

/** 脚手架选项 */
export interface CreateOptions {
  /** 项目模板类型（默认 spa） */
  template?: string;
}

/**
 * 标准项目文件结构定义
 * 每个条目包含相对路径和文件内容生成函数
 */
interface ProjectFile {
  /** 相对于项目根目录的文件路径 */
  filePath: string;
  /** 文件内容（字符串） */
  content: string;
}

// ============================================================
// 模板内容
// ============================================================

/**
 * 生成 index.html 入口文件内容
 * 包含 <div id="app"></div> 挂载点和模块脚本引用
 */
function generateIndexHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lyt App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`;
}

/**
 * 生成 src/main.ts 应用入口文件内容
 * 导入 createApp，创建应用实例并挂载到 DOM
 */
function generateMainTs(): string {
  return `import { createApp } from '@lytjs/lytjs';
import App from './App';

// 创建应用实例
const app = createApp(App);

// 将应用挂载到 #app 元素
app.mount('#app');
`;
}

/**
 * 生成 src/App.ts 根组件文件内容
 * 一个简单的 Hello World 组件示例
 */
function generateAppTs(): string {
  return `import { defineComponent } from '@lytjs/lytjs';

// 定义根组件
const App = defineComponent({
  name: 'App',

  // 组件模板
  template: \`
    <div class="app">
      <h1>Hello Lyt!</h1>
      <p>欢迎使用 Lyt 框架</p>
    </div>
  \`,

  // 组件状态
  setup() {
    const message: string = 'Hello World';

    return {
      message,
    };
  },
});

export default App;
`;
}

/**
 * 生成 src/style.css 全局样式文件内容
 */
function generateStyleCss(): string {
  return `/* Lyt 全局样式 */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.app {
  text-align: center;
  padding: 40px 20px;
}

.app h1 {
  font-size: 2.5rem;
  color: #42b883;
  margin-bottom: 10px;
}

.app p {
  font-size: 1.2rem;
  color: #666;
}
`;
}

/**
 * 生成 package.json 项目配置文件内容
 * 包含 @lytjs/lytjs 依赖和 dev/build scripts
 * @param name - 项目名称
 */
function generatePackageJson(name: string): string {
  const pkg = {
    name: name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'lyt dev',
      build: 'lyt build',
      preview: 'lyt preview',
    },
    dependencies: {
      '@lytjs/lytjs': 'latest',
    },
    devDependencies: {
      '@lytjs/cli': 'latest',
      typescript: '^5.0.0',
    },
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

/**
 * 生成 tsconfig.json TypeScript 配置文件内容
 */
function generateTsConfig(): string {
  const config = {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      jsx: 'preserve',
      resolveJsonModule: true,
      isolatedModules: true,
      esModuleInterop: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      skipLibCheck: true,
      noEmit: true,
      paths: {
        '@/*': ['./src/*'],
      },
    },
    include: ['src/**/*.ts', 'src/**/*.tsx'],
    exclude: ['node_modules', 'dist'],
  };
  return JSON.stringify(config, null, 2) + '\n';
}

/**
 * 生成 .gitignore 文件内容
 */
function generateGitIgnore(): string {
  return `# 依赖
node_modules/

# 构建输出
dist/

# 编辑器配置
.vscode/
.idea/
*.swp
*.swo

# 系统文件
.DS_Store
Thumbs.db

# 环境变量
.env.local
.env.*.local

# 日志
*.log
npm-debug.log*
`;
}

// ============================================================
// 核心功能
// ============================================================

/**
 * 创建新的 Lyt 项目
 *
 * @param name - 项目名称（同时作为目录名）
 * @param options - 脚手架选项
 * @param options.template - 项目模板类型（默认 'spa'）
 *
 * 生成的项目结构：
 * ```
 * <name>/
 * ├── index.html          # 入口 HTML
 * ├── src/
 * │   ├── main.ts         # 应用入口
 * │   ├── App.ts          # 根组件
 * │   └── style.css       # 全局样式
 * ├── package.json        # 项目配置
 * ├── tsconfig.json       # TS 配置
 * └── .gitignore          # Git 忽略规则
 * ```
 */
export async function createProject(
  name: string,
  options: CreateOptions = {}
): Promise<void> {
  const template = options.template || 'spa';
  const targetDir = path.resolve(process.cwd(), name);

  logger.info(`正在创建 Lyt 项目: ${colorText(name, 'brightCyan')}`);
  logger.info(`使用模板: ${colorText(template, 'brightCyan')}`);

  // 检查目标目录是否已存在
  if (fileExists(targetDir)) {
    logger.error(`目录 "${name}" 已存在，请选择其他名称或删除已有目录`);
    process.exit(1);
  }

  // 创建项目根目录
  ensureDir(targetDir);

  // 定义所有需要生成的文件
  const files: ProjectFile[] = [
    {
      filePath: 'index.html',
      content: generateIndexHtml(),
    },
    {
      filePath: 'src/main.ts',
      content: generateMainTs(),
    },
    {
      filePath: 'src/App.ts',
      content: generateAppTs(),
    },
    {
      filePath: 'src/style.css',
      content: generateStyleCss(),
    },
    {
      filePath: 'package.json',
      content: generatePackageJson(name),
    },
    {
      filePath: 'tsconfig.json',
      content: generateTsConfig(),
    },
    {
      filePath: '.gitignore',
      content: generateGitIgnore(),
    },
  ];

  // 逐个创建文件
  for (const file of files) {
    const fullPath = path.join(targetDir, file.filePath);
    writeFile(fullPath, file.content);
    logger.success(`  创建 ${file.filePath}`);
  }

  // 输出完成信息
  console.log('');
  logger.success(`项目 ${colorText(name, 'brightCyan')} 创建成功！`);
  console.log('');
  console.log(`  请执行以下命令启动项目：`);
  console.log('');
  console.log(`    ${colorText('cd', 'brightGreen')} ${name}`);
  console.log(`    ${colorText('npm install', 'brightGreen')}`);
  console.log(`    ${colorText('npm run dev', 'brightGreen')}`);
  console.log('');
}
