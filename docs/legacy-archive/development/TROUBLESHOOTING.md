# 常见问题排查指南

> 本文档包含 LytJS 项目开发过程中常见问题的解决方案

## Husky 钩子导致内存不足

```bash
# 跳过 husky 钩子提交
git commit --no-verify -m "fix: 修复 xxx 问题"
```

## 类型检查失败

```bash
# 1. 确保已安装依赖
pnpm install

# 2. 检查具体错误
pnpm type-check

# 3. 查看 tsconfig.json 配置
```

## 构建失败

常见原因：

- 缺少依赖：重新运行 `pnpm install`
- 类型错误：运行 `pnpm type-check`
- tsup 配置：检查 `tsup.config.ts`（必须启用 `dts: true`）
- 包未迁移：检查 pnpm-workspace.yaml 是否包含新包

## 文件编码问题

```bash
# 检查文件编码
file -i filename.ts

# 转换为 UTF-8
iconv -f GBK -t UTF-8 input.ts > output.ts
```

## 插件测试配置问题

**问题**：测试无法解析 `@lytjs/reactivity/scope` 等子路径导出

**原因**：vitest 路径别名不支持通配符子路径匹配

**解决方案**：

```typescript
// 直接导入构建后的文件而非源码
const pluginModule = require('../dist/index.cjs');
```

**步骤**：

1. 先运行 `pnpm build` 构建依赖包
2. 在测试中使用 require() 导入构建后的文件
3. 这样可以避免路径别名配置问题

## 内存不足问题

**问题**：vitest 运行大量测试时内存溢出

**解决方案**：

- 减少并发测试数量
- 分批运行测试
- 单个包目录下运行 `pnpm test` 而非全局运行
- 考虑使用 `--maxWorkers` 参数限制工作进程数

## 类型检查常见问题

### 问题 1：`Cannot find name '__DEV__'`

**解决方案**：
在包的 src 目录下创建 `env.d.ts` 文件，内容如下：

```typescript
// 全局 __DEV__ 声明
// 规范版本位于 @lytjs/shared-types/src/global.d.ts
// 此处保留直接声明以确保 tsup DTS 构建时类型可用
declare const __DEV__: boolean;
```

### 问题 2：`'xxx' is declared but its value is never read`

**解决方案**：

- 在变量名前添加下划线前缀：`const _unusedVar = ...`
- 或者删除未使用的变量

### 问题 3：找不到某个包的类型声明文件

**解决方案**：

- 先单独构建该包：`cd packages/xxx && pnpm build`
- 确保 tsup.config.ts 中启用了 `dts: true`
- 再次运行类型检查

## 大型项目 lint 检查内存问题

**问题**：`pnpm lint:check` 出现内存溢出

**解决方案**：

- 可以在单个包目录下运行 lint 检查
- 优先使用类型检查来发现代码问题
- 内存限制较大时，可以跳过全局 lint 检查，专注于单个包

---

## CLI 包发布问题（重要经验）

### 问题 1：npm bin 配置被移除

**现象**：发布 CLI 包时，npm 报告 `"bin[lyt]" script name was invalid and removed`

**原因**：

- npm 对 bin 脚本文件名有严格要求
- 当包名是 `@lytjs/cli` 但命令名是 `lyt` 时，npm 会认为配置无效
- 在 `"type": "module"` 项目中，bin 脚本需要特别注意格式

**解决方案**：

1. **创建独立的入口文件**（推荐）：

```javascript
// lyt-cli.js（放在包根目录）
#!/usr/bin/env node
require('./dist/index.cjs');
```

2. **更新 package.json**：

```json
{
  "bin": {
    "lyt": "./lyt-cli.js"
  },
  "files": ["dist", "lyt-cli.js"]
}
```

3. **确保入口文件有 shebang**：`#!/usr/bin/env node`

**验证方法**：

```bash
# 发布后安装测试
npm install -g @lytjs/cli
lyt --help
```

### 问题 2：CLI 入口不自动执行

**现象**：运行 `lyt` 命令没有输出

**原因**：

- `require.main === module` 检查在通过 bin 脚本加载时不会正确执行
- 需要在入口文件中显式调用主函数

**解决方案**：

```javascript
// lyt-cli.js
#!/usr/bin/env node
const { runCli } = require('./dist/index.cjs');
runCli().catch(console.error);
```

```typescript
// src/index.ts
export async function runCli(): Promise<void> {
  // CLI 逻辑
}

// 仅在直接运行时执行（可选）
if (require.main === module) {
  runCli().catch(console.error);
}
```

