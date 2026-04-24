// Lyt.js 认证授权插件
//
// 用法：
//   import { createAuth } from '@lytjs/plugin-auth'
//   const auth = createAuth({
//     loginUrl: '/api/login',
//     logoutUrl: '/api/logout',
//     userUrl: '/api/user',
//     tokenKey: 'lyt_token',
//     autoRedirect: true,
//     onLoginSuccess: (user) => console.log('登录成功', user),
//     onLogout: () => console.log('已退出'),
//   })
//   app.use(auth)
//   // 使用：auth.login({ username, password })
//   //        auth.logout()
//   //        auth.user  // 当前用户
//   //        auth.isAuthenticated  // 是否已登录
//   //        auth.hasRole('admin')  // 角色检查

// ======================== 类型定义 ========================

/** 认证配置选项 */
interface AuthOptions {
  /** 登录接口地址 */
  loginUrl: string
  /** 登出接口地址 */
  logoutUrl?: string
  /** 获取当前用户信息接口地址 */
  userUrl?: string
  /** 注册接口地址 */
  registerUrl?: string
  /** Token 刷新接口地址 */
  refreshTokenUrl?: string
  /** localStorage 中存储 token 的 key，默认 'lyt_token' */
  tokenKey?: string
  /** 未登录时是否自动跳转到登录页 */
  autoRedirect?: boolean
  /** 登录页路由路径 */
  loginRoute?: string
  /** 登录后跳转的路由路径 */
  homeRoute?: string
  /** 登录成功回调 */
  onLoginSuccess?: (user: any) => void
  /** 登录失败回调 */
  onLoginError?: (error: Error) => void
  /** 登出回调 */
  onLogout?: () => void
  /** 未授权回调（401 等） */
  onUnauthorized?: () => void
  /** Token 刷新成功回调 */
  onTokenRefreshed?: (newToken: string) => void
  /** Token 刷新失败回调 */
  onTokenRefreshError?: (error: Error) => void
}

/** 认证插件实例 */
interface Auth {
  /** 安装到 Lyt 应用 */
  install: (app: any, options?: any) => void
  /** 当前用户信息 */
  user: any | null
  /** 是否已认证 */
  isAuthenticated: boolean
  /** 当前 token */
  token: string | null
  /** 是否正在加载中 */
  loading: boolean
  /** 登录 */
  login(credentials: Record<string, any>): Promise<any>
  /** 登出 */
  logout(): Promise<void>
  /** 注册 */
  register(data: Record<string, any>): Promise<any>
  /** 获取当前用户信息 */
  fetchUser(): Promise<any>
  /** 获取 token */
  getToken(): string | null
  /** 设置 token */
  setToken(token: string): void
  /** 移除 token */
  removeToken(): void
  /** 检查用户是否拥有指定角色 */
  hasRole(role: string): boolean
  /** 检查用户是否拥有指定权限 */
  hasPermission(perm: string): boolean
  /** 刷新 Token */
  refreshToken(): Promise<string | null>
  /** 设置路由守卫，自动检查登录状态 */
  setupRouterGuard(router: any): void
}

// ======================== 工具函数 ========================

/**
 * 发送 HTTP 请求（纯原生 fetch 封装）
 * @param url 请求地址
 * @param options 请求选项
 * @returns 响应 JSON 数据
 */
