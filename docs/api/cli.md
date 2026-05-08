# @lytjs/cli

> LytJS 项目脚手架和开发 CLI 工具。

## 安装

```bash
pnpm add -D @lytjs/cli
```

## 命令

### `lytjs create <name>`

创建新的 LytJS 项目。

```bash
lytjs create my-app
lytjs create my-app --template minimal
lytjs create my-app --force
```

**选项：**

| 选项 | 说明 |
|------|------|
| `--template <name>` | 使用指定模板 |
| `--force` | 覆盖已存在的目录 |

### `lytjs dev`

启动开发服务器。

```bash
lytjs dev --port 3000 --host 0.0.0.0 --open
```

### `lytjs build`

生产构建。

```bash
lytjs build --outDir dist --ssr
```

### `lytjs test`

运行测试。

```bash
lytjs test --watch false --coverage
```

## 自动检测包管理器

CLI 会根据项目中的 lockfile 自动检测包管理器（pnpm > yarn > npm）。
