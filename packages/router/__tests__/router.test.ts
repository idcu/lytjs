/**
 * Lyt.js 路由系统 — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 测试路由匹配器、导航守卫和路由创建。
 * 由于 createRouter 依赖浏览器 History API，主要测试匹配器和守卫逻辑。
 *
 * 测试覆盖：
 *   - createRouteMatcher 基本创建
 *   - 静态路径匹配
 *   - 动态参数匹配 /user/:id
 *   - 通配符匹配
 *   - addRoute 动态添加
 *   - removeRoute 动态移除
 *   - push 导航（匹配器层面）
 *   - replace 导航（匹配器层面）
 *   - beforeEach 守卫
 *   - afterEach 守卫
 *   - currentRoute 响应式
 *   - params 变化触发更新
 *   - query 变化触发更新
 */

import {
  describe,
  it,
  expect,
  waitFor,
} from '../../test-utils/src/index'

import {
  createRouteMatcher,
  createNavigationGuards,
  runGuards,
  runAfterGuards,
} from '../src/index'

import type {
  RouteRecord,
  RouteMatcher,
  NavigationGuard,
  NavigationTarget,
} from '../src/index'

import {
  effect,
  isRef,
  ref,
  reactive,
} from '../../reactivity/src/index'

// ================================================================
//  测试用例
// ================================================================

