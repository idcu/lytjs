# 文件放置说明 — Lyt.js 在 js-framework-benchmark 中的位置

本文档详细说明 Lyt.js 的文件需要放在 js-framework-benchmark 仓库的哪个位置。

## 目录结构总览

```
js-framework-benchmark/
├── frameworks/
│   ├── keyed/
│   │   └── lytjs/                    # Lyt.js keyed 实现
│   │       ├── package.json          # 包配置（必须包含 js-framework-benchmark 字段）
│   │       ├── tsconfig.json         # TypeScript 配置
│   │       ├── esbuild.mjs           # 构建脚本
│   │       ├── index.html            # HTML 入口（使用 bootstrap CSS）
│   │       └── src/
│   │           ├── main.ts           # keyed benchmark 主入口
│   │           └── shared.ts         # 共享工具函数
│   │
│   └── non-keyed/
│       └── lytjs/                    # Lyt.js non-keyed 实现
│           ├── package.json          # 包配置
│           ├── tsconfig.json         # TypeScript 配置
│           ├── esbuild.mjs           # 构建脚本
│           ├── index.html            # HTML 入口
│           └── src/
│               ├── main.ts           # non-keyed benchmark 主入口
│               └── shared.ts         # 共享工具函数
│
├── css/                              # benchmark 提供的 bootstrap CSS
│   └── bootstrap.min.css
│
└── webdriver-ts/                     # WebDriver 测试（可选，用于自定义测试）
```

## 各文件详细说明

### 1. `frameworks/keyed/lytjs/package.json`

**用途**: npm 包配置，定义构建脚本和 benchmark 元数据。

**关键字段**:
- `name`: `"lytjs"`
- `scripts.build-prod`: 生产构建命令（**必须**）
- `js-framework-benchmark.frameworkHomeURL`: 框架官网 URL
- `js-framework-benchmark.customURL`: 是否使用自定义 URL（通常为 `false`）

**来源**: 基于 `benchmarks/js-framework-benchmark/lytjs/package.json` 修改

### 2. `frameworks/keyed/lytjs/tsconfig.json`

**用途**: TypeScript 编译配置。

**要求**:
- `target`: `"ES2020"` 或更高
- `module`: `"ESNext"`
- `strict`: `true`

**来源**: 基于 `benchmarks/js-framework-benchmark/lytjs/tsconfig.json` 修改

### 3. `frameworks/keyed/lytjs/esbuild.mjs`

**用途**: 构建脚本，将 TypeScript 源码打包为单个 JS 文件。

**要求**:
- 输出格式: ESM (`format: 'esm'`)
- 目标: `es2020`
- 生产模式必须启用 minify
- 必须将所有依赖打包为单文件（bundle: true）

**来源**: 基于 `benchmarks/js-framework-benchmark/build-benchmark-bundle.js` 修改

### 4. `frameworks/keyed/lytjs/index.html`

**用途**: HTML 入口页面，包含 benchmark 所需的按钮和表格结构。

**关键要求**:
- 必须引用 `../../css/bootstrap.min.css`（benchmark 提供的 CSS）
- 按钮的 `id` 必须与 benchmark 要求一致
- 表格的 `id` 必须为 `"main"`
- 必须通过 `<script>` 标签加载构建产物

**按钮 ID 列表**:
| ID | 功能 |
|----|------|
| `run` | 创建 1,000 行 |
| `runlots` | 创建 10,000 行 |
| `add` | 追加 1,000 行 |
| `update` | 更新每第 10 行 |
| `clear` | 清空表格 |
| `swaprows` | 交换行 |

**来源**: 基于 `benchmarks/js-framework-benchmark/lytjs/index.html` 修改

### 5. `frameworks/keyed/lytjs/src/main.ts`

**用途**: Keyed benchmark 的主实现文件。

