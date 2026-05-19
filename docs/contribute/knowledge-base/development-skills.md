# 开发技能模板

> 本文档包含 LytJS 项目的 AI 辅助开发技能模板
>
> **注意**: 完整开发流程请参考 [开发流程指南](./WORKFLOW.md)

---

## 说明

本文档提供具体的技能模板，涵盖常见开发场景的操作步骤。这些模板是对 [开发流程指南](./WORKFLOW.md) 的补充，提供更具体的操作细节。

---

## Skill 1: 添加新测试用例

**适用场景**: 为已有模块补充测试覆盖

**模板**:

```typescript
// packages/{module}/tests/{feature}.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { functionName } from '../src/{source-file}';

describe('{feature}', () => {
  beforeEach(() => {
    // 初始化
  });

  it('应正确处理基本场景', () => {
    // Arrange
    const input = ...;
    // Act
    const result = functionName(input);
    // Assert
    expect(result).toBe(expected);
  });

  it('应处理边界情况', () => {
    // 边界条件测试
  });

  it('应正确处理错误输入', () => {
    // 错误处理测试
  });
});
```

**注意事项**:

- vdom 包测试需要使用 `--config packages/vdom/vitest.config.ts` 指定 jsdom 环境
- mock 外部依赖时使用 `vi.mock()`
- 使用 `vi.fn()` 创建 spy
- 如遇路径别名问题，可直接导入构建后的 CJS 文件
- **UI 组件测试注意事项**：
  - 先查看组件实际实现，确认 props 名称和默认值，避免假设
  - 对于函数返回的默认值（如 Array、Object），只需验证函数存在，不要比较返回值
  - 对于可能为 undefined 的默认值，使用 `toBeUndefined()` 而非 `toBe('')` 或 `toBe(0)`
  - 组件测试应覆盖：基本渲染、props 定义、默认值、导出正确性等基本检查

---

## Skill 2: 创建新生态系统包

**适用场景**: 在 packages/ecosystem/packages/ 下创建新包

**步骤**:

1. 创建目录结构：`src/`, `tests/`, `package.json`, `tsconfig.json`, `tsup.config.ts`
2. package.json 中声明 workspace 依赖
3. tsup.config.ts 启用 `dts: true`
4. 在 src/index.ts 中统一导出
5. 编写测试文件
6. 在根 vitest.config.ts 中添加别名（如需）
7. 在根 package.json 中添加构建脚本
8. 更新 pnpm-workspace.yaml

**包模板**:

```json
{
  "name": "@lytjs/{package-name}",
  "version": "6.4.0",
  "type": "module",
  "main": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "import": "./dist/index.mjs", "types": "./dist/index.d.ts" }
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "dev": "tsup --watch"
  }
}
```

---

## Skill 3: 修复测试失败

**适用场景**: 测试运行失败时的排查流程

**排查步骤**:

1. 确认测试环境（node vs jsdom）
2. 检查 vitest 配置（根目录 vs 包目录）
3. 确认依赖包已构建（`pnpm build`）
4. 检查 mock 是否正确
5. 检查 API 签名是否与源码一致
6. 如遇路径别名问题，尝试直接导入构建后文件

**常见问题**:

- `document is not defined` → 需要使用 jsdom 环境
- `Cannot find module` → 需要先构建依赖包
- `process is not defined` → vitest 与 Node.js 版本兼容性问题
- 子路径导出无法解析 → 使用 require() 导入构建后文件

---

## Skill 4: DevTools 功能开发

**适用场景**: 扩展 DevTools 功能

**架构说明**:

- `ecosystem/devtools`: 轻量级内嵌面板，面向开发者快速调试
- `tools/devtools`: 浏览器扩展后端，提供高级调试能力

**开发指南**:

- ecosystem 版本：直接修改 `src/devtools.ts` 中的面板渲染逻辑
- tools 版本：在对应子模块（signals/events/snapshots/panel/\*）中添加功能
- 新增功能需同步更新 `src/index.ts` 导出和测试文件

---

## Skill 5: 创建官方插件

**适用场景**: 在 packages/plugins/packages/ 下创建新官方插件

**步骤**:

1. 使用 PLUGIN_DEVELOPMENT.md 中提供的模板创建插件
2. 确保包名格式为 `@lytjs/plugin-{name}`
3. 使用 definePlugin() API 实现插件功能
4. 添加配置验证 schema
5. 基于 common-is、common-constants 等工具实现，零第三方依赖
6. 编写完整测试（使用 require() 导入构建后文件）
7. 在 packages/plugins/packages/index.ts 中统一导出
8. 更新根 package.json 的 build:plugins 脚本
9. 更新插件文档 README.md

**测试技巧**:

```typescript
const pluginModule = require('../dist/index.cjs');

describe('@lytjs/plugin-{name}', () => {
  it('应导出默认插件', () => {
    expect(pluginModule.default).toBeDefined();
  });

  it('应导出主要工具函数', () => {
    expect(pluginModule.someFunction).toBeDefined();
  });
});
```

---

## Skill 6: 包迁移与重构

**适用场景**: 将包从一个目录移动到另一个目录（如从 ecosystem 迁移到 plugins）

**步骤**:

1. 复制目标包的完整目录结构
2. 重命名包名（如从 `@lytjs/i18n` 到 `@lytjs/plugin-i18n`）
3. 更新 package.json 中的 name、repository、keywords 等字段
4. 统一构建脚本和测试脚本风格
5. 更新所有引用该包的地方（导入语句、文档等）
6. 在根 package.json 中更新构建脚本
7. 删除旧的包目录
8. 运行构建和测试验证
9. 更新 pnpm-workspace.yaml

**验证检查**:

- [ ] 构建成功，无类型错误
- [ ] 所有测试通过
- [ ] 零依赖规范检查通过
- [ ] 文档已更新
- [ ] 无残留的旧包引用

---

## Skill 7: 创建工程化工具脚本

**适用场景**: 开发项目级别的脚本工具（如零依赖检查、版本同步等）

**步骤**:

1. 在 `scripts/` 目录下创建新脚本
2. 使用 Node.js 原生 API，零第三方依赖
3. 在 package.json 中添加对应脚本命令
4. 编写脚本的测试用例（可选）
5. 更新文档加入新命令

**零依赖检查脚本示例**:

```typescript
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// 扫描指定目录下的所有 package.json
// 检查 dependencies 是否只包含 @lytjs/* 包
// 发现违规时提供清晰报告并退出
```

---

**文档版本**: v1.0  
**最后更新**: 2026-05-16  
**维护者**: LytJS Team
