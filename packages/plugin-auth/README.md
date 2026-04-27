# @lytjs/plugin-auth

> Lyt.js 认证授权插件 - 提供登录、权限校验、路由守卫等认证功能

**版本：** 4.2.0

## 安装

```bash
npm install @lytjs/plugin-auth
```

## 使用

### 注册插件

```typescript
import { createApp } from '@lytjs/core'
import { createAuth } from '@lytjs/plugin-auth'

const auth = createAuth({
  loginUrl: '/api/login',
  logoutUrl: '/api/logout',
  userUrl: '/api/user',
  tokenKey: 'lyt_token',
  autoRedirect: true,
})

const app = createApp({})
app.use(auth)
```

### 登录与登出

```typescript
// 登录
const { user, token } = await auth.login({
  username: 'admin',
  password: '123456',
})

// 登出
await auth.logout()
```

### 注册

```typescript
const result = await auth.register({
  username: 'newuser',
  password: '123456',
  email: 'user@example.com',
})
```

### 路由守卫

```typescript
import { createRouter } from '@lytjs/router'

const router = createRouter({ /* ... */ })
auth.setupRouterGuard(router)
```

### 在组件中使用

通过 `app.provide('auth', auth)` 注入后，可在组件中通过 `inject('auth')` 获取认证实例。

```typescript
import { inject } from '@lytjs/core'

const auth = inject('auth')

// 检查登录状态
console.log(auth.isAuthenticated) // boolean

// 获取当前用户
console.log(auth.user) // AuthUser | null

// 获取 token
console.log(auth.token) // string | null

// 角色检查
auth.hasRole('admin') // boolean

// 权限检查
auth.hasPermission('write') // boolean
```

## API

### Options

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `loginUrl` | `string` | **必填** | 登录接口地址 |
| `logoutUrl` | `string` | - | 登出接口地址 |
| `userUrl` | `string` | - | 获取当前用户信息接口地址 |
| `registerUrl` | `string` | - | 注册接口地址 |
| `refreshTokenUrl` | `string` | - | Token 刷新接口地址 |
| `tokenKey` | `string` | `'lyt_token'` | localStorage 中存储 token 的 key |
| `autoRedirect` | `boolean` | `false` | 未登录时是否自动跳转到登录页 |
| `loginRoute` | `string` | `'/login'` | 登录页路由路径 |
| `homeRoute` | `string` | `'/'` | 登录后跳转的路由路径 |
| `onLoginSuccess` | `(user: any) => void` | - | 登录成功回调 |
| `onLoginError` | `(error: Error) => void` | - | 登录失败回调 |
| `onLogout` | `() => void` | - | 登出回调 |
| `onUnauthorized` | `() => void` | - | 未授权回调（401 等） |
| `onTokenRefreshed` | `(newToken: string) => void` | - | Token 刷新成功回调 |
| `onTokenRefreshError` | `(error: Error) => void` | - | Token 刷新失败回调 |

### 属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `user` | `AuthUser \| null` | 当前用户信息 |
| `isAuthenticated` | `boolean` | 是否已认证 |
| `token` | `string \| null` | 当前 token |
| `loading` | `boolean` | 是否正在加载中 |

### 方法

| 方法 | 签名 | 描述 |
|------|------|------|
| `login` | `(credentials: Record<string, unknown>) => Promise<AuthUser>` | 登录，支持多种响应格式自动提取 token |
| `logout` | `() => Promise<void>` | 登出，清除本地认证状态 |
| `register` | `(data: Record<string, unknown>) => Promise<AuthUser>` | 注册新用户 |
| `fetchUser` | `() => Promise<AuthUser>` | 获取当前用户信息 |
| `getToken` | `() => string \| null` | 获取当前 token |
| `setToken` | `(token: string) => void` | 设置 token（内存 + localStorage） |
| `removeToken` | `() => void` | 移除 token（内存 + localStorage） |
| `hasRole` | `(role: string) => boolean` | 检查用户是否拥有指定角色 |
| `hasPermission` | `(perm: string) => boolean` | 检查用户是否拥有指定权限 |
| `refreshToken` | `() => Promise<string \| null>` | 刷新 Token |
| `setupRouterGuard` | `(router: Record<string, unknown>) => void` | 设置路由守卫，自动检查登录状态 |

### 类型

```typescript
interface AuthUser {
  id: string | number
  name: string
  email?: string
  role?: string
  [key: string]: unknown
}
```

## License

MIT
