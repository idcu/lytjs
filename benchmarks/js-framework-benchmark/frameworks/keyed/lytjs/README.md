# LytJS js-framework-benchmark 实现说明

本文档说明如何使用 LytJS 的 js-framework-benchmark 实现。

## 📦 项目结构

```
benchmarks/js-framework-benchmark/frameworks/keyed/lytjs/
├── index.html                 # 主 HTML 文件
├── package.json               # 项目依赖配置
├── vite.config.js             # Vite 构建配置
├── src/
│   ├── index.js               # 主入口文件（Signal + 直接 DOM 实现）
│   ├── main.js                # Vapor 模式实现（备选）
│   └── styles.css             # 自定义样式
└── dist/                      # 构建输出目录（构建后生成）
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd benchmarks/js-framework-benchmark/frameworks/keyed/lytjs
pnpm install
```

### 2. 开发模式

```bash
pnpm dev
```

然后在浏览器中访问 http://localhost:5173/index.html

### 3. 生产构建

```bash
pnpm build
```

构建产物将生成在 `dist/` 目录中。

### 4. 预览生产构建

```bash
pnpm preview
```

## 🔧 实现说明

### 两个实现版本

本项目包含两个实现版本：

#### 1. Signal + 直接 DOM 操作（推荐，默认）

**文件**：`src/index.js`

**特点**：
- 使用 Signal 进行状态管理
- 直接操作 DOM，无虚拟 DOM 开销
- 极致性能优化
- 实现所有 6 个标准测试场景

**核心技术**：
- `signal()` - 响应式状态管理
- `signalBatch()` - 批量更新优化
- `DocumentFragment` - DOM 批量操作
- 事件委托 - 减少事件监听器数量

#### 2. Vapor 模式（备选）

**文件**：`src/main.js`

**特点**：
- 使用 LytJS Vapor 模式
- 模板驱动开发
- 更好的开发者体验

### 标准测试场景实现

| 场景 | 按钮 ID | 说明 |
|------|---------|------|
| 创建 1,000 行 | `run` | 生成 1,000 个随机数据行 |
| 创建 10,000 行 | `runlots` | 生成 10,000 个随机数据行 |
| 追加 1,000 行 | `add` | 向现有数据追加 1,000 行 |
| 更新每 10 行 | `update` | 更新每第 10 行的文本 |
| 清空表格 | `clear` | 清空所有数据 |
| 交换行 | `swaprows` | 交换第 1 行和第 998 行 |

### 数据生成

```javascript
// 生成随机 ID
let id = 1;
function generateId() {
  return id++;
}

// 生成随机字符串
const adjectives = ['pretty', 'large', 'big', /* ... */];
const colours = ['red', 'yellow', 'blue', /* ... */];
const nouns = ['table', 'chair', 'house', /* ... */];

function generateRandomString() {
  return `${adjectives[random]} ${colours[random]} ${nouns[random]}`;
}
```

## 📊 性能优化策略

### 1. 批量更新优化

使用 `signalBatch()` 包裹状态更新操作：

```javascript
function run() {
  signalBatch(() => {
    const newData = [];
    for (let i = 0; i < 1000; i++) {
      newData.push({ id: generateId(), label: generateRandomString() });
    }
    data.set(newData);
  });
}
```

### 2. DOM 操作优化

使用 `DocumentFragment` 进行批量 DOM 插入：

```javascript
const fragment = document.createDocumentFragment();
for (let i = 0; i < currentData.length; i++) {
  const tr = createRow(currentData[i]);
  fragment.appendChild(tr);
}
tbody.appendChild(fragment);
```

### 3. 渲染防抖

使用 `requestAnimationFrame` 防抖渲染：

```javascript
let isRendering = false;
function debouncedRender() {
  if (isRendering) return;
  isRendering = true;
  requestAnimationFrame(() => {
    render();
    isRendering = false;
  });
}
```

### 4. 事件监听优化

在初始化时一次性绑定所有按钮事件：

```javascript
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('run').addEventListener('click', run);
  document.getElementById('update').addEventListener('click', update);
  // ...
});
```

## 🧪 测试验证

### 本地测试

1. 启动开发服务器
2. 打开浏览器开发者工具
3. 测试各个功能按钮
4. 观察控制台是否有错误

### 性能分析

使用 Chrome DevTools 的 Performance 标签：

1. 录制页面加载和操作
2. 分析渲染性能
3. 查找瓶颈

### 内存泄漏检查

使用 Chrome DevTools 的 Memory 标签：

1. 拍摄内存快照
2. 执行操作
3. 再次拍摄快照
4. 对比查找泄漏

## 🔄 与官方 js-framework-benchmark 集成

要将此实现提交到官方仓库，请遵循以下步骤：

### 1. 克隆官方仓库

```bash
git clone https://github.com/krausest/js-framework-benchmark.git
cd js-framework-benchmark
```

### 2. 复制 LytJS 实现

```bash
cp -r /path/to/lytjs/benchmarks/js-framework-benchmark/frameworks/keyed/lytjs ./frameworks/keyed/
```

### 3. 更新配置

编辑 `package.json` 或构建脚本以包含 LytJS。

### 4. 运行测试

按照官方文档说明运行基准测试。

## 📝 开发指南

### 添加新功能

1. 在 `src/index.js` 中添加新的事件处理函数
2. 在 `index.html` 中添加对应的按钮
3. 在相应的 `data` 操作中使用 `signalBatch()`
4. 确保 `render()` 函数正确处理新状态

### 性能优化 checklist

- [ ] 使用 `signalBatch()` 进行批量更新
- [ ] 使用 `DocumentFragment` 批量插入 DOM
- [ ] 防抖或节流频繁的渲染
- [ ] 避免不必要的 DOM 查询
- [ ] 及时清理事件监听器

### 代码规范

- 遵循 LytJS 项目的编码规范
- 使用 ES6+ 语法
- 保持函数简洁，单一职责
- 添加必要的注释（中文）

## 📈 性能基准

已收集的基线性能数据请参考：
- [BASELINE_PERFORMANCE_v6.0.0.md](../BASELINE_PERFORMANCE_v6.0.0.md)
- [DEVELOPMENT_PLAN_v6.1.md](../DEVELOPMENT_PLAN_v6.1.md)

## 🤝 贡献指南

欢迎贡献！请确保：

1. 代码通过类型检查
2. 所有测试通过
3. 遵循项目编码规范
4. 更新相关文档

## 📚 相关文档

- [LytJS 官方文档](https://lytjs.dev)
- [js-framework-benchmark 官方仓库](https://github.com/krausest/js-framework-benchmark)
- [ROADMAP_NEXT_STEPS.md](../ROADMAP_NEXT_STEPS.md)

## 📄 License

与 LytJS 项目保持一致。

---

**文档版本**：v1.0.0
**最后更新**：2026-05-16
**维护者**：LytJS Team
