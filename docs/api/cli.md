# CLI 工具 API 参考

## 安装

```bash
pnpm add -D @lytjs/cli
```

## 命令

### lytjs create [项目名称]

创建一个新的 LytJS 项目。

**选项**

- `--template` - 项目模板 (default, minimal, ssr)
- `--force` - 覆盖现有目录

### lytjs add <类型> <名称>

生成组件、页面或状态管理模块。

**类型**

- component - 生成 .lyt 组件
- page - 生成页面组件
- store - 生成状态管理模块

**示例**

```bash
lytjs add component Button
lytjs add page About
lytjs add store user
```

### lytjs dev

启动开发服务器。

**选项**

- `--port` - 服务器端口
- `--host` - 服务器主机
- `--open` - 在浏览器中打开

### lytjs build

构建生产版本。

**选项**

- `--outDir` - 输出目录
- `--ssr` - 构建 SSR 版本
- `--minify` - 压缩输出

### lytjs test

使用 Vitest 运行测试。

**选项**

- `--watch` - 监听模式
- `--coverage` - 生成覆盖率报告
- `--grep` - 按模式过滤测试

### lytjs templates

列出可用的项目模板。
