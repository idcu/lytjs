# LytJS 中文文档和编码规范指南

> 所有文档和注释统一使用中文，编码规范检查

---

## 📋 目录

- [1. 编码规范](#1-编码规范)
- [2. 文档语言规范](#2-文档语言规范)
- [3. 注释规范](#3-注释规范)
- [4. 编码检查工具](#4-编码检查工具)
- [5. 常见问题解决](#5-常见问题解决)

---

## 1. 编码规范

### 1.1 文件编码要求

**所有源文件必须使用 UTF-8 编码，无 BOM**

| 文件类型                     | 编码要求     |
| ---------------------------- | ------------ |
| `.ts`, `.tsx`, `.js`, `.jsx` | UTF-8 无 BOM |
| `.md`, `.mdx`                | UTF-8 无 BOM |
| `.json`                      | UTF-8 无 BOM |
| `.html`, `.css`, `.scss`     | UTF-8 无 BOM |

### 1.2 换行符规范

- Windows: CRLF (`\r\n`)
- Linux/macOS: LF (`\n`)

**Git 已配置自动处理**（见 .gitattributes），无需手动设置。

### 1.3 文件头部示例

```typescript
/**
 * @lytjs/包名
 * 包功能描述
 *
 * @author LytJS Team
 * @since 6.0.0
 */

// 代码开始...
```

---

## 2. 文档语言规范

### 2.1 基本原则

✅ **所有文档使用中文**，包括：

- README.md
- API 文档
- 架构文档
- 代码注释
- 提交信息

✅ **保留必要的英文术语**，如：

- API, SDK, UI, CLI
- React, Vue, TypeScript
- HTTP, JSON, URL
- 变量名、函数名（如 `ref`, `computed`）

### 2.2 术语一致性

建立统一的术语表，避免混淆：

| 推荐     | 不推荐 | 说明                 |
| -------- | ------ | -------------------- |
| 组件     | 元件   | 前端通用译法         |
| 响应式   | 反应式 | 保持与 Vue 一致      |
| 虚拟 DOM | VDOM   | 可混用，首次出现注明 |
| 钩子     | Hook   | 可混用               |
| 属性     | Props  | 可混用               |
| 插槽     | Slot   | 可混用               |

### 2.3 文档写作规范

#### 标题层级

```markdown
# 一级标题

## 二级标题

### 三级标题

#### 四级标题
```

#### 代码示例

```typescript
// ✅ 推荐：代码注释也使用中文
/**
 * 创建响应式引用
 * @param value - 初始值
 */
function ref(value) {
  /* ... */
}
```

#### 文档结构模板

```markdown
# @lytjs/包名

> 包功能简述（一句话）

## 安装

\`\`\`bash
npm install @lytjs/包名
\`\`\`

## 快速开始

\`\`\`typescript
import { ... } from '@lytjs/包名';
// 使用示例
\`\`\`

## API 参考

### 函数名

#### 参数

- `param1`: 描述
- `param2`: 描述

#### 返回值

描述

## 示例

\`\`\`typescript
// 完整示例
\`\`\`

## 相关链接

- [其他文档](../...)
- [GitHub](https://...)
```

---

## 3. 注释规范

### 3.1 JSDoc 注释规范

公共 API 必须有完整的 JSDoc 注释：

```typescript
/**
 * 创建响应式引用（Ref）
 *
 * @description
 * 将普通值包装为响应式引用对象，可通过 .value 属性访问和修改值。
 *
 * @param value - 初始值
 * @returns 响应式引用对象
 *
 * @example
 * \`\`\`typescript
 * const count = ref(0);
 * console.log(count.value); // 0
 * count.value++;
 * console.log(count.value); // 1
 * \`\`\`
 *
 * @template T - 值的类型
 * @see reactive - 创建响应式对象
 * @see computed - 创建计算属性
 */
export function ref<T>(value: T): Ref<T> {
  // 实现
}
```

### 3.2 单行注释

```typescript
// ✅ 推荐：注释使用中文
// 检查是否为空值
const isEmpty = value == null;

// ❌ 避免：英文注释
// Check if value is empty
```

### 3.3 内联注释

```typescript
// ✅ 推荐
const result = processData(input); // 处理输入数据

// 复杂逻辑分段注释
function complexAlgorithm(data: Data): Result {
  // 步骤 1: 数据验证
  if (!isValid(data)) {
    throw new Error('数据无效');
  }

  // 步骤 2: 数据预处理
  const processed = preprocess(data);

  // 步骤 3: 核心计算
  const computed = compute(processed);

  // 步骤 4: 结果格式化
  return formatResult(computed);
}
```

### 3.4 TODO 和 FIXME 注释

```typescript
// TODO: 待实现功能 - 2026-05-12
// 说明待实现的具体内容

// FIXME: 临时解决方案 - 2026-05-12
// 说明问题和更好的解决方案
```

---

## 4. 编码检查工具

### 4.1 自动检查脚本

创建 `.github/workflows/encoding-check.yml`（已存在）：

```yaml
name: Encoding Check

on: [push, pull_request]

jobs:
  check-encoding:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check file encoding
        run: |
          # 检查所有 .ts, .tsx, .js, .jsx, .md 文件编码
          echo "Checking file encoding..."

          # 检查是否有非 UTF-8 文件
          files=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.md" \) ! -path "*/node_modules/*" ! -path "*/.git/*")

          for file in $files; do
            encoding=$(file -b --mime-encoding "$file")
            if [ "$encoding" != "utf-8" ] && [ "$encoding" != "us-ascii" ]; then
              echo "ERROR: File $file has encoding $encoding, expected UTF-8"
              exit 1
            fi
          done

          echo "All files are UTF-8 encoded!"
```

### 4.2 本地检查命令

#### 检查文件编码

```bash
# 单个文件
file -i filename.ts

# 批量检查
find . -name "*.ts" -o -name "*.md" | xargs file -i
```

#### 转换文件编码

```bash
# 从 GBK 转换为 UTF-8
iconv -f GBK -t UTF-8 input.ts > output.ts

# 批量转换（谨慎使用）
find . -name "*.ts" -exec bash -c 'iconv -f GBK -t UTF-8 "$0" > "$0.tmp" && mv "$0.tmp" "$0"' {} \;
```

### 4.3 VS Code 配置

在 `.vscode/settings.json` 中添加：

```json
{
  "files.encoding": "utf8",
  "files.autoGuessEncoding": true,
  "files.eol": "\n",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[markdown]": {
    "editor.wordWrap": "on",
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## 5. 常见问题解决

### 5.1 乱码问题

#### 症状

```
- 文件打开显示乱码
- 编译出现 SyntaxError
- Git diff 显示奇怪字符
```

#### 解决步骤

1. **确认文件编码**

```bash
file -i 问题文件.ts
```

2. **转换为 UTF-8**

```bash
# 如果是 GBK
iconv -f GBK -t UTF-8 问题文件.ts > 问题文件.ts.tmp
mv 问题文件.ts.tmp 问题文件.ts

# 或者使用 VS Code：
# 右下角点击编码 -> 通过编码保存 -> UTF-8
```

3. **验证修复**

```bash
file -i 问题文件.ts
# 应该显示 charset=utf-8
```

### 5.2 Git 换行符问题

#### 症状

```
warning: LF will be replaced by CRLF in ...
```

#### 解决方案

项目已配置 `.gitattributes`，无需担心。

如需手动设置：

```bash
# Windows 用户
git config --global core.autocrlf true

# Linux/macOS 用户
git config --global core.autocrlf input
```

### 5.3 BOM 头问题

#### 症状

```typescript
// 文件开头出现 ï»¿ 或其他奇怪字符
```

#### 解决方案

```bash
# 删除 BOM（使用 sed）
sed -i '1s/^\xEF\xBB\xBF//' 文件.ts

# 或使用 VS Code：
# 右下角点击编码 -> 通过编码保存 -> UTF-8（选择"UTF-8"而不是"UTF-8 with BOM"）
```

---

## 6. 文档迁移检查清单

### 检查列表

- [ ] 所有 README.md 已使用中文
- [ ] 所有 API 文档已使用中文
- [ ] 所有代码注释已使用中文
- [ ] 所有文件编码为 UTF-8
- [ ] 所有文件无 BOM 头
- [ ] 术语使用一致
- [ ] 文档结构符合规范
- [ ] JSDoc 注释完整
- [ ] 代码示例注释为中文
- [ ] 提交信息为中文

### 快速检查脚本

创建 `scripts/check-chinese-docs.sh`：

```bash
#!/bin/bash

echo "检查中文文档和编码..."
echo "========================"

# 1. 检查编码
echo "1. 检查文件编码..."
find . -name "*.ts" -o -name "*.tsx" -o -name "*.md" | grep -v node_modules | while read file; do
  encoding=$(file -b --mime-encoding "$file")
  if [ "$encoding" != "utf-8" ] && [ "$encoding" != "us-ascii" ]; then
    echo "  ❌ $file: $encoding"
  else
    echo "  ✅ $file: $encoding"
  fi
done

echo ""
echo "检查完成！"
```

---

## 附录

### A. 常用工具推荐

| 工具       | 用途         |
| ---------- | ------------ |
| `file`     | 检查文件编码 |
| `iconv`    | 转换文件编码 |
| `dos2unix` | 转换换行符   |
| `prettier` | 格式化代码   |
| `eslint`   | 代码检查     |

### B. 参考资源

- [UTF-8 编码标准](https://www.rfc-editor.org/rfc/rfc3629)
- [中文技术文档写作规范](https://github.com/ruanyf/document-style-guide)
- [中文文案排版指北](https://github.com/sparanoid/chinese-copywriting-guidelines)

---

**文档版本**: v1.1
**最后更新**: 2026-05-14
**维护者**: LytJS Team
