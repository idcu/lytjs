# @lytjs/router-fs

基于文件系统的路由引擎

## 目录

- [DEFAULT_OPTIONS](#default-options)
- [createFileSystemRouter](#createfilesystemrouter)
- [RouteConfig](#routeconfig)
- [FileSystemRouterOptions](#filesystemrouteroptions)
- [RouteMatch](#routematch)
- [FileSystemRouter](#filesystemrouter)
- [isDirectory](#isdirectory)
- [isFile](#isfile)
- [filePathToRoutePath](#filepathtoroutepath)
- [extractDynamicParams](#extractdynamicparams)
- [scanDirectory](#scandirectory)

## DEFAULT_OPTIONS

**Variable**

默认配置选项

## createFileSystemRouter

**Function**

创建文件系统路由管理器

### 签名

```typescript
createFileSystemRouter: FileSystemRouter;
```

### 参数

| 参数    | 类型                      | 描述 | 可选 | 默认值 |
| ------- | ------------------------- | ---- | ---- | ------ |
| options | `FileSystemRouterOptions` |      | 是   | -      |

### 返回值

**类型:** `FileSystemRouter`

## RouteConfig

**Interface**

路由配置接口

### 成员

| 名称          | 类型            | 描述           | 可选 |
| ------------- | --------------- | -------------- | ---- |
| path          | `string`        | 路由路径       | 否   |
| name          | `string`        | 路由名称       | 是   |
| componentPath | `string`        | 组件路径       | 否   |
| isDynamic     | `boolean`       | 是否为动态路由 | 否   |
| params        | `string[]`      | 动态路由参数名 | 是   |
| isNested      | `boolean`       | 是否为嵌套路由 | 否   |
| children      | `RouteConfig[]` | 子路由         | 是   |
| layoutPath    | `string`        | 布局路径       | 是   |

## FileSystemRouterOptions

**Interface**

文件系统路由配置选项

### 成员

| 名称           | 类型       | 描述             | 可选 |
| -------------- | ---------- | ---------------- | ---- |
| pagesDir       | `string`   | 页面目录路径     | 否   |
| extensions     | `string[]` | 页面文件扩展名   | 是   |
| layoutPattern  | `string`   | 布局文件名称模式 | 是   |
| ignorePatterns | `string[]` | 忽略文件模式     | 是   |
| strictMode     | `boolean`  | 是否启用严格模式 | 是   |

## RouteMatch

**Interface**

路由匹配结果

### 成员

| 名称   | 类型                     | 描述           | 可选 |
| ------ | ------------------------ | -------------- | ---- |
| route  | `RouteConfig`            | 匹配的路由配置 | 否   |
| params | `Record<string, string>` | 路由参数       | 否   |
| path   | `string`                 | 路由路径       | 否   |

## FileSystemRouter

**Interface**

路由管理器接口

### 成员

| 名称        | 类型 | 描述             | 可选 |
| ----------- | ---- | ---------------- | ---- |
| getRoutes   | -    | 获取路由配置列表 | 否   |
| match       | -    | 匹配路径         | 否   |
| addRoute    | -    | 添加路由         | 否   |
| removeRoute | -    | 移除路由         | 否   |
| clearRoutes | -    | 清除所有路由     | 否   |
| refresh     | -    | 重新扫描文件系统 | 否   |

## isDirectory

**Function**

检查是否为目录

### 签名

```typescript
isDirectory: boolean;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| path | `string` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## isFile

**Function**

检查是否为文件

### 签名

```typescript
isFile: boolean;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| path | `string` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## filePathToRoutePath

**Function**

转换文件路径到路由路径

### 签名

```typescript
filePathToRoutePath: string;
```

### 参数

| 参数       | 类型       | 描述 | 可选 | 默认值 |
| ---------- | ---------- | ---- | ---- | ------ |
| filePath   | `string`   |      | 否   | -      |
| baseDir    | `string`   |      | 否   | -      |
| extensions | `string[]` |      | 否   | -      |

### 返回值

**类型:** `string`

## extractDynamicParams

**Function**

提取动态路由参数名

### 签名

```typescript
extractDynamicParams: string[]
```

### 参数

| 参数      | 类型     | 描述 | 可选 | 默认值 |
| --------- | -------- | ---- | ---- | ------ |
| routePath | `string` |      | 否   | -      |

### 返回值

**类型:** `string[]`

## scanDirectory

**Function**

递归扫描目录收集路由文件

### 签名

```typescript
scanDirectory: RouteConfig[]
```

### 参数

| 参数           | 类型       | 描述 | 可选 | 默认值 |
| -------------- | ---------- | ---- | ---- | ------ |
| dir            | `string`   |      | 否   | -      |
| baseDir        | `string`   |      | 否   | -      |
| extensions     | `string[]` |      | 否   | -      |
| ignorePatterns | `string[]` |      | 否   | -      |

### 返回值

**类型:** `RouteConfig[]`
