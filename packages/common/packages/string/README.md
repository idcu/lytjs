# @lytjs/common-string

字符串处理工具函数集合。

## 安装

```bash
pnpm add @lytjs/common-string
```

## 使用示例

```typescript
import {
  kebabCase,
  camelCase,
  pascalCase,
  escapeHTML,
  truncate,
  template,
  normalizeClass,
  generateId,
  formatBytes,
} from '@lytjs/common-string';

kebabCase('helloWorld'); // 'hello-world'
camelCase('hello-world'); // 'helloWorld'
pascalCase('hello-world'); // 'HelloWorld'
escapeHTML('<b>x</b>'); // '&lt;b&gt;x&lt;/b&gt;'
truncate('Hello world', 8); // 'Hello...'
template('Hello {name}', { name: 'LytJS' }); // 'Hello LytJS'
normalizeClass(['a', { b: true }, null]); // 'a b'
generateId('btn'); // 'btn-3f2a1c9e'
formatBytes(1536); // '1.5 KB'
```

## API

按功能分组如下：

### 命名转换

| 函数                | 说明                    |
| ------------------- | ----------------------- |
| `capitalize(str)`   | 首字母大写              |
| `kebabCase(str)`    | 转换为 kebab-case       |
| `camelCase(str)`    | 转换为 camelCase        |
| `pascalCase(str)`   | 转换为 PascalCase       |
| `camelToKebab(str)` | camelCase 转 kebab-case |
| `kebabToCamel(str)` | kebab-case 转 camelCase |

### 转义与安全

| 函数                                                         | 说明                                                           |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| `escapeRegExp(str)`                                          | 转义正则表达式特殊字符                                         |
| `escapeHTML(str)`                                            | 转义 HTML 特殊字符                                             |
| `escapeAttrValue(str)`                                       | 转义属性值上下文中的危险字符（相对 `escapeHTML` 额外覆盖 `=`） |
| `unescapeHTML(str)`                                          | 反转义 HTML 特殊字符                                           |
| `sanitizeHTML` / `DANGEROUS_EVENT_ATTRS` / `isSafeAttribute` | 从 `@lytjs/common-security` 转出，保持向后兼容                 |

### 字符串操作

| 函数                              | 说明             |
| --------------------------------- | ---------------- |
| `trim(str)`                       | 去除首尾空白字符 |
| `trimChars(str, chars)`           | 去除首尾指定字符 |
| `repeat(str, count)`              | 重复字符串 n 次  |
| `padStart(str, length, fillStr?)` | 在字符串开头填充 |
| `padEnd(str, length, fillStr?)`   | 在字符串末尾填充 |

### 检查与提取

| 函数                                 | 说明                              |
| ------------------------------------ | --------------------------------- |
| `startsWith(str, prefix, position?)` | 检查是否以指定前缀开头            |
| `endsWith(str, suffix)`              | 检查是否以指定后缀结尾            |
| `includes(str, searchStr)`           | 检查是否包含子串                  |
| `split(str, separator)`              | 分割字符串                        |
| `words(str)`                         | 将字符串拆分为单词数组            |
| `substring(str, start, end?)`        | 提取子串                          |
| `truncate(str, length, omission?)`   | 截断字符串                        |
| `template(str, data)`                | 简单模板引擎，使用 `{key}` 占位符 |

### 样式与模板规范化

| 函数                          | 说明                                            |
| ----------------------------- | ----------------------------------------------- |
| `normalizeClass(value)`       | 规范化 class 值（支持字符串、数组、对象）       |
| `normalizeStyle(value)`       | 规范化 style 值，返回 CSS 字符串                |
| `normalizeStyleObject(value)` | 规范化 style 值，返回对象形式（用于 vdom diff） |

### HTML 相关常量

| 导出                 | 说明                                      |
| -------------------- | ----------------------------------------- |
| `VOID_ELEMENTS`      | HTML void elements 集合（允许自闭合标签） |
| `BOOLEAN_ATTRS`      | HTML 布尔属性集合                         |
| `isBooleanAttr(key)` | 判断是否为 HTML 布尔属性                  |

### 工具函数

| 函数                   | 说明                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| `escapeHtml`           | `escapeHTML` 的别名导出                                          |
| `parseDuration(value)` | 解析 CSS 时长字符串为毫秒数，支持逗号分隔的多个值（取最大值）    |
| `generateId(prefix?)`  | 生成唯一 ID，优先使用 `crypto.randomUUID`，回退到计数器 + 时间戳 |
| `formatBytes(bytes)`   | 将字节数格式化为人类可读字符串（如 `"1.5 MB"`）                  |

## 相关包

- [@lytjs/common](../../README.md) - LytJS 通用工具聚合包

## 许可证

[MIT](../../../../LICENSE)
