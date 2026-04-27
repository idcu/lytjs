/**
 * Lyt CLI 项目脚手架模块（基础版）
 * 实现 `lyt create <name>` 命令，用于创建新的 Lyt 项目
 * 纯 Node.js 原生实现，不依赖任何第三方包
 */

import * as path from 'path';
import { ensureDir, writeFile, fileExists, colorText, logger } from './utils';

// ============================================================
// 类型定义
// ============================================================

/** 脚手架选项 */
export interface CreateOptions {
  /** 项目模板类型（默认 spa） */
  template?: string;
}

/** 项目文件定义 */
interface ProjectFile {
  /** 相对于项目根目录的文件路径 */
  filePath: string;
  /** 文件内容 */
  content: string;
}

// ============================================================
// 模板内容
// ============================================================

/**
 * 生成 index.html 入口文件内容
 */
function generateIndexHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lyt App</title>
  <link rel="stylesheet" href="/src/style.css" />
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
 */
function generateAppTs(): string {
  return `import { defineComponent, ref, computed } from '@lytjs/lytjs';

// 定义根组件
const App = defineComponent({
  name: 'App',

  // 组件模板
  template: \`
    <div class="app">
      <header class="app-header">
        <div class="logo">
          <span class="logo-text">Lyt</span>
        </div>
      </header>

      <main class="app-main">
        <div class="welcome-section">
          <h1>欢迎使用 Lyt.js!</h1>
          <p>轻写轻跑，所见即代码</p>

          <div class="counter-section">
            <h2>计数器示例</h2>
            <p class="count-display">
              当前计数: <strong>{{ count }}</strong>
            </p>
            <p class="double-display">
              双倍: <strong>{{ double }}</strong>
            </p>

            <div class="button-group">
              <button class="btn btn-primary" on-click="increment">+1</button>
              <button class="btn btn-secondary" on-click="decrement">-1</button>
              <button class="btn btn-success" on-click="reset">重置</button>
            </div>
          </div>

          <div class="features-section">
            <h2>核心功能</h2>
            <ul>
              <li v-for="feature in features" :key="feature">
                {{ feature }}
              </li>
            </ul>
          </div>
        </div>
      </main>

      <footer class="app-footer">
        <p>
          用 ❤️ 打造
        </p>
      </footer>
    </div>
  \`,

  // 响应式数据
  setup() {
    const count = ref(0);
    const double = computed(() => count.value * 2);

    const features = [
      '响应式系统（Proxy + Signal）',
      '虚拟 DOM + Patch Flag 优化',
      '组件系统（Options + Composition API）',
      '内置路由',
      '状态管理',
      'CLI 工具链',
      '浏览器 DevTools',
      '28+ UI 组件',
    ];

    const increment = () => {
      count.value++;
    };

    const decrement = () => {
      count.value--;
    };

    const reset = () => {
      count.value = 0;
    };

    return {
      count,
      double,
      features,
      increment,
      decrement,
      reset,
    };
  },
});

export default App;
`;
}

/**
 * 生成 src/style.css 样式文件内容
 */
function generateStyleCss(): string {
  return `/* Lyt.js 应用样式 */

:root {
  --primary-color: #42b883;
  --primary-hover: #35a06f;
  --secondary-color: #747b88;
  --success-color: #10b981;
  --danger-color: #ef4444;
  --text-color: #333;
  --bg-color: #f9fafb;
  --card-bg: #ffffff;
  --border-color: #e5e7eb;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  color: var(--text-color);
  background-color: var(--bg-color);
  line-height: 1.6;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  padding: 1.5rem 2rem;
  color: white;
  box-shadow: 0 2px 10px rgba(66, 184, 131, 0.2);
}

.logo {
  font-size: 1.8rem;
  font-weight: 700;
}

.logo-text {
  letter-spacing: 2px;
}

.app-main {
  flex: 1;
  padding: 3rem 2rem;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.welcome-section {
  text-align: center;
}

.welcome-section h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: var(--primary-color);
}

.welcome-section p {
  font-size: 1.2rem;
  color: var(--secondary-color);
  margin-bottom: 2rem;
}

.counter-section {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
}

.counter-section h2 {
  margin-bottom: 1rem;
  color: var(--text-color);
}

.count-display,
.double-display {
  font-size: 1.25rem;
  margin: 0.75rem 0;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background: var(--primary-color);
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-secondary {
  background: var(--secondary-color);
}

.btn-secondary:hover {
  background: #5d6470;
}

.btn-success {
  background: var(--success-color);
}

.btn-success:hover {
  background: #059669;
}

.features-section {
  margin-top: 2rem;
  text-align: left;
}

.features-section h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--text-color);
}

.features-section ul {
  list-style: none;
  padding: 0;
  max-width: 600px;
  margin: 0 auto;
}

.features-section li {
  padding: 0.75rem 1rem;
  margin: 0.5rem 0;
  background: var(--card-bg);
  border-radius: 8px;
  border-left: 4px solid var(--primary-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.app-footer {
  padding: 1.5rem 2rem;
  text-align: center;
  color: var(--secondary-color);
  border-top: 1px solid var(--border-color);
  background: var(--card-bg);
}

@media (max-width: 640px) {
  .welcome-section h1 {
    font-size: 2rem;
  }

  .app-main {
    padding: 2rem 1rem;
  }
}
`;
}

/**
 * 生成 package.json 配置文件内容
 */
function generatePackageJson(name: string): string {
  const pkg = {
    name: name,
    version: '0.1.0',
    type: 'module',
    private: true,
    scripts: {
      dev: 'lytx dev',
      build: 'lytx build',
      preview: 'lytx preview',
    },
    dependencies: {
      '@lytjs/lytjs': 'latest',
    },
    devDependencies: {
      '@lytjs/cli': 'latest',
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
  return `# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
*.log
npm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env.local
.env.*.local

# Cache
*.cache
.cache/
`;
}

/**
 * 生成 README.md 文档文件内容
 */
function generateReadme(name: string): string {
  return `# ${name}

这是一个使用 [Lyt.js](https://gitee.com/lytjs/lytjs) 框架创建的项目。

## 特性

- ⚡ **零依赖** - 纯原生实现，不依赖任何第三方库
- 🚀 **超轻量** - 核心仅 34.56KB，极速加载
- 🎨 **Vue 3 兼容** - API 高度兼容，迁移成本低
- 🔧 **开箱即用** - 内置路由、状态管理、组件库

## 快速开始

### 安装依赖

\`\`\`bash
npm install
\`\`\`

### 启动开发服务器

\`\`\`bash
npm run dev
\`\`\`

### 构建生产版本

\`\`\`bash
npm run build
\`\`\`

## 项目结构

\`\`\`
${name}/
├── index.html          # HTML 入口
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript 配置
├── src/
│   ├── main.ts         # 应用入口
│   ├── App.ts          # 根组件
│   └── style.css       # 全局样式
└── README.md           # 项目文档
\`\`\`

## 学习资源

- 📖 [Lyt.js 官方文档](https://gitee.com/lytjs/lytjs)
- 💡 [快速开始指南](https://gitee.com/lytjs/lytjs)
- 🔧 [API 参考](https://gitee.com/lytjs/lytjs)

## 社区支持

- 🌐 Gitee: [https://gitee.com/lytjs/lytjs](https://gitee.com/lytjs/lytjs)
- 💬 Issues: [https://gitee.com/lytjs/lytjs/issues](https://gitee.com/lytjs/lytjs/issues)

## License

MIT
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
    {
      filePath: 'README.md',
      content: generateReadme(name),
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
