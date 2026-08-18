# @lytjs/common-path

路径处理工具函数集合，提供规范化、拼接、解析与模式匹配能力。

## 安装

```bash
pnpm add @lytjs/common-path
```

## 使用示例

```typescript
import {
  normalizePath,
  joinPath,
  dirname,
  basename,
  extname,
  parsePath,
  pathToRegex,
  matchPath,
  isAbsolute,
  isRelative,
  resolvePath,
} from '@lytjs/common-path';

normalizePath('a\\b//c/'); // 'a/b/c'
joinPath('/a', 'b', ''); // '/a/b'
dirname('/a/b/c.txt'); // '/a/b'
basename('/a/b/c.txt'); // 'c.txt'
extname('/a/b/c.txt'); // '.txt'
isAbsolute('/a/b'); // true
isRelative('a/b'); // true

const match = matchPath('/user/:id', '/user/42');
// match = { params: { id: '42' } }
```

## API 说明

### 基础操作

| 函数                    | 说明                                   |
| ----------------------- | -------------------------------------- |
| `normalizePath(path)`   | 统一使用正斜杠，去除重复斜杠和末尾斜杠 |
| `joinPath(...segments)` | 拼接路径段并规范化                     |
| `dirname(path)`         | 获取目录名                             |
| `basename(path)`        | 获取文件名（含扩展名）                 |
| `extname(path)`         | 获取文件扩展名（含点号）               |
| `parsePath(path)`       | 解析路径为 `{ dir, base, name, ext }`  |
| `resolvePath(from, to)` | 从基准路径解析目标路径                 |
| `isAbsolute(path)`      | 是否绝对路径                           |
| `isRelative(path)`      | 是否相对路径                           |

### 模式匹配

`pathToRegex(pattern)` 将路径模式转换为正则表达式，支持：

- `:param` 必选参数
- `:param?` 可选参数
- `*` 通配符

`matchPath(pattern, path)` 匹配路径并提取参数，返回 `PathMatchResult | null`：

```typescript
import { matchPath } from '@lytjs/common-path';

matchPath('/user/:id?/detail', '/user/detail'); // { params: {} }
matchPath('/user/:id?/detail', '/user/42/detail'); // { params: { id: '42' } }
matchPath('/files/*', '/files/a/b.txt'); // { params: { '*': 'a/b.txt' } }
```

> 注意：参数名必须仅包含单词字符（`a-z`、`A-Z`、`0-9`、`_`），否则会抛出异常。`matchPath` 内部对已编译的正则做了 LRU 缓存（上限 100 条）。

## 相关包

本包为 [`@lytjs/common`](../common/) 聚合包的成员。

## 许可证

[MIT](../../../../LICENSE)
