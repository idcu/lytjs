# 社区贡献指南

感谢你对 LytJS 的关注！我们非常欢迎并感谢社区成员的贡献。本指南将帮助你了解如何为 LytJS 项目做出贡献。

## 为什么贡献？

贡献开源项目有很多好处：

- **学习**：通过阅读源码提升技能
- **成长**：获得开源项目经验
- **社区**：结识志同道合的开发者
- **声誉**：建立个人技术影响力
- **回馈**：帮助他人使用更好的工具

## 贡献方式

### 1. 代码贡献

#### 发现 Bug？

如果你发现了 Bug，请：

1. 搜索是否已有相关 Issue
2. 如果没有，创建新的 Issue 并详细描述
3. 提供复现步骤和预期行为

#### 修复 Bug？

1. 在 Issue 中评论你将修复
2. Fork 项目并创建修复分支
3. 编写测试用例验证修复
4. 提交 PR 并等待审核

#### 实现新功能？

1. 先创建 Issue 讨论功能需求
2. 获得核心团队认可后实现
3. 提供完整的测试和文档

### 2. 文档贡献

文档贡献同样重要：

- 修复文档中的错误
- 补充缺失的内容
- 改进文档的表达
- 翻译文档到其他语言
- 编写教程和使用案例

### 3. 社区贡献

- 回答其他用户的问题
- 分享你的使用经验
- 报告和验证 Bug
- 推广 LytJS

## 开发环境

### 环境要求

- Node.js 18.0 或更高版本
- pnpm 9.0 或更高版本
- Git

### 设置开发环境

```bash
# 1. Fork 项目
git clone https://gitee.com/your-username/lytjs.git
cd lytjs

# 2. 安装依赖
pnpm install

# 3. 创建功能分支
git checkout -b feature/your-feature

# 4. 开发开发
pnpm dev

# 5. 运行测试
pnpm test
```

## 代码规范

### TypeScript 规范

- 使用严格模式
- 禁止使用 `any`（测试文件除外）
- 使用明确的类型定义
- 遵循项目命名约定

### 代码风格

- 缩进：2 空格
- 引号：单引号
- 分号：必须
- 遵循 ESLint 规则

### 提交规范

使用 Conventional Commits 格式：

```
<type>(<scope>): <描述>

type: feat | fix | docs | style | refactor | perf | test | chore
scope: reactivity | vdom | compiler | core | renderer | plugins | ...
```

示例：

```bash
git commit -m "feat(reactivity): 添加新的响应式 API"
git commit -m "fix(vdom): 修复 patch 算法的边界问题"
git commit -m "docs: 更新组件文档"
git commit -m "test: 添加 computed 测试用例"
```

## 测试要求

### 单元测试

所有新功能必须包含测试：

```typescript
describe('新功能', () => {
  it('应正确处理基本场景', () => {
    // 测试代码
  });

  it('应处理边界情况', () => {
    // 测试代码
  });
});
```

### 测试覆盖率

- 核心包（reactivity、vdom、compiler）：≥ 80%
- UI 组件：≥ 70%
- 插件：≥ 70%

## Pull Request 流程

### 1. 创建 PR

```bash
git add .
git commit -m "feat(scope): your feature description"
git push origin feature/your-feature
```

然后在 GitHub/Gitee 上创建 Pull Request。

### 2. PR 描述

请包含以下信息：

- **功能描述**：简要说明
- **相关 Issue**：链接到相关 Issue
- **测试说明**：如何测试新功能
- **破坏性变更**：如果有的话

### 3. 代码审核

- 等待核心团队审核
- 响应审核反馈
- 必要时修改代码

### 4. 合并

审核通过后，核心团队会合并你的 PR。

## 贡献者权益

### 贡献者榜单

所有贡献者都会在贡献者榜单中展示。

### Issue 优先处理

活跃贡献者的 Issue 会获得优先处理。

### 特别鸣谢

重大贡献者将在发布说明中获得特别鸣谢。

## 常见问题

### Q: 如何开始贡献？

A: 从查看 [good first issue](https://gitee.com/lytjs/lytjs/issues) 开始，这是一个适合新手的任务列表。

### Q: 我的 PR 被拒绝了怎么办？

A: 不要灰心！仔细阅读反馈，改进后重新提交。持续贡献会提高你的熟练度。

### Q: 我不确定我的想法是否合适？

A: 先在 Issue 中讨论，获得反馈后再实施。

### Q: 如何获得帮助？

A: 可以在 GitHub/Gitee 上提问，核心团队和社区会尽力帮助你。

## 资源链接

- [项目源码](https://gitee.com/lytjs/lytjs)
- [Issue 列表](https://gitee.com/lytjs/lytjs/issues)
- [官方文档](../guide/)
- [教程](../tutorial/)

## 行为准则

作为贡献者，请：

- 尊重他人，友好交流
- 接受建设性的批评
- 关注项目利益，而非个人利益
- 保持专业和耐心

感谢你的贡献！让我们一起让 LytJS 变得更好！