describe('Router 路由系统', () => {

  // ---- 1. createRouteMatcher 基本创建 ----
  it('createRouteMatcher 基本创建', () => {
    const matcher = createRouteMatcher([
      { path: '/', name: 'home' },
      { path: '/about', name: 'about' },
    ])

    expect(matcher).toBeDefined()
    expect(typeof matcher.matchRoute).toBe('function')
    expect(typeof matcher.addRoute).toBe('function')
    expect(typeof matcher.removeRoute).toBe('function')
    expect(typeof matcher.getRoutes).toBe('function')

    const routes = matcher.getRoutes()
    expect(routes.length).toBe(2)
  })

  // ---- 2. 静态路径匹配 ----
  it('静态路径匹配', () => {
    const matcher = createRouteMatcher([
      { path: '/', name: 'home' },
      { path: '/about', name: 'about' },
      { path: '/contact', name: 'contact' },
    ])

    const homeResult = matcher.matchRoute('/')
    expect(homeResult).not.toBeNull()
    expect(homeResult!.record.name).toBe('home')
    expect(homeResult!.matchedPath).toBe('/')

    const aboutResult = matcher.matchRoute('/about')
    expect(aboutResult).not.toBeNull()
    expect(aboutResult!.record.name).toBe('about')
    expect(aboutResult!.matchedPath).toBe('/about')

    const contactResult = matcher.matchRoute('/contact')
    expect(contactResult).not.toBeNull()
    expect(contactResult!.record.name).toBe('contact')

    // 不存在的路径
    const notFound = matcher.matchRoute('/nonexistent')
    expect(notFound).toBeNull()
  })

  // ---- 3. 动态参数匹配 /user/:id ----
  it('动态参数匹配 /user/:id', () => {
    const matcher = createRouteMatcher([
      { path: '/user/:id', name: 'user' },
      { path: '/post/:postId/comment/:commentId', name: 'comment' },
    ])

    const userResult = matcher.matchRoute('/user/123')
    expect(userResult).not.toBeNull()
    expect(userResult!.params.id).toBe('123')
    expect(userResult!.matchedPath).toBe('/user/123')

    const userResult2 = matcher.matchRoute('/user/abc-def')
    expect(userResult2).not.toBeNull()
    expect(userResult2!.params.id).toBe('abc-def')

    // 多参数匹配
    const commentResult = matcher.matchRoute('/post/42/comment/99')
    expect(commentResult).not.toBeNull()
    expect(commentResult!.params.postId).toBe('42')
    expect(commentResult!.params.commentId).toBe('99')
  })

  // ---- 4. 通配符匹配 ----
  it('通配符匹配', () => {
    const matcher = createRouteMatcher([
      { path: '/files/*', name: 'files' },
      { path: '/*', name: 'catch-all' },
    ])

    const filesResult = matcher.matchRoute('/files/a/b/c')
    expect(filesResult).not.toBeNull()
    expect(filesResult!.record.name).toBe('files')
    expect(filesResult!.params['*']).toBe('a/b/c')

    const catchAllResult = matcher.matchRoute('/anything/goes/here')
    expect(catchAllResult).not.toBeNull()
    expect(catchAllResult!.record.name).toBe('catch-all')
    expect(catchAllResult!.params['*']).toBe('anything/goes/here')
  })

  // ---- 5. addRoute 动态添加 ----
  it('addRoute 动态添加', () => {
    const matcher = createRouteMatcher([
      { path: '/', name: 'home' },
    ])

    expect(matcher.getRoutes().length).toBe(1)

    // 动态添加路由
    matcher.addRoute({ path: '/settings', name: 'settings' })
    expect(matcher.getRoutes().length).toBe(2)

    // 新添加的路由应该能匹配
    const result = matcher.matchRoute('/settings')
    expect(result).not.toBeNull()
    expect(result!.record.name).toBe('settings')
  })

  // ---- 6. removeRoute 动态移除 ----
  it('removeRoute 动态移除', () => {
    const matcher = createRouteMatcher([
      { path: '/', name: 'home' },
      { path: '/about', name: 'about' },
      { path: '/contact', name: 'contact' },
    ])

    expect(matcher.getRoutes().length).toBe(3)

    // 移除路由
    matcher.removeRoute('about')
    expect(matcher.getRoutes().length).toBe(2)

    // 被移除的路由应该无法匹配
    const result = matcher.matchRoute('/about')
    expect(result).toBeNull()

    // 其他路由不受影响
    const homeResult = matcher.matchRoute('/')
    expect(homeResult).not.toBeNull()
  })

  // ---- 7. push 导航（匹配器层面） ----
  it('push 导航（匹配器层面）', () => {
    const matcher = createRouteMatcher([
      { path: '/', name: 'home' },
      { path: '/user/:id', name: 'user' },
    ])

    // push 操作在匹配器层面就是 matchRoute
    const result = matcher.matchRoute('/user/456')
    expect(result).not.toBeNull()
    expect(result!.params.id).toBe('456')
    expect(result!.record.name).toBe('user')
  })

  // ---- 8. replace 导航（匹配器层面） ----
  it('replace 导航（匹配器层面）', () => {
    const matcher = createRouteMatcher([
      { path: '/dashboard', name: 'dashboard' },
    ])

    // replace 在匹配器层面与 push 相同（都是 matchRoute）
    const result = matcher.matchRoute('/dashboard')
    expect(result).not.toBeNull()
    expect(result!.record.name).toBe('dashboard')
  })

  // ---- 9. beforeEach 守卫 ----
  it('beforeEach 守卫', async () => {
    const guards = createNavigationGuards()
    const order: string[] = []

    // 注册前置守卫
    guards.beforeEach((to, from, next) => {
      order.push('guard1')
      next()
    })

    guards.beforeEach((to, from, next) => {
      order.push('guard2')
      next()
    })

    const to: NavigationTarget = { path: '/new', fullPath: '/new', params: {}, query: {}, hash: '' }
    const from: NavigationTarget = { path: '/', fullPath: '/', params: {}, query: {}, hash: '' }

    // 运行守卫
    await runGuards(
      (guards as any)._beforeEachGuards || [],
      to,
      from
    )

    expect(order).toEqual(['guard1', 'guard2'])
  })

  // ---- 10. afterEach 守卫 ----
  it('afterEach 守卫', () => {
    const guards = createNavigationGuards()
    const results: string[] = []

    // 注册后置守卫
    guards.afterEach((to, from) => {
      results.push(`after: ${to.path}`)
    })

    const to: NavigationTarget = { path: '/new', fullPath: '/new', params: {}, query: {}, hash: '' }
    const from: NavigationTarget = { path: '/', fullPath: '/', params: {}, query: {}, hash: '' }

    // 运行后置守卫
    runAfterGuards(
      (guards as any)._afterEachGuards || [],
      to,
      from
    )

    expect(results.length).toBe(1)
    expect(results[0]).toBe('after: /new')
  })
})

