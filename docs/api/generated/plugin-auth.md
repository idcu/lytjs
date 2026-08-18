# @lytjs/plugin-auth

官方认证插件，用于路由鉴权

## 目录

- [createAuth](#createauth)
- [User](#user)
- [AuthOptions](#authoptions)
- [AuthInstance](#authinstance)

## createAuth

**Function**

### 签名

```typescript
createAuth: AuthInstance;
```

### 参数

| 参数    | 类型          | 描述 | 可选 | 默认值 |
| ------- | ------------- | ---- | ---- | ------ |
| options | `AuthOptions` |      | 是   | {}     |

### 返回值

**类型:** `AuthInstance`

## User

**Interface**

### 成员

| 名称        | 类型       | 描述     | 可选    |
| ----------- | ---------- | -------- | ------- | --- |
| id          | `string    | number`  | 用户 ID | 否  |
| username    | `string`   | 用户名   | 是      |
| roles       | `string[]` | 角色列表 | 否      |
| permissions | `string[]` | 权限列表 | 否      |

## AuthOptions

**Interface**

### 成员

| 名称              | 类型      | 描述           | 可选     |
| ----------------- | --------- | -------------- | -------- | --- |
| initialUser       | `User     | null`          | 初始用户 | 是  |
| storageKey        | `string`  | 持久化 key     | 是       |
| enablePersistence | `boolean` | 是否启用持久化 | 是       |
| superAdminRole    | `string`  | 超级管理员角色 | 是       |

## AuthInstance

**Interface**

### 成员

| 名称              | 类型                                 | 描述                  | 可选     |
| ----------------- | ------------------------------------ | --------------------- | -------- | --- |
| user              | `User                                | null`                 | 当前用户 | 否  |
| isAuthenticated   | `boolean`                            | 是否已登录            | 否       |
| login             | `(user: User) => void`               | 登录                  | 否       |
| logout            | `() => void`                         | 登出                  | 否       |
| hasRole           | `(role: string                       | string[]) => boolean` | 检查角色 | 否  |
| hasPermission     | `(permission: string                 | string[]) => boolean` | 检查权限 | 否  |
| hasAllRoles       | `(roles: string[]) => boolean`       | 检查所有角色          | 否       |
| hasAllPermissions | `(permissions: string[]) => boolean` | 检查所有权限          | 否       |
| updateUser        | `(user: Partial<User>) => void`      | 更新用户信息          | 否       |
