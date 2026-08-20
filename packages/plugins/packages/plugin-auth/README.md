# @lytjs/plugin-auth

LytJS 官方认证插件，提供用户登录状态管理、角色鉴权与权限校验功能。

## 简介·独立声明

LytJS 官方认证插件，提供用户登录状态管理、角色鉴权与权限校验功能。

> **框架无关性说明**：本插件为框架生态包，零第三方依赖，仅构建于 LytJS 核心之上（仅依赖 `@lytjs/core` 与 `@lytjs/reactivity`，已移除未使用的 `@lytjs/common-is`）。按 v6.12 路线图规划，所有 @lytjs/plugin-\* 插件将统一迁出为独立仓库 lytjs-plugins，保持 API 兼容并提供迁移指南。

## 安装

```bash
pnpm add @lytjs/plugin-auth
```

## 快速开始

### 作为插件使用

```typescript
import { createApp } from '@lytjs/core';
import pluginAuth from '@lytjs/plugin-auth';

const app = createApp();
app.use(pluginAuth, {
  initialUser: null,
  enablePersistence: true,
  storageKey: 'lyt-user',
});
```

安装后可通过 `$auth`（或 provide 注入的 `lyt-auth`）使用：

```typescript
// 登录
$auth.login({ id: 1, username: 'admin', roles: ['admin'], permissions: ['user:create'] });

// 校验
$auth.isAuthenticated; // true
$auth.hasRole('admin'); // true
$auth.hasPermission('user:create'); // true
$auth.hasAllRoles(['admin', 'editor']); // false
$auth.updateUser({ username: 'new-name' }); // 更新用户信息

// 登出
$auth.logout();
```

### 独立使用

```typescript
import { createAuth } from '@lytjs/plugin-auth';

const auth = createAuth({ enablePersistence: true });
auth.login({ id: 1, roles: ['admin'], permissions: ['user:create'] });
```

## 特性

- 登录/登出与用户状态管理
- 角色与权限校验（`hasRole`、`hasAllRoles`、`hasPermission`、`hasAllPermissions`）
- 超级管理员角色绕过校验
- 可选 localStorage 持久化
- 响应式状态（基于 `@lytjs/reactivity`）

## API

### createAuth(options)

创建认证实例。

| 方法/属性                                                      | 说明                       |
| -------------------------------------------------------------- | -------------------------- |
| `user`                                                         | 当前用户（`User \| null`） |
| `isAuthenticated`                                              | 是否已登录                 |
| `login(user)`                                                  | 登录                       |
| `logout()`                                                     | 登出                       |
| `hasRole(role)` / `hasAllRoles(roles)`                         | 角色校验                   |
| `hasPermission(permission)` / `hasAllPermissions(permissions)` | 权限校验                   |
| `updateUser(partialUser)`                                      | 更新用户信息               |

### 类型

`User`（含 `id`、`roles`、`permissions` 等）、`AuthOptions`、`AuthInstance`。

## 相关包

- [@lytjs/core](../../../core)：应用核心，提供 `definePlugin` 与 `createApp`。
- [@lytjs/reactivity](../../../reactivity)：响应式信号机制。

## 许可证

[MIT](../../../../LICENSE)
