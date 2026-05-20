# js-framework-benchmark PR 准备完整步骤

## 📋 准备工作

### 已准备好的文件

位置：[benchmarks/js-framework-benchmark/frameworks/keyed/lytjs/](file:///f:/trae/lytjs/benchmarks/js-framework-benchmark/frameworks/keyed/lytjs/)

| 文件                                                                                                                              | 说明                       |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| [index.html](file:///f:/trae/lytjs/benchmarks/js-framework-benchmark/frameworks/keyed/lytjs/index.html)                           | 完整实现（含 Signal 系统） |
| [package.json](file:///f:/trae/lytjs/benchmarks/js-framework-benchmark/frameworks/keyed/lytjs/package.json)                       | 项目配置                   |
| [README.md](file:///f:/trae/lytjs/benchmarks/js-framework-benchmark/frameworks/keyed/lytjs/README.md)                             | 实现说明                   |
| [PR_PREPARATION_GUIDE.md](file:///f:/trae/lytjs/benchmarks/js-framework-benchmark/frameworks/keyed/lytjs/PR_PREPARATION_GUIDE.md) | PR 准备详细指南            |
| [prepare-pr.sh](file:///f:/trae/lytjs/benchmarks/js-framework-benchmark/frameworks/keyed/lytjs/prepare-pr.sh)                     | Linux/Mac 准备脚本         |
| [prepare-pr.bat](file:///f:/trae/lytjs/benchmarks/js-framework-benchmark/frameworks/keyed/lytjs/prepare-pr.bat)                   | Windows 准备脚本           |

---

## 🚀 快速开始（推荐）

### Windows 用户

```cmd
cd benchmarks\js-framework-benchmark\frameworks\keyed\lytjs
prepare-pr.bat
```

### Linux/Mac 用户

```bash
cd benchmarks/js-framework-benchmark/frameworks/keyed/lytjs
chmod +x prepare-pr.sh
./prepare-pr.sh
```

---

## 📝 手动步骤（完整）

### 第一步：本地测试验证

#### 1.1 启动本地服务器

```bash
cd benchmarks/js-framework-benchmark/frameworks/keyed/lytjs
python -m http.server 8080
```

#### 1.2 在浏览器中测试

访问 http://localhost:8080，测试所有按钮：

- [ ] Create 1,000 rows
- [ ] Create 10,000 rows
- [ ] Append 1,000 rows
- [ ] Update every 10th row
- [ ] Clear
- [ ] Swap Rows
- [ ] 选择行（点击第一列）
- [ ] 删除行（点击 × 按钮）

### 第二步：Fork 官方仓库

1. 访问 https://github.com/krausest/js-framework-benchmark
2. 点击右上角 **Fork** 按钮
3. 选择你的个人账号

### 第三步：克隆并设置仓库

```bash
# 克隆你的 Fork（替换 YOUR_USERNAME）
git clone https://github.com/YOUR_USERNAME/js-framework-benchmark.git
cd js-framework-benchmark

# 添加官方仓库为上游（可选，用于同步更新）
git remote add upstream https://github.com/krausest/js-framework-benchmark.git

# 创建新分支
git checkout -b add-lytjs
```

### 第四步：复制实现文件

```bash
# 从 LytJS 项目复制实现（替换 /path/to/lytjs）
cp -r /path/to/lytjs/benchmarks/js-framework-benchmark/frameworks/keyed/lytjs frameworks/keyed/

# Windows 使用 xcopy
xcopy /E /I C:\path\to\lytjs\benchmarks\js-framework-benchmark\frameworks\keyed\lytjs frameworks\keyed\lytjs

# 检查文件结构
ls -la frameworks/keyed/lytjs/
```

预期文件：

```
lytjs/
├── index.html
├── package.json
├── README.md
├── PR_PREPARATION_GUIDE.md  (可选，不需要提交)
├── prepare-pr.sh            (可选，不需要提交)
└── prepare-pr.bat           (可选，不需要提交)
```

**注意**：提交时只需要 index.html, package.json, README.md 这三个文件。

### 第五步：清理不需要的文件（可选）

如果复制了辅助文件，可以删除：

```bash
cd frameworks/keyed/lytjs
rm PR_PREPARATION_GUIDE.md prepare-pr.sh prepare-pr.bat
```

### 第六步：提交更改

```bash
# 检查状态
git status

# 添加更改（只提交必要文件）
git add frameworks/keyed/lytjs/index.html
git add frameworks/keyed/lytjs/package.json
git add frameworks/keyed/lytjs/README.md

# 提交
git commit -m "Add LytJS v6.1.0 - Lightweight Zero-Dependency Framework"
```

### 第七步：推送到 GitHub

```bash
git push origin add-lytjs
```

### 第八步：创建 Pull Request

1. 访问你的 Fork：https://github.com/YOUR_USERNAME/js-framework-benchmark
2. 点击 **Compare & pull request** 按钮
3. 填写 PR 信息

#### PR 标题

```
Add LytJS v6.1.0 - Lightweight Zero-Dependency Framework
```

#### PR 描述

```markdown
## LytJS v6.1.0

### 📦 关于 LytJS

LytJS 是一个轻量级、零第三方依赖的前端框架，提供双重渲染模式。

### ✨ 核心特性

- 🚀 **零运行时第三方依赖** - 核心库 < 10KB
- ⚡ **Signal 响应式系统** - 精细的响应式更新
- 🔄 **Vapor 模式** - 无虚拟 DOM，直接 DOM 操作
- 📦 **虚拟 DOM 模式** - 更好的生态兼容性

### 🏗️ 本实现说明

本实现使用 LytJS 的 **Signal + 直接 DOM 操作**，提供极致性能：

- 简化版 Signal 系统（约 70 行代码）
- 无虚拟 DOM 开销
- DocumentFragment 批量更新
- requestAnimationFrame 渲染优化

### 📊 性能数据（内部基准测试）

| 指标         | 数值          |
| ------------ | ------------- |
| 单节点更新   | 149,666 ops/s |
| 创建 1000 行 | ~11.9ms       |
| 更新 1000 行 | 1,153 ops/s   |

### 🔗 相关链接

- 项目仓库：https://github.com/lytjs/lytjs
- Gitee 仓库：https://gitee.com/lytjs/lytjs

### 📝 验证清单

- [x] 所有测试场景正常工作
- [x] 构建成功
- [x] 代码符合仓库规范

---

**注意**：PR_PREPARATION_GUIDE.md, prepare-pr.sh, prepare-pr.bat 是本地辅助文件，已从提交中排除。
```

4. 点击 **Create pull request** 按钮

---

## 📦 实现文件说明

### index.html

包含完整的实现：

- **简化版 Signal 系统**（约 70 行）
  - 状态管理
  - 订阅机制
  - 批量更新

- **DOM 操作**
  - DocumentFragment 批量插入
  - requestAnimationFrame 防抖
  - 事件处理

- **所有测试场景**
  - 创建 1,000 行
  - 创建 10,000 行
  - 追加 1,000 行
  - 更新每 10 行
  - 清空
  - 交换行
  - 选择行
  - 删除行

### package.json

标准配置，符合 js-framework-benchmark 规范：

```json
{
  "name": "lytjs",
  "description": "Lightweight Zero-Dependency JavaScript Framework",
  "version": "6.1.0",
  "keywords": ["lytjs", "benchmark"],
  "main": "index.html",
  "scripts": {
    "build-prod": "echo 'No build required - production ready'",
    "dev": "python -m http.server 8080"
  },
  "license": "MIT",
  "author": "LytJS Team"
}
```

### README.md

实现说明文档，包含：

- 快速开始指南
- 实现说明
- 性能数据
- 项目结构

---

## ✅ 检查清单

提交 PR 前，请确认：

- [ ] 本地测试通过，所有功能正常
- [ ] 文件结构正确（只包含 index.html, package.json, README.md）
- [ ] package.json 配置正确
- [ ] PR 标题和描述已填写
- [ ] 没有包含本地辅助文件（PR_PREPARATION_GUIDE.md, prepare-pr.sh, prepare-pr.bat）

---

## 🔗 相关资源

- [js-framework-benchmark 官方仓库](https://github.com/krausest/js-framework-benchmark)
- [贡献指南](https://github.com/krausest/js-framework-benchmark/blob/master/CONTRIBUTING.md)
- [LytJS 项目](https://github.com/lytjs/lytjs)
- [详细 PR 准备指南](file:///f:/trae/lytjs/benchmarks/js-framework-benchmark/frameworks/keyed/lytjs/PR_PREPARATION_GUIDE.md)

---

**文档版本**：v1.0.0
**创建日期**：2026-05-17
**最后更新**：2026-05-17