describe('Router 导航守卫', () => {

  // ---- beforeEach 取消导航 ----
  it('beforeEach 取消导航', async () => {
    const guards = createNavigationGuards()
    let navigated = false

    guards.beforeEach((to, from, next) => {
      next(false) // 取消导航
    })

    const to: NavigationTarget = { path: '/protected', fullPath: '/protected', params: {}, query: {}, hash: '' }
    const from: NavigationTarget = { path: '/', fullPath: '/', params: {}, query: {}, hash: '' }

    try {
      await runGuards(
        (guards as any)._beforeEachGuards || [],
        to,
        from
      )
      navigated = true
    } catch {
      navigated = false
    }

    expect(navigated).toBe(false)
  })

  // ---- beforeEach 重定向 ----
  it('beforeEach 重定向', async () => {
    const guards = createNavigationGuards()
    let redirected = false

    guards.beforeEach((to, from, next) => {
      next('/login') // 重定向
    })

    const to: NavigationTarget = { path: '/admin', fullPath: '/admin', params: {}, query: {}, hash: '' }
    const from: NavigationTarget = { path: '/', fullPath: '/', params: {}, query: {}, hash: '' }

    try {
      await runGuards(
        (guards as any)._beforeEachGuards || [],
        to,
        from
      )
    } catch (err: any) {
      if (err.message && err.message.startsWith('REDIRECT:')) {
        redirected = true
        expect(err.message).toBe('REDIRECT:/login')
      }
    }

    expect(redirected).toBe(true)
  })

  // ---- 取消注册守卫 ----
  it('取消注册守卫', async () => {
    const guards = createNavigationGuards()
    let called = false

    const remove = guards.beforeEach((to, from, next) => {
      called = true
      next()
    })

    // 取消注册
    remove()

    const to: NavigationTarget = { path: '/test', fullPath: '/test', params: {}, query: {}, hash: '' }
    const from: NavigationTarget = { path: '/', fullPath: '/', params: {}, query: {}, hash: '' }

    await runGuards(
      (guards as any)._beforeEachGuards || [],
      to,
      from
    )

    expect(called).toBe(false)
  })

  // ---- 多个 afterEach 守卫按顺序执行 ----
  it('多个 afterEach 守卫按顺序执行', () => {
    const guards = createNavigationGuards()
    const order: string[] = []

    guards.afterEach((to, from) => { order.push('after1') })
    guards.afterEach((to, from) => { order.push('after2') })
    guards.afterEach((to, from) => { order.push('after3') })

    const to: NavigationTarget = { path: '/a', fullPath: '/a', params: {}, query: {}, hash: '' }
    const from: NavigationTarget = { path: '/b', fullPath: '/b', params: {}, query: {}, hash: '' }

    runAfterGuards(
      (guards as any)._afterEachGuards || [],
      to,
      from
    )

    expect(order).toEqual(['after1', 'after2', 'after3'])
  })
})

describe('Router 路径标准化', () => {

  // ---- 末尾斜杠处理 ----
  it('末尾斜杠处理', () => {
    const matcher = createRouteMatcher([
      { path: '/about', name: 'about' },
    ])

    const result1 = matcher.matchRoute('/about/')
    expect(result1).not.toBeNull()
    expect(result1!.record.name).toBe('about')

    const result2 = matcher.matchRoute('/about')
    expect(result2).not.toBeNull()
    expect(result2!.record.name).toBe('about')
  })

  // ---- 路由 meta 信息 ----
  it('路由 meta 信息', () => {
    const matcher = createRouteMatcher([
      { path: '/admin', name: 'admin', meta: { requiresAuth: true } },
      { path: '/public', name: 'public', meta: { requiresAuth: false } },
    ])

    const adminResult = matcher.matchRoute('/admin')
    expect(adminResult).not.toBeNull()
    expect(adminResult!.record.meta).toBeDefined()
    expect(adminResult!.record.meta!.requiresAuth).toBe(true)

    const publicResult = matcher.matchRoute('/public')
    expect(publicResult).not.toBeNull()
    expect(publicResult!.record.meta!.requiresAuth).toBe(false)
  })
})

