# 贡献指南

感谢你对 Lyt.js 的贡献！

## 开发环境

```bash
# 安装依赖
pnpm install

# 构建
pnpm run build

# 测试
pnpm -r run test

# 单个包测试
pnpm --filter @lytjs/reactivity test
```

## 代码规范

- TypeScript 严格模式
- ESLint + Prettier
- 测试覆盖率 ≥ 80%

## 提交规范

```
<type>(<scope>): <subject>

类型: feat | fix | refactor | docs | test | chore
```

## PR 流程

1. Fork 并创建特性分支
2. 编写代码和测试
3. 确保所有测试通过
4. 提交 PR
