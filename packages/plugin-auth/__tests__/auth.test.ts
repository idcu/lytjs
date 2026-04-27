/**
 * Lyt.js 认证授权插件 — 完整单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 测试 createAuth、Token 管理、权限检查、路由守卫、回调函数等。
 *
 * 测试覆盖：
 *   1. createAuth 创建实例
 *   2. install 安装到 app（注入 $auth 和 provide）
 *   3. getToken / setToken / removeToken Token 管理
 *   4. isAuthenticated 认证状态
 *   5. hasRole 角色检查（数组格式、逗号分隔格式）
 *   6. hasPermission 权限检查
 *   7. setupRouterGuard 路由守卫（mock router）
 *   8. 用户数据结构兼容性（roles 数组 vs role 字符串）
 *   9. loading 状态
 *  10. register 未配置 registerUrl 时抛错
 *  11. refreshToken 未配置时抛错
 *  12. logout 清除状态
 *  13. 回调函数触发（onLoginSuccess/onLogout/onUnauthorized）
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '../../test-utils/src/index'

import { createAuth } from '../src/index'

// ================================================================
//  Mock：localStorage
// ================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem(key: string) { return store[key] ?? null },
    setItem(key: string, value: string) { store[key] = value },
    removeItem(key: string) { delete store[key] },
    clear() { store = {} },
    get _store() { return store },
  }
})()

// ================================================================
//  Mock：globalThis.fetch
// ================================================================

type FetchMockFn = (url: string, options?: any) => Promise<any>

const originalFetch = globalThis.fetch

function mockFetch(fn: FetchMockFn) {
  ;(globalThis as any).fetch = fn
}

function restoreFetch() {
  globalThis.fetch = originalFetch
}

// ================================================================
//  辅助函数
// ================================================================

/** 创建带默认配置的 auth 实例 */
function createTestAuth(options?: any) {
  return createAuth({
    loginUrl: '/api/login',
    tokenKey: 'test_token',
    ...options,
  })
}

/** 创建一个成功响应的 fetch mock */
function successFetch(data: any) {
  return async (_url: string, _options?: any) => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(data),
  })
}

/** 创建一个失败响应的 fetch mock */
function errorFetch(status: number, message: string) {
  return async (_url: string, _options?: any) => ({
    ok: false,
    status,
    text: async () => message,
  })
}

// ================================================================
//  1. createAuth 创建实例
// ================================================================

describe('createAuth 创建实例', () => {

  it('返回包含 install 方法的插件对象', () => {
    const auth = createTestAuth()
    expect(auth).toBeDefined()
    expect(typeof auth.install).toBe('function')
  })

  it('包含所有必要方法', () => {
    const auth = createTestAuth()
    expect(typeof auth.getToken).toBe('function')
    expect(typeof auth.setToken).toBe('function')
    expect(typeof auth.removeToken).toBe('function')
    expect(typeof auth.hasRole).toBe('function')
    expect(typeof auth.hasPermission).toBe('function')
    expect(typeof auth.refreshToken).toBe('function')
    expect(typeof auth.login).toBe('function')
    expect(typeof auth.logout).toBe('function')
    expect(typeof auth.register).toBe('function')
    expect(typeof auth.fetchUser).toBe('function')
    expect(typeof auth.setupRouterGuard).toBe('function')
  })

  it('包含所有必要的状态属性', () => {
    const auth = createTestAuth()
    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.token).toBeNull()
    expect(auth.loading).toBe(false)
  })

  it('使用默认 tokenKey "lyt_token"', () => {
    const auth = createAuth({ loginUrl: '/api/login' })
    expect(auth).toBeDefined()
    expect(typeof auth.setToken).toBe('function')
  })
})

// ================================================================
//  2. install 安装到 app
// ================================================================

describe('install 安装到 app', () => {

  it('向 app 注入 $auth 全局属性', () => {
    const auth = createTestAuth()
    const app: any = {}
    auth.install(app)

    expect(app.config).toBeDefined()
    expect(app.config.globalProperties).toBeDefined()
    expect(app.config.globalProperties.$auth).toBe(auth)
  })

  it('app 已有 config 时正确合并', () => {
    const auth = createTestAuth()
    const app: any = { config: { globalProperties: { existing: true } } }
    auth.install(app)

    expect(app.config.globalProperties.existing).toBe(true)
    expect(app.config.globalProperties.$auth).toBe(auth)
  })

  it('通过 provide 注入 auth', () => {
    const auth = createTestAuth()
    const provided: Record<string, any> = {}
    const app: any = {
      provide(key: string, value: any) {
        provided[key] = value
      },
    }
    auth.install(app)

    expect(provided['auth']).toBe(auth)
  })

  it('app 没有 provide 方法时不报错', () => {
    const auth = createTestAuth()
    const app: any = {}
    // 不应抛错
    auth.install(app)
    expect(app.config.globalProperties.$auth).toBe(auth)
  })
})

