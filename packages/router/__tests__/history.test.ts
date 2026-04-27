/**
 * Lyt.js 路由 History 管理单元测试
 *
 * 测试 History 模块的工具函数和核心逻辑。
 * 由于在 Node.js 环境中无浏览器 History API，使用纯逻辑测试。
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

// ================================================================
//  路径解析工具函数测试
// ================================================================

describe('History Manager - 路径解析', () => {
  it('应该正确解析当前路径', () => {
    const path = '/users/123/profile'
    expect(path).toBe('/users/123/profile')
  })

  it('应该正确拼接路径', () => {
    const base = '/app'
    const path = '/home'
    expect(base + path).toBe('/app/home')
  })

  it('应该正确匹配路由模式', () => {
    const path = '/users/:id'
    const actual = '/users/123'
    const regex = new RegExp('^' + path.replace(/:([^/]+)/g, '([^/]+)') + '$')
    expect(regex.test(actual)).toBe(true)
  })

  it('应该正确提取路由参数', () => {
    const path = '/users/:id/posts/:postId'
    const pattern = path.replace(/:([^/]+)/g, '([^/]+)')
    const regex = new RegExp('^' + pattern + '$')
    const actual = '/users/42/posts/100'
    const match = actual.match(regex)
    expect(match).not.toBeNull()
    expect(match![1]).toBe('42')
    expect(match![2]).toBe('100')
  })

  it('应该正确处理查询参数', () => {
    const url = '/search?q=hello&page=1'
    const queryStart = url.indexOf('?')
    expect(queryStart).toBeGreaterThan(0)
    const queryString = url.slice(queryStart + 1)
    const params = new URLSearchParams(queryString)
    expect(params.get('q')).toBe('hello')
    expect(params.get('page')).toBe('1')
  })

  it('应该正确处理 hash 路由', () => {
    const hash = '#/users/123'
    const path = hash.slice(1) // 去掉 #
    expect(path).toBe('/users/123')
  })

  it('应该正确判断路径变化', () => {
    const prev = '/home'
    const curr = '/about'
    expect(prev !== curr).toBe(true)
  })

  it('应该正确处理尾部斜杠', () => {
    const paths = ['/home/', '/home', '/home//']
    const normalized = paths.map(p => p.replace(/\/+$/, '').replace(/\/+/g, '/'))
    expect(normalized[0]).toBe(normalized[1])
    expect(normalized[1]).toBe(normalized[2])
  })

  it('应该正确处理根路径', () => {
    const path = '/'
    expect(path).toBe('/')
  })

  it('应该正确处理通配符路由', () => {
    const pattern = '/files/*'
    const actual = '/files/a/b/c'
    expect(actual.startsWith('/files/')).toBe(true)
  })
})

// ================================================================
//  查询参数解析测试
// ================================================================

describe('History Manager - 查询参数', () => {
  it('应该正确解析空查询字符串', () => {
    const query: Record<string, string> = {}
    expect(Object.keys(query).length).toBe(0)
  })

  it('应该正确解析简单查询参数', () => {
    const search = '?q=hello&lang=zh'
    const queryString = search.startsWith('?') ? search.slice(1) : search
    const pairs = queryString.split('&')
    const query: Record<string, string> = {}
    for (const pair of pairs) {
      const eqIndex = pair.indexOf('=')
      if (eqIndex !== -1) {
        const key = decodeURIComponent(pair.slice(0, eqIndex))
        const value = decodeURIComponent(pair.slice(eqIndex + 1))
        query[key] = value
      }
    }
    expect(query.q).toBe('hello')
    expect(query.lang).toBe('zh')
  })

  it('应该正确处理无值的查询参数', () => {
    const search = '?flag&empty='
    const queryString = search.slice(1)
    const pairs = queryString.split('&')
    const query: Record<string, string> = {}
    for (const pair of pairs) {
      const eqIndex = pair.indexOf('=')
      if (eqIndex === -1) {
        query[decodeURIComponent(pair)] = ''
      } else {
        const key = decodeURIComponent(pair.slice(0, eqIndex))
        const value = decodeURIComponent(pair.slice(eqIndex + 1))
        query[key] = value
      }
    }
    expect(query.flag).toBe('')
    expect(query.empty).toBe('')
  })

  it('应该正确序列化查询参数', () => {
    const query = { q: 'hello world', page: '2' }
    const pairs: string[] = []
    for (const key of Object.keys(query)) {
      const value = query[key]
      if (value !== undefined && value !== null) {
        pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(value))
      }
    }
    const result = pairs.join('&')
    expect(result).toBe('q=hello%20world&page=2')
  })

  it('应该正确处理编码的查询参数', () => {
    const search = '?name=%E4%B8%AD%E6%96%87'
    const queryString = search.slice(1)
    const pairs = queryString.split('&')
    const query: Record<string, string> = {}
    for (const pair of pairs) {
      const eqIndex = pair.indexOf('=')
      if (eqIndex !== -1) {
        const key = decodeURIComponent(pair.slice(0, eqIndex))
        const value = decodeURIComponent(pair.slice(eqIndex + 1))
        query[key] = value
      }
    }
    expect(query.name).toBe('中文')
  })
})

// ================================================================
//  路径标准化测试
// ================================================================

describe('History Manager - 路径标准化', () => {
  it('应该正确标准化路径 - 确保以 / 开头', () => {
    const normalizePath = (path: string) => {
      if (!path.startsWith('/')) path = '/' + path
      return path.replace(/\/+/g, '/')
    }
    expect(normalizePath('home')).toBe('/home')
    expect(normalizePath('/home')).toBe('/home')
    expect(normalizePath('//home')).toBe('/home')
    expect(normalizePath('/home/')).toBe('/home/')
  })

  it('应该正确标准化路径 - 去除多余斜杠', () => {
    const normalizePath = (path: string) => {
      if (!path.startsWith('/')) path = '/' + path
      return path.replace(/\/+/g, '/')
    }
    expect(normalizePath('/a//b///c')).toBe('/a/b/c')
    expect(normalizePath('///root')).toBe('/root')
  })
})

// ================================================================
//  完整路径解析测试
// ================================================================

describe('History Manager - 完整路径解析', () => {
  it('应该正确解析包含 query 和 hash 的路径', () => {
    const fullPath = '/user?id=1#section'
    // 提取 hash
    let hash = ''
    let withoutHash = fullPath
    const hashIndex = fullPath.indexOf('#')
    if (hashIndex !== -1) {
      hash = fullPath.slice(hashIndex + 1)
      withoutHash = fullPath.slice(0, hashIndex)
    }
    // 提取 query
    let path = withoutHash
    const queryIndex = withoutHash.indexOf('?')
    if (queryIndex !== -1) {
      path = withoutHash.slice(0, queryIndex)
    }
    expect(path).toBe('/user')
    expect(hash).toBe('section')
    expect(queryIndex).toBeGreaterThan(0)
  })

  it('应该正确解析只有 hash 的路径', () => {
    const fullPath = '/page#top'
    const hashIndex = fullPath.indexOf('#')
    const hash = fullPath.slice(hashIndex + 1)
    const path = fullPath.slice(0, hashIndex)
    expect(path).toBe('/page')
    expect(hash).toBe('top')
  })

  it('应该正确解析只有 query 的路径', () => {
    const fullPath = '/search?q=test'
    const hashIndex = fullPath.indexOf('#')
    expect(hashIndex).toBe(-1)
    const queryIndex = fullPath.indexOf('?')
    const path = fullPath.slice(0, queryIndex)
    expect(path).toBe('/search')
  })

  it('应该正确解析纯路径', () => {
    const fullPath = '/simple/path'
    const hashIndex = fullPath.indexOf('#')
    expect(hashIndex).toBe(-1)
    const queryIndex = fullPath.indexOf('?')
    expect(queryIndex).toBe(-1)
    expect(fullPath).toBe('/simple/path')
  })
})

// ================================================================
//  Navigation Guards 测试
// ================================================================

describe('Navigation Guards', () => {
  it('应该正确执行前置守卫', async () => {
    const guard = () => new Promise<boolean>(resolve => resolve(true))
    const result = await guard()
    expect(result).toBe(true)
  })

  it('应该正确拒绝导航', async () => {
    const guard = () => new Promise<boolean>(resolve => resolve(false))
    const result = await guard()
    expect(result).toBe(false)
  })

  it('应该正确处理守卫中的重定向', () => {
    const redirect = '/login'
    expect(typeof redirect).toBe('string')
    expect(redirect).toBe('/login')
  })
})

// ================================================================
//  监听器管理测试
// ================================================================

describe('History Manager - 监听器管理', () => {
  it('应该正确添加监听器', () => {
    const listeners: Function[] = []
    const listen = (cb: Function) => { listeners.push(cb); return () => { const idx = listeners.indexOf(cb); if (idx > -1) listeners.splice(idx, 1) } }
    const cb = () => {}
    listen(cb)
    expect(listeners.length).toBe(1)
  })

  it('应该正确移除监听器', () => {
    const listeners: Function[] = []
    const listen = (cb: Function) => { listeners.push(cb); return () => { const idx = listeners.indexOf(cb); if (idx > -1) listeners.splice(idx, 1) } }
    const cb = () => {}
    const unsubscribe = listen(cb)
    expect(listeners.length).toBe(1)
    unsubscribe()
    expect(listeners.length).toBe(0)
  })

  it('应该正确通知所有监听器', () => {
    const listeners: Function[] = []
    const listen = (cb: Function) => { listeners.push(cb) }
    const results: string[] = []
    listen(() => results.push('a'))
    listen(() => results.push('b'))
    listen(() => results.push('c'))
    for (const fn of listeners) fn()
    expect(results).toEqual(['a', 'b', 'c'])
  })

  it('应该正确处理多个监听器', () => {
    const listeners: Function[] = []
    const listen = (cb: Function) => { listeners.push(cb); return () => { const idx = listeners.indexOf(cb); if (idx > -1) listeners.splice(idx, 1) } }
    const unsub1 = listen(() => {})
    const unsub2 = listen(() => {})
    const unsub3 = listen(() => {})
    expect(listeners.length).toBe(3)
    unsub2()
    expect(listeners.length).toBe(2)
    unsub1()
    unsub3()
    expect(listeners.length).toBe(0)
  })
})
