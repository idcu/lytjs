# LytJS v6.1 开发计划

## 📋 开发目标

根据 [ROADMAP_NEXT_STEPS.md](docs/development/ROADMAP_NEXT_STEPS.md)，v6.1 的目标是"性能与稳定性增强"，首个任务是：

### 🎯 任务 1：性能基准测试集成

**目标**：加入 js-framework-benchmark，获得公开数据

**验收标准**：
- [ ] js-framework-benchmark 完整集成
- [ ] 性能排名进入前 3（轻量级组）
- [ ] 性能报告文档完善

**工作量估算**：2周

---

## 🔍 调研阶段

### js-framework-benchmark 简介

**js-framework-benchmark** 是前端框架性能测试的权威基准测试项目，由 Stefan Krause 创建和维护。

**测试场景**（标准 6 个场景）：
1. **create rows** - 创建 1000 行数据
2. **replace all rows** - 替换所有行
3. **partial update** - 部分更新（每行更新 10 次）
4. **select row** - 选择单行
5. **swap rows** - 交换两行
6. **remove row** - 删除一行
7. **create many rows** - 创建 10000 行数据
8. **append rows to large table** - 追加 1000 行到 10000 行表中

### 集成步骤

1. **创建框架实现**
   - 位置：`frameworks/keyed/lytjs/`
   - 必需文件：
     - `index.html` - 主页面
     - `package.json` - 依赖配置
     - `src/main.js` - 主程序入口
     - `src/app.js` - 应用逻辑
     - `build.js` 或 `vite.config.js` - 构建配置

2. **实现标准接口**
   ```javascript
   // 数据管理
   function buildData() // 生成测试数据
   function getAllRows() // 获取所有行
   function deleteRow(id) // 删除行
   function updateRow(id) // 更新行
   function insertRow() // 插入行
   function selectRow(id) // 选择行

   // 渲染
   function appendToBody() // 挂载到 DOM
   ```

3. **配置构建**
   - 支持 `keyed` 和 `non-keyed` 两种模式
   - 生成 production 构建产物
   - 确保文件在 `dist/` 目录

4. **性能优化**
   - 使用 keyed 模式（推荐）
   - 避免不必要的 DOM 操作
   - 批量更新优化
   - 虚拟列表（如需要）

---

## 📝 实现方案

### 目录结构

```
frameworks/keyed/lytjs/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.js      # 入口文件
│   ├── app.js       # 应用逻辑
│   ├── store.js     # 数据管理
│   └── style.css    # 样式
├── dist/            # 构建产物
└── README.md
```

### 关键技术点

1. **Vapor 模式优先**
   - 使用 Vapor 渲染模式获得最佳性能
   - 直接操作 DOM，减少虚拟 DOM 开销

2. **批量更新优化**
   - 合并多次更新为一次渲染
   - 使用 DocumentFragment

3. **Keyed 策略**
   - 使用唯一 ID 作为 key
   - 高效复用 DOM 节点

---

## ⏱️ 开发时间线

### 第一天：项目搭建
- [ ] 创建目录结构
- [ ] 配置 package.json
- [ ] 配置 Vite 构建
- [ ] 实现基础 HTML/CSS

### 第二天：核心功能实现
- [ ] 实现数据生成（buildData）
- [ ] 实现行渲染（createRow）
- [ ] 实现行删除（deleteRow）
- [ ] 实现行更新（updateRow）

### 第三天：完整功能
- [ ] 实现行插入（insertRow）
- [ ] 实现行选择（selectRow）
- [ ] 实现全量替换（replaceAllRows）
- [ ] 实现部分更新（partialUpdate）

### 第四天：性能优化
- [ ] 批量更新优化
- [ ] DOM 复用优化
- [ ] 内存优化

### 第五天：测试验证
- [ ] 本地基准测试
- [ ] 性能对比分析
- [ ] 提交 PR（如需要）

---

## 📊 性能目标

| 指标 | 目标 | 对比框架 |
|------|------|----------|
| **创建 1000 行** | < 100ms | Vue 3: ~150ms |
| **更新 1000 行** | < 50ms | SolidJS: ~60ms |
| **删除 1000 行** | < 50ms | Svelte: ~55ms |

---

## 🎯 成功标准

1. ✅ 成功运行所有 6 个标准场景
2. ✅ 性能排名进入轻量级组前 3
3. ✅ 代码量 < 500 行（不含框架代码）
4. ✅ 构建产物 < 20KB（gzip）

---

## 📝 经验教训记录

### 开发过程中发现的问题和解决方案

（开发过程中实时记录）

---

## 🔗 相关资源

- [js-framework-benchmark 官方仓库](https://github.com/krausest/js-framework-benchmark)
- [LytJS 官方文档](https://lytjs.dev)
- [Vapor 模式指南](docs/guides/vapor-mode.md)

---

**文档版本**: v1.0.0
**创建日期**: 2026-05-16
**维护者**: LytJS Team