// ================================================================
//  3. getToken / setToken / removeToken Token 管理
// ================================================================

describe('getToken / setToken / removeToken Token 管理', () => {

  beforeEach(() => {
    ;(globalThis as any).localStorage = localStorageMock
    localStorageMock.clear()
  })

  afterEach(() => {
    delete (globalThis as any).localStorage
  })

  it('初始 token 为 null', () => {
    const auth = createTestAuth()
    expect(auth.getToken()).toBeNull()
  })

  it('setToken 设置 token 后 getToken 返回该 token', () => {
    const auth = createTestAuth()
    auth.setToken('my-access-token')
    expect(auth.getToken()).toBe('my-access-token')
  })

  it('setToken 同时写入 localStorage', () => {
    const auth = createTestAuth()
    auth.setToken('persist-token')
    expect(localStorageMock.getItem('test_token')).toBe('persist-token')
  })

  it('token 属性与 getToken 一致', () => {
    const auth = createTestAuth()
    auth.setToken('test-token-123')
    expect(auth.token).toBe('test-token-123')
    expect(auth.token).toBe(auth.getToken())
  })

  it('removeToken 后 token 为 null', () => {
    const auth = createTestAuth()
    auth.setToken('to-be-removed')
    auth.removeToken()
    expect(auth.getToken()).toBeNull()
  })

  it('removeToken 同时清除 localStorage', () => {
    const auth = createTestAuth()
    auth.setToken('to-be-removed')
    auth.removeToken()
    expect(localStorageMock.getItem('test_token')).toBeNull()
  })

  it('初始化时从 localStorage 恢复 token', () => {
    localStorageMock.setItem('test_token', 'restored-token')
    const auth = createTestAuth()
    expect(auth.getToken()).toBe('restored-token')
    expect(auth.isAuthenticated).toBe(true)
  })
})

// ================================================================
//  4. isAuthenticated 认证状态
// ================================================================