### 问题 3：tsup 多配置冲突

**现象**：构建后只生成部分文件

**原因**：

- 多个 tsup 配置中的 `clean: true` 会清除之前配置生成的文件

**解决方案**：合并为单一配置

```typescript
// tsup.config.ts
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    create: 'src/create.ts',
    lyt: 'src/index.ts', // CLI 入口
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node', // 添加 shebang
  },
});
```

### 问题 4：logger 工具函数返回值问题

**现象**：帮助信息中出现 `undefined`

**原因**：

- `logger.bold()` 等函数直接调用 `console.log()` 而不是返回字符串

**解决方案**：

```typescript
// ❌ 错误：直接输出
bold(message: string): void {
  console.log(colorize(message, 'bright'));
}

// ✅ 正确：返回字符串
bold(message: string): string {
  return colorize(message, 'bright');
}
```

### 问题 5：npm unpublish 后无法重新发布相同版本

**现象**：`You cannot publish over the previously published versions: 6.0.0`

**原因**：

- npm 安全限制：unpublish 后 24 小时内不能重新发布相同版本号
- 防止恶意替换已发布的包

**解决方案**：

1. **等待 24 小时后发布**（推荐）
2. **使用新版本号**（如 6.0.36）

**批量撤销版本脚本**：

```javascript
// unpublish-all.mjs
import { execSync } from 'child_process';

const versions = ['6.0.1', '6.0.2' /* ... */];

for (const version of versions) {
  try {
    execSync(
      `npm unpublish @lytjs/cli@${version} --force --//registry.npmjs.org/:_authToken=YOUR_TOKEN`,
    );
    console.log(`✓ Unpublished @lytjs/cli@${version}`);
  } catch {
    console.log(`✗ Failed to unpublish @lytjs/cli@${version}`);
  }
}
```

### CLI 发布最佳实践

1. **发布前检查清单**：
   - [ ] package.json 版本号正确
   - [ ] bin 配置指向正确的入口文件
   - [ ] 入口文件有 shebang（`#!/usr/bin/env node`）
   - [ ] files 字段包含所有必要文件
   - [ ] 已运行 `npx tsup` 构建
   - [ ] 本地测试 `node dist/index.cjs --help` 正常

2. **发布命令**：

   ```bash
   npm publish --access public --registry https://registry.npmjs.org/ --//registry.npmjs.org/:_authToken=YOUR_TOKEN
   ```

3. **发布后验证**：

   ```bash
   npm uninstall -g @lytjs/cli
   npm install -g @lytjs/cli@VERSION
   lyt --help
   ```

4. **遇到问题时的排查步骤**：
   - 检查 npm 上的包内容：`npm view @lytjs/cli`
   - 检查全局安装位置：`npm root -g`
   - 检查 bin 文件内容：`cat $(npm root -g)/@lytjs/cli/lyt-cli.js`
   - 手动运行入口文件：`node $(npm root -g)/@lytjs/cli/dist/index.cjs --help`

---

## 项目状态检查最佳实践

在开始新的开发任务前，建议按以下顺序检查项目状态：

1. **Git 状态检查**

   ```bash
   git status
   git branch
   ```

   - 确保工作区干净
   - 确认当前分支正确

2. **类型检查**

   ```bash
   pnpm type-check
   ```

   - 这是最快速验证代码健康状态的方式
   - 优先于完整的构建和测试

3. **关键包测试验证**
   - 对于核心包（reactivity、vdom、core），优先运行其单独测试
   - 不必每次都运行所有测试，节省时间

4. **构建验证（可选）**
   - 只有在修改了构建相关配置或新增包时才需要完整构建

---

## 处理大型测试套件的技巧

### 并行测试注意事项

- 当测试数量很大时，Vitest 可能出现内存警告
- 这通常是环境问题，不影响实际功能
- 可以通过单个包目录运行测试来避免

### 测试警告分类

- **source map 警告**：通常是 Vite 配置问题，不影响功能
- **预期警告**：很多测试特意验证错误处理场景，这些警告是预期的
- 学会区分真正的错误和预期的警告输出

### 测试覆盖率提升策略

- 优先保证核心模块的高覆盖率（reactivity、vdom、core）
- UI 组件优先保证交互和 props 测试
- 插件测试优先保证 API 稳定性和主要功能

---

**文档版本**: v1.0  
**最后更新**: 2026-05-16  
**维护者**: LytJS Team