**必须导出的函数**:
- `createElement(id: string)` — 创建 benchmark 实例
- `runBenchmark()` — 创建 1,000 行
- `addRow()` — 添加一行
- `updateEvery10thRow()` — 更新每第 10 行
- `swapRows()` — 交换第 1 行和第 2 行
- `removeRow()` — 删除最后一行
- `selectRow(index: number)` — 选中指定行

**来源**: `benchmarks/js-framework-benchmark/lytjs/src/keyed-signal.ts`

### 6. `frameworks/keyed/lytjs/src/shared.ts`

**用途**: 共享工具函数（数据生成、ID 管理等）。

**来源**: `benchmarks/js-framework-benchmark/lytjs/src/shared.ts`

### 7. `frameworks/non-keyed/lytjs/` 目录

结构与 keyed 实现相同，唯一区别是 `src/main.ts` 使用 non-keyed 实现。

**来源**: `benchmarks/js-framework-benchmark/lytjs/src/non-keyed-signal.ts`

## 文件映射关系

| Lyt.js 源文件 | js-framework-benchmark 目标位置 |
|---------------|-------------------------------|
| `lytjs/src/keyed-signal.ts` | `frameworks/keyed/lytjs/src/main.ts` |
| `lytjs/src/non-keyed-signal.ts` | `frameworks/non-keyed/lytjs/src/main.ts` |
| `lytjs/src/shared.ts` | `frameworks/keyed/lytjs/src/shared.ts` |
| `lytjs/src/shared.ts` | `frameworks/non-keyed/lytjs/src/shared.ts` |
| `lytjs/index.html` | `frameworks/keyed/lytjs/index.html`（需修改） |
| `lytjs/index.html` | `frameworks/non-keyed/lytjs/index.html`（需修改） |

## HTML 模板

以下是符合 js-framework-benchmark 要求的 HTML 模板：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lyt.js</title>
  <link rel="stylesheet" href="../../css/bootstrap.min.css">
</head>
<body>
  <div class="container">
    <div class="jumbotron">
      <div class="row">
        <div class="col-md-6">
          <h1>Lyt.js</h1>
        </div>
        <div class="col-md-6">
          <div class="row">
            <div class="col-sm-6 small">
              <div class="form-group">
                <label for="run">Create 1,000 rows</label>
                <button type="button" class="btn btn-primary btn-block" id="run">Create 1,000 rows</button>
              </div>
              <div class="form-group">
                <label for="runlots">Create 10,000 rows</label>
                <button type="button" class="btn btn-primary btn-block" id="runlots">Create 10,000 rows</button>
              </div>
              <div class="form-group">
                <label for="add">Append 1,000 rows</label>
                <button type="button" class="btn btn-primary btn-block" id="add">Append 1,000 rows</button>
              </div>
            </div>
            <div class="col-sm-6 small">
              <div class="form-group">
                <label for="update">Update every 10th row</label>
                <button type="button" class="btn btn-primary btn-block" id="update">Update every 10th row</button>
              </div>
              <div class="form-group">
                <label for="clear">Clear</label>
                <button type="button" class="btn btn-primary btn-block" id="clear">Clear</button>
              </div>
              <div class="form-group">
                <label for="swaprows">Swap Rows</label>
                <button type="button" class="btn btn-primary btn-block" id="swaprows">Swap Rows</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <table class="table table-striped table-bordered">
      <tbody id="main"></tbody>
    </table>
  </div>
  <script type="module" src="dist/main.js"></script>
</body>
</html>
```

## 注意事项

1. **CSS 引用路径**: keyed 实现使用 `../../css/bootstrap.min.css`，non-keyed 实现也使用 `../../css/bootstrap.min.css`
2. **脚本加载**: 使用 `<script type="module" src="dist/main.js"></script>` 加载构建产物
3. **不要修改按钮 ID**: benchmark 的 WebDriver 测试依赖这些 ID
4. **不要修改表格 ID**: `<tbody id="main">` 是固定的
5. **构建产物路径**: 必须输出到 `dist/main.js`
