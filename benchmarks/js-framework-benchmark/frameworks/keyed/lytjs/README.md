# LytJS - js-framework-benchmark 实现

这是 LytJS 框架在 js-framework-benchmark 中的实现。

## 📁 文件说明

| 文件 | 用途 |
|------|------|
| [index.html](./index.html) | **官方提交版本** - Vapor 模式（正式提交使用） |
| [vdom.html](./vdom.html) | VDOM 模式 - 传统虚拟 DOM 实现 |
| [signal.html](./signal.html) | Signal 模式 - 细粒度响应式更新 |
| [compare.html](./compare.html) | **性能对比页面** - 三种模式 + 8个官方框架对比 |
| [package.json](./package.json) | 框架配置信息 |

## 🚀 使用说明

### 方法 1：本地服务器

```bash
# 启动本地服务器
python -m http.server 8080
# 或
node server.js
```

然后在浏览器中打开：
- http://localhost:8080 - Vapor 模式（官方提交）
- http://localhost:8080/compare.html - 性能对比页面

### 方法 2：直接打开文件

直接用浏览器打开对应 HTML 文件。

## 📊 LytJS 三种渲染模式

### 1️⃣ VDOM 模式

传统虚拟 DOM + keyed diff 算法实现

**特点：**
- 每次状态变化，全量协调更新
- 类似 React、Vue 3、Preact 的工作方式
- 兼容性最好，开发体验最熟悉

### 2️⃣ Vapor 模式（正式提交）

无虚拟 DOM，编译期优化的细粒度 DOM 操作

**特点：**
- 使用 keyed 协调，保留相同 key 的节点
- 类似 Vue Vapor、Solid、Svelte 的工作方式
- 性能更优，包体积更小
- **这是用于官方提交的模式**

### 3️⃣ Signal 模式

基于响应式信号的最细粒度更新

**特点：**
- 仅更新变化的数据对应的 DOM 节点
- 类似 Solid、Vue Vapor 的响应式系统
- 理论性能最优，开销最小

## 📋 官方数据对比（Chrome 148）

| 场景 | Vanilla | Vue Vapor | Solid | Svelte | Vue 3 | React | Preact | Qwik | LytJS (预期) |
|------|---------|-----------|-------|--------|-------|-------|--------|------|--------------|
| 创建 1000 行 | 20.8 | 21.8 | 21.6 | 21.8 | 32.3 | 33.8 | 23.4 | 35.6 | 20-25 |
| 更新 10% | 4.3 | 5.2 | 5.4 | 5.8 | 11.5 | 9.8 | 6.7 | 12.3 | 4-6 |
| 选择行 | 1.6 | 1.9 | 1.8 | 2.1 | 4.2 | 3.7 | 2.8 | 3.5 | 1.5-2 |
| 删除行 | 17.7 | 19.3 | 19.5 | 20.5 | 31.2 | 32.5 | 22.4 | 30.1 | 17-22 |

## 🧪 性能测试

打开 [compare.html](./compare.html) 页面可以：
1. 切换三种模式进行实时测试
2. 自动测量所有场景的性能
3. 与 8 个官方框架数据对比
4. 查看最佳性能模式

## 🏁 提交 PR

向 js-framework-benchmark 提交 PR 时，只需要：
1. 使用 [index.html](./index.html)（Vapor 模式）作为框架实现
2. 使用 [package.json](./package.json) 作为配置文件
3. 确保通过 isKeyed 测试

## 📝 相关文档

- [TEST_MANUAL.md](./TEST_MANUAL.md) - 详细的性能测试手册
- [PR_PREPARATION_GUIDE.md](./PR_PREPARATION_GUIDE.md) - PR 准备指南
- [VERIFICATION.md](./VERIFICATION.md) - 实现验证文档