describe('isAuthenticated 认证状态', () => {

  beforeEach(() => {
    ;(globalThis as any).localStorage = localStorageMock
    localStorageMock.clear()
  })

  afterEach(() => {
    delete (globalThis as any).localStorage
  })

  it('无 token 时 isAuthenticated 为 false', () => {
    const auth = createTestAuth()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('有 token 时 isAuthenticated 为 true', () => {
    const auth = createTestAuth()
    auth.setToken('valid-token')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('removeToken 后 isAuthenticated 变为 false', () => {
    const auth = createTestAuth()
    auth.setToken('valid-token')
    expect(auth.isAuthenticated).toBe(true)
    auth.removeToken()
    expect(auth.isAuthenticated).toBe(false)
  })
})

// ================================================================
//  5. hasRole 角色检查（数组格式、逗号分隔格式）
// ================================================================

describe('hasRole 角色检查', () => {

  it('无用户时 hasRole 返回 false', () => {
    const auth = createTestAuth()
    expect(auth.hasRole('admin')).toBe(false)
  })

  it('用户 roles 为数组时正确匹配', async () => {
    mockFetch(successFetch({ id: 1, name: 'Alice', roles: ['admin', 'editor'] }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')
    await auth.fetchUser()

    expect(auth.hasRole('admin')).toBe(true)
    expect(auth.hasRole('editor')).toBe(true)
    expect(auth.hasRole('guest')).toBe(false)
    restoreFetch()
  })

  it('用户 role 为逗号分隔字符串时正确匹配', async () => {
    mockFetch(successFetch({ id: 2, name: 'Bob', role: 'admin, editor' }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')
    await auth.fetchUser()

    expect(auth.hasRole('admin')).toBe(true)
    expect(auth.hasRole('editor')).toBe(true)
    expect(auth.hasRole('guest')).toBe(false)
    restoreFetch()
  })

  it('逗号分隔字符串中带空格也能正确匹配', async () => {
    mockFetch(successFetch({ id: 3, name: 'Carol', role: ' admin ,  guest  ' }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')
    await auth.fetchUser()

    expect(auth.hasRole('admin')).toBe(true)
    expect(auth.hasRole('guest')).toBe(true)
    restoreFetch()
  })

  it('用户 roles 为空数组时返回 false', async () => {
    mockFetch(successFetch({ id: 4, name: 'Dave', roles: [] }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')
    await auth.fetchUser()

    expect(auth.hasRole('admin')).toBe(false)
    restoreFetch()
  })
})

// ================================================================
//  6. hasPermission 权限检查
// ================================================================

describe('hasPermission 权限检查', () => {

  it('无用户时 hasPermission 返回 false', () => {
    const auth = createTestAuth()
    expect(auth.hasPermission('write')).toBe(false)
  })

  it('用户 permissions 为数组时正确匹配', async () => {
    mockFetch(successFetch({ id: 1, permissions: ['read', 'write'] }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')
    await auth.fetchUser()

    expect(auth.hasPermission('read')).toBe(true)
    expect(auth.hasPermission('write')).toBe(true)
    expect(auth.hasPermission('delete')).toBe(false)
    restoreFetch()
  })

  it('用户 perms 为数组时也能正确匹配', async () => {
    mockFetch(successFetch({ id: 2, perms: ['create', 'update'] }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')
    await auth.fetchUser()

    expect(auth.hasPermission('create')).toBe(true)
    expect(auth.hasPermission('update')).toBe(true)
    expect(auth.hasPermission('delete')).toBe(false)
    restoreFetch()
  })

  it('用户 permissions 为逗号分隔字符串时正确匹配', async () => {
    mockFetch(successFetch({ id: 3, permissions: 'read, write, execute' }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')
    await auth.fetchUser()

    expect(auth.hasPermission('read')).toBe(true)
    expect(auth.hasPermission('write')).toBe(true)
    expect(auth.hasPermission('execute')).toBe(true)
    expect(auth.hasPermission('delete')).toBe(false)
    restoreFetch()
  })
})

// ================================================================
//  7. setupRouterGuard 路由守卫
// ================================================================

describe('setupRouterGuard 路由守卫', () => {

  it('无效 router 时静默处理（不抛错）', () => {
    const auth = createTestAuth()
    auth.setupRouterGuard(null)
    // 不抛错即通过
  })

  it('缺少 beforeEach 方法时静默处理', () => {
    const auth = createTestAuth()
    auth.setupRouterGuard({})
    // 不抛错即通过
  })

  it('有效 router 时注册 beforeEach 守卫', () => {
    const auth = createTestAuth()
    let guardRegistered = false
    const router = {
      beforeEach(fn: any) { guardRegistered = true },
    }
    auth.setupRouterGuard(router)
    expect(guardRegistered).toBe(true)
  })

  it('已登录访问登录页时重定向到首页', () => {
    const auth = createTestAuth()
    auth.setToken('valid-token')

    let redirectedTo: any = null
    const router = {
      beforeEach(fn: any) {
        fn(
          { path: '/login', meta: {}, fullPath: '/login' },
          {},
          (to: any) => { redirectedTo = to },
        )
      },
    }
    auth.setupRouterGuard(router)
    expect(redirectedTo).toBe('/')
  })

  it('已登录访问普通页面时放行', () => {
    const auth = createTestAuth()
    auth.setToken('valid-token')

    let nextCalled = false
    let redirectedTo: any = null
    const router = {
      beforeEach(fn: any) {
        fn(
          { path: '/dashboard', meta: { requiresAuth: true }, fullPath: '/dashboard' },
          {},
          (to: any) => {
            if (to === undefined) { nextCalled = true }
            else { redirectedTo = to }
          },
        )
      },
    }
    auth.setupRouterGuard(router)
    expect(nextCalled).toBe(true)
    expect(redirectedTo).toBeNull()
  })

  it('未登录 + autoRedirect 时重定向到登录页并携带 redirect 参数', () => {
    const auth = createTestAuth({ autoRedirect: true })

    let redirectedTo: any = null
    const router = {
      beforeEach(fn: any) {
        fn(
          { path: '/dashboard', meta: { requiresAuth: true }, fullPath: '/dashboard' },
          {},
          (to: any) => { redirectedTo = to },
        )
      },
    }
    auth.setupRouterGuard(router)
    expect(redirectedTo).toBeDefined()
    expect(redirectedTo.path).toBe('/login')
    expect(redirectedTo.query.redirect).toBe('/dashboard')
  })

  it('未登录 + meta.requiresAuth=false 时放行', () => {
    let onUnauthorizedCalled = false
    const auth = createTestAuth({
      autoRedirect: true,
      onUnauthorized() { onUnauthorizedCalled = true },
    })

    let nextCalled = false
    const router = {
      beforeEach(fn: any) {
        fn(
          { path: '/public', meta: { requiresAuth: false }, fullPath: '/public' },
          {},
          () => { nextCalled = true },
        )
      },
    }
    auth.setupRouterGuard(router)
    expect(nextCalled).toBe(true)
    expect(onUnauthorizedCalled).toBe(false)
  })

  it('未登录 + 无 autoRedirect 时触发 onUnauthorized 回调', () => {
    let onUnauthorizedCalled = false
    const auth = createTestAuth({
      autoRedirect: false,
      onUnauthorized() { onUnauthorizedCalled = true },
    })

    const router = {
      beforeEach(fn: any) {
        fn(
          { path: '/dashboard', meta: {}, fullPath: '/dashboard' },
          {},
          () => {},
        )
      },
    }
    auth.setupRouterGuard(router)
    expect(onUnauthorizedCalled).toBe(true)
  })

  it('使用自定义 loginRoute 和 homeRoute', () => {
    const auth = createTestAuth({
      loginRoute: '/auth/signin',
      homeRoute: '/home',
    })
    auth.setToken('token')

    let redirectedTo: any = null
    const router = {
      beforeEach(fn: any) {
        fn(
          { path: '/auth/signin', meta: {}, fullPath: '/auth/signin' },
          {},
          (to: any) => { redirectedTo = to },
        )
      },
    }
    auth.setupRouterGuard(router)
    expect(redirectedTo).toBe('/home')
  })
})

// ================================================================
//  8. 用户数据结构兼容性（roles 数组 vs role 字符串）
// ================================================================

describe('用户数据结构兼容性', () => {

  it('roles 数组格式', async () => {
    mockFetch(successFetch({ id: 1, roles: ['admin', 'user'] }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')
    const user = await auth.fetchUser()

    expect(Array.isArray(user.roles)).toBe(true)
    expect(auth.hasRole('admin')).toBe(true)
    expect(auth.hasRole('user')).toBe(true)
    expect(auth.hasRole('superadmin')).toBe(false)
    restoreFetch()
  })

  it('role 字符串格式', async () => {
    mockFetch(successFetch({ id: 2, role: 'admin' }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')
    const user = await auth.fetchUser()

    expect(typeof user.role).toBe('string')
    expect(auth.hasRole('admin')).toBe(true)
    expect(auth.hasRole('user')).toBe(false)
    restoreFetch()
  })

  it('role 逗号分隔字符串格式', async () => {
    mockFetch(successFetch({ id: 3, role: 'admin,user,editor' }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')
    await auth.fetchUser()

    expect(auth.hasRole('admin')).toBe(true)
    expect(auth.hasRole('user')).toBe(true)
    expect(auth.hasRole('editor')).toBe(true)
    restoreFetch()
  })

  it('permissions 数组格式', async () => {
    mockFetch(successFetch({ id: 4, permissions: ['read', 'write', 'delete'] }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')
    await auth.fetchUser()

    expect(auth.hasPermission('read')).toBe(true)
    expect(auth.hasPermission('write')).toBe(true)
    expect(auth.hasPermission('delete')).toBe(true)
    expect(auth.hasPermission('admin')).toBe(false)
    restoreFetch()
  })

  it('perms 数组格式', async () => {
    mockFetch(successFetch({ id: 5, perms: ['create', 'update'] }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')
    await auth.fetchUser()

    expect(auth.hasPermission('create')).toBe(true)
    expect(auth.hasPermission('update')).toBe(true)
    expect(auth.hasPermission('delete')).toBe(false)
    restoreFetch()
  })

  it('permissions 逗号分隔字符串格式', async () => {
    mockFetch(successFetch({ id: 6, permissions: 'read, write' }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')
    await auth.fetchUser()

    expect(auth.hasPermission('read')).toBe(true)
    expect(auth.hasPermission('write')).toBe(true)
    restoreFetch()
  })

  it('无 roles/permissions 字段时返回 false', async () => {
    mockFetch(successFetch({ id: 7, name: 'NoRoles' }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')
    await auth.fetchUser()

    expect(auth.hasRole('admin')).toBe(false)
    expect(auth.hasPermission('read')).toBe(false)
    restoreFetch()
  })
})

// ================================================================
//  9. loading 状态
// ================================================================

describe('loading 状态', () => {

  it('初始 loading 为 false', () => {
    const auth = createTestAuth()
    expect(auth.loading).toBe(false)
  })

  it('login 期间 loading 为 true', async () => {
    let resolveFetch: any
    mockFetch(async () => {
      // 等待 resolve 后才返回
      await new Promise(r => { resolveFetch = r })
      return { ok: true, status: 200, text: async () => JSON.stringify({ token: 'new-token' }) }
    })

    const auth = createTestAuth()
    const loginPromise = auth.login({ username: 'test', password: '123' })

    // login 已开始但未完成
    expect(auth.loading).toBe(true)

    resolveFetch()
    await loginPromise

    expect(auth.loading).toBe(false)
    restoreFetch()
  })

  it('logout 期间 loading 为 true', async () => {
    let resolveFetch: any
    mockFetch(async () => {
      await new Promise(r => { resolveFetch = r })
      return { ok: true, status: 200, text: async () => '' }
    })

    const auth = createTestAuth({ logoutUrl: '/api/logout' })
    auth.setToken('token')

    const logoutPromise = auth.logout()
    expect(auth.loading).toBe(true)

    resolveFetch()
    await logoutPromise

    expect(auth.loading).toBe(false)
    restoreFetch()
  })

  it('fetchUser 期间 loading 为 true', async () => {
    let resolveFetch: any
    mockFetch(async () => {
      await new Promise(r => { resolveFetch = r })
      return { ok: true, status: 200, text: async () => JSON.stringify({ id: 1 }) }
    })

    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')

    const fetchPromise = auth.fetchUser()
    expect(auth.loading).toBe(true)

    resolveFetch()
    await fetchPromise

    expect(auth.loading).toBe(false)
    restoreFetch()
  })

  it('login 失败后 loading 恢复为 false', async () => {
    mockFetch(errorFetch(401, 'Unauthorized'))

    const auth = createTestAuth()
    try {
      await auth.login({ username: 'bad', password: 'bad' })
    } catch {
      // 预期失败
    }

    expect(auth.loading).toBe(false)
    restoreFetch()
  })
})

// ================================================================
//  10. register 未配置 registerUrl 时抛错
// ================================================================

describe('register 注册', () => {

  it('未配置 registerUrl 时抛出错误', async () => {
    const auth = createTestAuth()
    try {
      await auth.register({ username: 'test', password: '123' })
      expect(true).toBe(false) // 不应到达
    } catch (err: any) {
      expect(err.message).toContain('registerUrl')
    }
  })

  it('配置 registerUrl 时正常发起请求', async () => {
    mockFetch(successFetch({ id: 1, message: '注册成功' }))
    const auth = createTestAuth({ registerUrl: '/api/register' })

    const result = await auth.register({ username: 'test', password: '123' })
    expect(result).toBeDefined()
    expect(result.id).toBe(1)
    restoreFetch()
  })

  it('register 期间 loading 为 true', async () => {
    let resolveFetch: any
    mockFetch(async () => {
      await new Promise(r => { resolveFetch = r })
      return { ok: true, status: 200, text: async () => JSON.stringify({ id: 1 }) }
    })

    const auth = createTestAuth({ registerUrl: '/api/register' })
    const registerPromise = auth.register({ username: 'test', password: '123' })
    expect(auth.loading).toBe(true)

    resolveFetch()
    await registerPromise
    expect(auth.loading).toBe(false)
    restoreFetch()
  })
})

// ================================================================
//  11. refreshToken 未配置时抛错
// ================================================================

describe('refreshToken Token 刷新', () => {

  it('未配置 refreshTokenUrl 时抛出错误', async () => {
    const auth = createTestAuth()
    auth.setToken('existing-token')
    try {
      await auth.refreshToken()
      expect(true).toBe(false) // 不应到达
    } catch (err: any) {
      expect(err.message).toContain('refreshTokenUrl')
    }
  })

  it('无 token 时 refreshToken 返回 null', async () => {
    const auth = createTestAuth({ refreshTokenUrl: '/api/refresh' })
    const result = await auth.refreshToken()
    expect(result).toBeNull()
  })

  it('有 token 且配置了 refreshTokenUrl 时正常刷新', async () => {
    mockFetch(successFetch({ token: 'new-refreshed-token' }))
    const auth = createTestAuth({ refreshTokenUrl: '/api/refresh' })
    auth.setToken('old-token')

    const newToken = await auth.refreshToken()
    expect(newToken).toBe('new-refreshed-token')
    expect(auth.getToken()).toBe('new-refreshed-token')
    restoreFetch()
  })

  it('支持 access_token 格式的响应', async () => {
    mockFetch(successFetch({ access_token: 'access-123' }))
    const auth = createTestAuth({ refreshTokenUrl: '/api/refresh' })
    auth.setToken('old-token')

    const newToken = await auth.refreshToken()
    expect(newToken).toBe('access-123')
    restoreFetch()
  })

  it('支持 data.token 格式的响应', async () => {
    mockFetch(successFetch({ data: { token: 'nested-token' } }))
    const auth = createTestAuth({ refreshTokenUrl: '/api/refresh' })
    auth.setToken('old-token')

    const newToken = await auth.refreshToken()
    expect(newToken).toBe('nested-token')
    restoreFetch()
  })

  it('刷新失败时清除 token 和用户', async () => {
    mockFetch(errorFetch(401, 'Token expired'))
    const auth = createTestAuth({
      refreshTokenUrl: '/api/refresh',
      userUrl: '/api/user',
    })
    auth.setToken('old-token')

    try {
      await auth.refreshToken()
    } catch {
      // 预期失败
    }

    expect(auth.getToken()).toBeNull()
    expect(auth.user).toBeNull()
    restoreFetch()
  })
})

// ================================================================
//  12. logout 清除状态
// ================================================================

describe('logout 清除状态', () => {

  beforeEach(() => {
    ;(globalThis as any).localStorage = localStorageMock
    localStorageMock.clear()
  })

  afterEach(() => {
    delete (globalThis as any).localStorage
    restoreFetch()
  })

  it('logout 后 token 被清除', async () => {
    mockFetch(successFetch(null))
    const auth = createTestAuth({ logoutUrl: '/api/logout' })
    auth.setToken('to-be-cleared')

    await auth.logout()
    expect(auth.getToken()).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('logout 后 user 被清除', async () => {
    mockFetch(successFetch(null))
    const auth = createTestAuth({ logoutUrl: '/api/logout', userUrl: '/api/user' })
    auth.setToken('token')
    await auth.fetchUser()
    expect(auth.user).toBeDefined()

    await auth.logout()
    expect(auth.user).toBeNull()
  })

  it('logout 后 localStorage 被清除', async () => {
    mockFetch(successFetch(null))
    const auth = createTestAuth({ logoutUrl: '/api/logout' })
    auth.setToken('persist-token')
    expect(localStorageMock.getItem('test_token')).toBe('persist-token')

    await auth.logout()
    expect(localStorageMock.getItem('test_token')).toBeNull()
  })

  it('logout 接口调用失败不影响本地清除', async () => {
    mockFetch(errorFetch(500, 'Server Error'))
    const auth = createTestAuth({ logoutUrl: '/api/logout' })
    auth.setToken('token')

    // 不应抛错
    await auth.logout()
    expect(auth.getToken()).toBeNull()
    expect(auth.user).toBeNull()
  })

  it('无 logoutUrl 时也能正常清除本地状态', async () => {
    const auth = createTestAuth()
    auth.setToken('token')

    await auth.logout()
    expect(auth.getToken()).toBeNull()
    expect(auth.user).toBeNull()
  })

  it('无 token 时 logout 不调用登出接口', async () => {
    let fetchCalled = false
    mockFetch(async () => {
      fetchCalled = true
      return { ok: true, status: 200, text: async () => '' }
    })

    const auth = createTestAuth({ logoutUrl: '/api/logout' })
    // 不设置 token
    await auth.logout()

    expect(fetchCalled).toBe(false)
  })
})

// ================================================================
//  13. 回调函数触发
// ================================================================

describe('回调函数触发', () => {

  beforeEach(() => {
    ;(globalThis as any).localStorage = localStorageMock
    localStorageMock.clear()
  })

  afterEach(() => {
    delete (globalThis as any).localStorage
    restoreFetch()
  })

  it('login 成功时触发 onLoginSuccess', async () => {
    let callbackUser: any = null
    mockFetch(successFetch({ token: 'login-token', user: { id: 1, name: 'Alice' } }))

    const auth = createTestAuth({
      onLoginSuccess(user: any) { callbackUser = user },
    })

    await auth.login({ username: 'alice', password: '123' })
    expect(callbackUser).toBeDefined()
    expect(callbackUser.id).toBe(1)
    expect(callbackUser.name).toBe('Alice')
  })

  it('login 失败时触发 onLoginError', async () => {
    let callbackError: Error | null = null
    mockFetch(errorFetch(401, 'Bad credentials'))

    const auth = createTestAuth({
      onLoginError(err: Error) { callbackError = err },
    })

    try {
      await auth.login({ username: 'bad', password: 'bad' })
    } catch {
      // 预期失败
    }

    expect(callbackError).toBeDefined()
    expect(callbackError!.message).toContain('401')
  })

  it('logout 时触发 onLogout', async () => {
    let logoutCalled = false
    mockFetch(successFetch(null))

    const auth = createTestAuth({
      logoutUrl: '/api/logout',
      onLogout() { logoutCalled = true },
    })
    auth.setToken('token')

    await auth.logout()
    expect(logoutCalled).toBe(true)
  })

  it('路由守卫中未登录时触发 onUnauthorized', () => {
    let unauthorizedCalled = false
    const auth = createTestAuth({
      autoRedirect: false,
      onUnauthorized() { unauthorizedCalled = true },
    })

    const router = {
      beforeEach(fn: any) {
        fn(
          { path: '/protected', meta: {}, fullPath: '/protected' },
          {},
          () => {},
        )
      },
    }
    auth.setupRouterGuard(router)
    expect(unauthorizedCalled).toBe(true)
  })

  it('路由守卫中已登录时不触发 onUnauthorized', () => {
    let unauthorizedCalled = false
    const auth = createTestAuth({
      autoRedirect: false,
      onUnauthorized() { unauthorizedCalled = true },
    })
    auth.setToken('valid-token')

    const router = {
      beforeEach(fn: any) {
        fn(
          { path: '/dashboard', meta: {}, fullPath: '/dashboard' },
          {},
          () => {},
        )
      },
    }
    auth.setupRouterGuard(router)
    expect(unauthorizedCalled).toBe(false)
  })

  it('refreshToken 成功时触发 onTokenRefreshed', async () => {
    let refreshedToken: string | null = null
    mockFetch(successFetch({ token: 'refreshed-abc' }))

    const auth = createTestAuth({
      refreshTokenUrl: '/api/refresh',
      onTokenRefreshed(token: string) { refreshedToken = token },
    })
    auth.setToken('old-token')

    await auth.refreshToken()
    expect(refreshedToken).toBe('refreshed-abc')
  })

  it('refreshToken 失败时触发 onTokenRefreshError', async () => {
    let refreshError: Error | null = null
    mockFetch(errorFetch(401, 'Refresh failed'))

    const auth = createTestAuth({
      refreshTokenUrl: '/api/refresh',
      onTokenRefreshError(err: Error) { refreshError = err },
    })
    auth.setToken('old-token')

    try {
      await auth.refreshToken()
    } catch {
      // 预期失败
    }

    expect(refreshError).toBeDefined()
    expect(refreshError!.message).toContain('401')
  })
})

// ================================================================
//  login 流程完整测试
// ================================================================

describe('login 登录流程', () => {

  beforeEach(() => {
    ;(globalThis as any).localStorage = localStorageMock
    localStorageMock.clear()
  })

  afterEach(() => {
    delete (globalThis as any).localStorage
    restoreFetch()
  })

  it('登录成功返回 user 和 token', async () => {
    mockFetch(successFetch({ token: 'login-token-123', user: { id: 1, name: 'Test' } }))

    const auth = createTestAuth()
    const result = await auth.login({ username: 'test', password: '123' })

    expect(result.user).toBeDefined()
    expect(result.user.id).toBe(1)
    expect(result.token).toBe('login-token-123')
  })

  it('登录成功后自动设置 token', async () => {
    mockFetch(successFetch({ token: 'auto-token', user: { id: 1 } }))

    const auth = createTestAuth()
    await auth.login({ username: 'test', password: '123' })

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.getToken()).toBe('auto-token')
  })

  it('登录成功后自动设置 user', async () => {
    mockFetch(successFetch({ token: 't', user: { id: 1, name: 'Alice' } }))

    const auth = createTestAuth()
    await auth.login({ username: 'test', password: '123' })

    expect(auth.user).toBeDefined()
    expect(auth.user.id).toBe(1)
  })

  it('支持 access_token 格式的响应', async () => {
    mockFetch(successFetch({ access_token: 'at-123' }))

    const auth = createTestAuth()
    const result = await auth.login({ username: 'test', password: '123' })

    expect(result.token).toBe('at-123')
    expect(auth.getToken()).toBe('at-123')
  })

  it('支持 data.token 格式的响应', async () => {
    mockFetch(successFetch({ data: { token: 'dt-456', user: { id: 2 } } }))

    const auth = createTestAuth()
    const result = await auth.login({ username: 'test', password: '123' })

    expect(result.token).toBe('dt-456')
    expect(auth.user.id).toBe(2)
  })

  it('登录失败时抛出错误', async () => {
    mockFetch(errorFetch(401, 'Invalid credentials'))

    const auth = createTestAuth()
    try {
      await auth.login({ username: 'bad', password: 'bad' })
      expect(true).toBe(false) // 不应到达
    } catch (err: any) {
      expect(err.message).toContain('401')
    }
  })

  it('登录失败后 token 和 user 不变', async () => {
    mockFetch(errorFetch(500, 'Server Error'))

    const auth = createTestAuth()
    try {
      await auth.login({ username: 'test', password: '123' })
    } catch {
      // 预期失败
    }

    expect(auth.getToken()).toBeNull()
    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('配置 userUrl 时登录成功后自动获取用户信息', async () => {
    let callCount = 0
    mockFetch(async (url: string) => {
      callCount++
      if (url === '/api/login') {
        return { ok: true, status: 200, text: async () => JSON.stringify({ token: 't' }) }
      }
      // /api/user
      return { ok: true, status: 200, text: async () => JSON.stringify({ id: 1, roles: ['admin'] }) }
    })

    const auth = createTestAuth({ userUrl: '/api/user' })
    await auth.login({ username: 'test', password: '123' })

    expect(auth.user).toBeDefined()
    expect(auth.user.id).toBe(1)
    expect(auth.user.roles).toEqual(['admin'])
    expect(callCount).toBe(2) // login + fetchUser
  })
})

// ================================================================
//  fetchUser 测试
// ================================================================

describe('fetchUser 获取用户信息', () => {

  beforeEach(() => {
    ;(globalThis as any).localStorage = localStorageMock
    localStorageMock.clear()
  })

  afterEach(() => {
    delete (globalThis as any).localStorage
    restoreFetch()
  })

  it('未配置 userUrl 时返回当前用户', async () => {
    const auth = createTestAuth()
    const user = await auth.fetchUser()
    expect(user).toBeNull()
  })

  it('配置 userUrl 时发起请求获取用户', async () => {
    mockFetch(successFetch({ id: 1, name: 'TestUser' }))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')

    const user = await auth.fetchUser()
    expect(user.id).toBe(1)
    expect(user.name).toBe('TestUser')
  })

  it('fetchUser 失败时清除用户', async () => {
    mockFetch(errorFetch(401, 'Unauthorized'))
    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('token')

    try {
      await auth.fetchUser()
    } catch {
      // 预期失败
    }

    expect(auth.user).toBeNull()
  })

  it('fetchUser 请求携带 Authorization header', async () => {
    let capturedHeaders: any = null
    mockFetch(async (_url: string, options: any) => {
      capturedHeaders = options?.headers
      return { ok: true, status: 200, text: async () => JSON.stringify({ id: 1 }) }
    })

    const auth = createTestAuth({ userUrl: '/api/user' })
    auth.setToken('my-bearer-token')
    await auth.fetchUser()

    expect(capturedHeaders).toBeDefined()
    expect(capturedHeaders['Authorization']).toBe('Bearer my-bearer-token')
  })
})

// ================================================================
//  localStorage 不可用时的静默处理
// ================================================================

describe('localStorage 不可用时静默处理', () => {

  it('setToken 在 localStorage 不可用时不抛错', () => {
    // 确保 localStorage 不存在
    const saved = (globalThis as any).localStorage
    delete (globalThis as any).localStorage

    const auth = createTestAuth()
    // 不应抛错
    auth.setToken('silent-token')
    expect(auth.getToken()).toBe('silent-token')

    if (saved) (globalThis as any).localStorage = saved
  })

  it('removeToken 在 localStorage 不可用时不抛错', () => {
    const saved = (globalThis as any).localStorage
    delete (globalThis as any).localStorage

    const auth = createTestAuth()
    auth.setToken('token')
    // 不应抛错
    auth.removeToken()
    expect(auth.getToken()).toBeNull()

    if (saved) (globalThis as any).localStorage = saved
  })

  it('createAuth 在 localStorage 不可用时不抛错', () => {
    const saved = (globalThis as any).localStorage
    delete (globalThis as any).localStorage

    const auth = createTestAuth()
    expect(auth).toBeDefined()
    expect(auth.isAuthenticated).toBe(false)

    if (saved) (globalThis as any).localStorage = saved
  })
})