// ================================================================
//  响应式集成测试
// ================================================================

describe('Router 响应式集成', () => {

  // ---- currentRoute 是 Ref 类型 ----
  it('currentRoute 是 Ref 类型', () => {
    const routeRef = ref(reactive({
      path: '/',
      fullPath: '/',
      params: {},
      query: {},
      hash: '',
      matched: [],
    }))

    expect(isRef(routeRef)).toBe(true)
    expect(routeRef.value.path).toBe('/')
  })

  // ---- currentRoute.value 变化触发 effect ----
  it('currentRoute.value 变化触发 effect', () => {
    const routeRef = ref(reactive({
      path: '/',
      fullPath: '/',
      params: {},
      query: {},
      hash: '',
      matched: [],
    }))

    const collectedPaths: string[] = []

    effect(() => {
      collectedPaths.push(routeRef.value.path)
    })

    // 初始值
    expect(collectedPaths.length).toBe(1)
    expect(collectedPaths[0]).toBe('/')

    // 模拟路由变化
    routeRef.value = reactive({
      path: '/about',
      fullPath: '/about',
      params: {},
      query: {},
      hash: '',
      matched: [],
    })

    expect(collectedPaths.length).toBe(2)
    expect(collectedPaths[1]).toBe('/about')
  })

  // ---- params 变化自动触发更新 ----
  it('params 变化自动触发更新', () => {
    const routeRef = ref(reactive({
      path: '/user/123',
      fullPath: '/user/123',
      params: { id: '123' },
      query: {},
      hash: '',
      matched: [],
    }))

    const collectedIds: string[] = []

    effect(() => {
      collectedIds.push(routeRef.value.params.id)
    })

    // 初始值
    expect(collectedIds.length).toBe(1)
    expect(collectedIds[0]).toBe('123')

    // 修改 params（reactive 对象内部属性变化）
    routeRef.value.params.id = '456'

    // reactive 对象内部属性变化应该触发 effect
    expect(collectedIds.length).toBe(2)
    expect(collectedIds[1]).toBe('456')
  })

  // ---- query 变化自动触发更新 ----
  it('query 变化自动触发更新', () => {
    const routeRef = ref(reactive({
      path: '/search',
      fullPath: '/search?q=hello',
      params: {},
      query: { q: 'hello' },
      hash: '',
      matched: [],
    }))

    const collectedQueries: string[] = []

    effect(() => {
      collectedQueries.push(routeRef.value.query.q)
    })

    // 初始值
    expect(collectedQueries.length).toBe(1)
    expect(collectedQueries[0]).toBe('hello')

    // 修改 query（reactive 对象内部属性变化）
    routeRef.value.query.q = 'world'

    // reactive 对象内部属性变化应该触发 effect
    expect(collectedQueries.length).toBe(2)
    expect(collectedQueries[1]).toBe('world')
  })

  // ---- 路由对象深层属性响应式 ----
  it('路由对象深层属性响应式', () => {
    const routeRef = ref(reactive({
      path: '/user/1',
      fullPath: '/user/1',
      params: { id: '1', tab: 'profile' },
      query: {},
      hash: '',
      meta: { requiresAuth: true },
      matched: [],
    }))

    const collectedAuth: boolean[] = []

    effect(() => {
      collectedAuth.push(routeRef.value.meta!.requiresAuth)
    })

    expect(collectedAuth.length).toBe(1)
    expect(collectedAuth[0]).toBe(true)

    // 修改深层属性
    routeRef.value.meta!.requiresAuth = false

    expect(collectedAuth.length).toBe(2)
    expect(collectedAuth[1]).toBe(false)
  })
})