async function request(url: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  // 处理非 2xx 响应
  if (!response.ok) {
    const errorText = await response.text().catch(() => '请求失败')
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  // 尝试解析 JSON，无内容时返回 null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * 带认证 token 的 GET 请求
 */
async function get(url: string, token: string | null): Promise<any> {
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return request(url, { method: 'GET', headers })
}

/**
 * 带认证 token 的 POST 请求
 */
async function post(url: string, data: any, token: string | null): Promise<any> {
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
}

// ======================== 核心实现 ========================

/**
 * 创建认证授权插件实例
 * @param options 认证配置
 * @returns Auth 插件实例
 */
function createAuth(options: AuthOptions): Auth {
  const {
    loginUrl,
    logoutUrl,
    userUrl,
    registerUrl,
    refreshTokenUrl,
    tokenKey = 'lyt_token',
    autoRedirect = false,
    loginRoute = '/login',
    homeRoute = '/',
    onLoginSuccess,
    onLoginError,
    onLogout,
    onUnauthorized,
    onTokenRefreshed,
    onTokenRefreshError,
  } = options

  // 内部状态
  let currentUser: any | null = null
  let currentToken: string | null = null
  let isLoading = false

  // 初始化时从 localStorage 恢复 token
  try {
    const stored = localStorage.getItem(tokenKey)
    if (stored) {
      currentToken = stored
    }
  } catch {
    // localStorage 不可用时静默忽略
  }

  /** 判断是否已认证（有 token 即视为已认证） */
  function getIsAuthenticated(): boolean {
    return !!currentToken
  }

  /** 获取 token */
  function getToken(): string | null {
    return currentToken
  }

  /** 设置 token 到内存和 localStorage */
  function setToken(token: string): void {
    currentToken = token
    try {
      localStorage.setItem(tokenKey, token)
    } catch {
      // localStorage 不可用时静默忽略
    }
  }

  /** 移除 token（内存和 localStorage） */
  function removeToken(): void {
    currentToken = null
    try {
      localStorage.removeItem(tokenKey)
    } catch {
      // localStorage 不可用时静默忽略
    }
  }

  /** 获取当前用户信息 */
  async function fetchUser(): Promise<any> {
    if (!userUrl) {
      return currentUser
    }

    isLoading = true
    try {
      const data = await get(userUrl, currentToken)
      currentUser = data
      return currentUser
    } catch (error) {
      // 获取用户信息失败，清除认证状态
      currentUser = null
      throw error
    } finally {
      isLoading = false
    }
  }

  /** 登录 */
  async function login(credentials: Record<string, any>): Promise<any> {
    isLoading = true
    try {
      // 发送登录请求
      const data = await post(loginUrl, credentials, null)

      // 从响应中提取 token（支持多种响应格式）
      const token = data?.token || data?.access_token || data?.data?.token || null
      if (token) {
        setToken(token)
      }

      // 尝试获取用户信息
      if (userUrl) {
        await fetchUser()
      } else if (data?.user || data?.data?.user) {
        currentUser = data.user || data.data.user
      }

      // 触发登录成功回调
      if (onLoginSuccess) {
        onLoginSuccess(currentUser)
      }

      return { user: currentUser, token }
    } catch (error) {
      // 触发登录失败回调
      if (onLoginError && error instanceof Error) {
        onLoginError(error)
      }
      throw error
    } finally {
      isLoading = false
    }
  }

  /** 登出 */
  async function logout(): Promise<void> {
    isLoading = true
    try {
      // 如果有登出接口，调用它
      if (logoutUrl && currentToken) {
        try {
          await post(logoutUrl, {}, currentToken)
        } catch {
          // 登出接口调用失败不影响本地清除
        }
      }

      // 清除本地状态
      const previousUser = currentUser
      removeToken()
      currentUser = null

      // 触发登出回调
      if (onLogout) {
        onLogout()
      }
    } finally {
      isLoading = false
    }
  }

  /** 注册 */
  async function register(data: Record<string, any>): Promise<any> {
    if (!registerUrl) {
      throw new Error('未配置 registerUrl，无法注册')
    }

    isLoading = true
    try {
      const result = await post(registerUrl, data, null)
      return result
    } finally {
      isLoading = false
    }
  }

  /** 刷新 Token */
  async function refreshToken(): Promise<string | null> {
    if (!refreshTokenUrl) {
      throw new Error('未配置 refreshTokenUrl，无法刷新 Token')
    }

    if (!currentToken) {
      return null
    }

    isLoading = true
    try {
      const data = await post(refreshTokenUrl, {}, currentToken)

      // 从响应中提取新 token
      const newToken = data?.token || data?.access_token || data?.data?.token || null
      if (newToken) {
        setToken(newToken)
        if (onTokenRefreshed) {
          onTokenRefreshed(newToken)
        }
      }

      return newToken
    } catch (error) {
      // 刷新失败，清除认证状态
      if (onTokenRefreshError && error instanceof Error) {
        onTokenRefreshError(error)
      }
      removeToken()
      currentUser = null
      throw error
    } finally {
      isLoading = false
    }
  }

  /** 检查用户是否拥有指定角色 */
  function hasRole(role: string): boolean {
    if (!currentUser) return false

    // 支持多种用户数据结构
    const roles = currentUser.roles || currentUser.role || []

    if (Array.isArray(roles)) {
      return roles.includes(role)
    }

    if (typeof roles === 'string') {
      return roles.split(',').map((r: string) => r.trim()).includes(role)
    }

    return false
  }

  /** 检查用户是否拥有指定权限 */
  function hasPermission(perm: string): boolean {
    if (!currentUser) return false

    // 支持多种权限数据结构
    const permissions = currentUser.permissions || currentUser.perms || []

    if (Array.isArray(permissions)) {
      return permissions.includes(perm)
    }

    if (typeof permissions === 'string') {
      return permissions.split(',').map((p: string) => p.trim()).includes(perm)
    }

    return false
  }

  /** 设置路由守卫 */
  function setupRouterGuard(router: any): void {
    if (!router || typeof router.beforeEach !== 'function') {
      console.warn('[Auth] router 无效或缺少 beforeEach 方法')
      return
    }

    router.beforeEach((to: any, _from: any, next: any) => {
      const requiresAuth = to.meta?.requiresAuth !== false // 默认需要认证
      const isLoginPage = to.path === loginRoute

      // 已登录状态
      if (getIsAuthenticated()) {
        // 已登录但访问登录页，重定向到首页
        if (isLoginPage) {
          next(homeRoute)
          return
        }
        next()
        return
      }

      // 未登录状态
      if (requiresAuth && autoRedirect) {
        // 需要认证且开启了自动跳转，重定向到登录页
        // 保存原始目标路径，登录后可以跳回
        next({
          path: loginRoute,
          query: { redirect: to.fullPath },
        })
        return
      }

      // 未登录且未触发自动跳转，触发未授权回调
      if (onUnauthorized) {
        onUnauthorized()
      }

      next()
    })
  }

  // 构造插件实例
  const auth: Auth = {
    /**
     * 安装插件到 Lyt 应用
     * 向 app 注入 $auth 对象
     */
    install(app: any, _options?: any): void {
      // 注入全局属性 $auth
      app.config = app.config || {}
      app.config.globalProperties = app.config.globalProperties || {}

      app.config.globalProperties.$auth = auth

      // 如果 app 提供 provide 方法，也通过 provide 注入
      if (typeof app.provide === 'function') {
        app.provide('auth', auth)
      }
    },

    // 状态属性（通过 getter 实现响应式读取）
    get user(): any | null {
      return currentUser
    },
    get isAuthenticated(): boolean {
      return getIsAuthenticated()
    },
    get token(): string | null {
      return currentToken
    },
    get loading(): boolean {
      return isLoading
    },

    // 方法
    login,
    logout,
    register,
    fetchUser,
    getToken,
    setToken,
    removeToken,
    hasRole,
    hasPermission,
    refreshToken,
    setupRouterGuard,
  }

  return auth
}

export { createAuth }
export type { Auth, AuthOptions }
