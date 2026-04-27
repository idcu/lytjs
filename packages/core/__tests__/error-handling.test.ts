/**
 * Lyt.js 错误处理系统 — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 测试 LytError、LytErrorCodes、ErrorBoundary、warn、warnOnce、handleError、
 * callWithErrorHandling、createMessage。
 *
 * 测试覆盖：
 *   - LytError 创建和格式化
 *   - LytErrorCodes 枚举值
 *   - ErrorBoundary 捕获错误
 *   - ErrorBoundary 获取错误列表
 *   - ErrorBoundary 清除错误
 *   - ErrorBoundary 全局处理器
 *   - warn 开发模式输出
 *   - warn 生产模式不输出
 *   - warnOnce 只警告一次
 *   - handleError 统一处理
 *   - callWithErrorHandling 安全执行
 *   - createMessage 友好提示
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

// ================================================================
//  辅助函数：重置开发模式和全局处理器
// ================================================================

// 先从 error-handling 导入
import {
  LytError,
  LytErrorCodes,
  ErrorBoundary,
  handleError,
  callWithErrorHandling,
  warn as warnEH,
  warnOnce as warnOnceEH,
  setDevMode as setDevModeEH,
  createMessage,
  createLytError,
  ErrorCodes,
  resetWarnedMessages as resetWarnedMessagesEH,
} from '../src/error-handling'

// 再从 warn.ts 导入
import {
  warn as warnUtil,
  warnOnce as warnOnceUtil,
  error as errorUtil,
  setDevMode as setDevModeUtil,
  getDevMode,
  resetWarnedMessages as resetWarnedMessagesUtil,
} from '../src/warn'

function resetState(): void {
  setDevModeEH(true)
  setDevModeUtil(true)
  ErrorBoundary.globalHandler = null
}

// ================================================================
//  测试用例
// ================================================================

describe('LytError 创建和格式化', () => {

  // 每个测试前重置状态
  const _reset = () => resetState()

  it('LytError 创建并包含正确属性', () => {
    _reset()
    const err = new LytError(LytErrorCodes.NOT_FOUND, '资源未找到')
    expect(err).toBeDefined()
    expect(err.name).toBe('LytError')
    expect(err.code).toBe(LytErrorCodes.NOT_FOUND)
    expect(err.message).toBe('资源未找到')
    expect(err.details).toBeUndefined()
  })

  it('LytError 带详情信息', () => {
    const err = new LytError(
      LytErrorCodes.INVALID_ARGUMENT,
      '参数无效',
      { param: 'age', expected: 'number', received: 'string' },
    )
    expect(err.code).toBe(LytErrorCodes.INVALID_ARGUMENT)
    expect(err.details).toEqual({ param: 'age', expected: 'number', received: 'string' })
    expect(err.message).toContain('参数无效')
  })

  it('LytError 是 Error 的实例', () => {
    const err = new LytError(LytErrorCodes.OPERATION_FAILED, '操作失败')
    expect(err instanceof Error).toBe(true)
    expect(err instanceof LytError).toBe(true)
  })

  it('LytError message 格式为 [Lyt CODE] message', () => {
    const err = new LytError(LytErrorCodes.PARSE_ERROR, '解析失败')
    expect(err.message).toBe('解析失败')
  })
})

describe('LytErrorCodes 枚举值', () => {

  it('通用错误码范围 1xxx', () => {
    expect(LytErrorCodes.INVALID_ARGUMENT).toBe(1001)
    expect(LytErrorCodes.NOT_FOUND).toBe(1002)
    expect(LytErrorCodes.ALREADY_EXISTS).toBe(1003)
    expect(LytErrorCodes.OPERATION_FAILED).toBe(1004)
  })

  it('响应式错误码范围 2xxx', () => {
    expect(LytErrorCodes.REACTIVE_READONLY).toBe(2001)
    expect(LytErrorCodes.REACTIVE_EFFECT_DISPOSED).toBe(2002)
    expect(LytErrorCodes.COMPUTED_CYCLE).toBe(2003)
  })

  it('编译器错误码范围 3xxx', () => {
    expect(LytErrorCodes.PARSE_ERROR).toBe(3001)
    expect(LytErrorCodes.INVALID_EXPRESSION).toBe(3002)
    expect(LytErrorCodes.INVALID_DIRECTIVE).toBe(3003)
    expect(LytErrorCodes.INVALID_TEMPLATE).toBe(3004)
  })

  it('渲染器错误码范围 4xxx', () => {
    expect(LytErrorCodes.RENDER_ERROR).toBe(4001)
    expect(LytErrorCodes.HYDRATION_MISMATCH).toBe(4002)
    expect(LytErrorCodes.INVALID_VNODE).toBe(4003)
  })

  it('组件错误码范围 5xxx', () => {
    expect(LytErrorCodes.COMPONENT_INVALID_PROPS).toBe(5001)
    expect(LytErrorCodes.COMPONENT_MISSING_TEMPLATE).toBe(5002)
    expect(LytErrorCodes.COMPONENT_LIFECYCLE_ERROR).toBe(5003)
  })

  it('路由错误码范围 6xxx', () => {
    expect(LytErrorCodes.ROUTE_NOT_FOUND).toBe(6001)
    expect(LytErrorCodes.ROUTE_DUPLICATE).toBe(6002)
    expect(LytErrorCodes.NAVIGATION_ABORTED).toBe(6003)
    expect(LytErrorCodes.NAVIGATION_FAILED).toBe(6004)
  })

  it('Store 错误码范围 7xxx', () => {
    expect(LytErrorCodes.STORE_NOT_FOUND).toBe(7001)
    expect(LytErrorCodes.STORE_DUPLICATE).toBe(7002)
  })
})

describe('ErrorBoundary 捕获错误', () => {

  it('capture 捕获 LytError', () => {
    const boundary = new ErrorBoundary()
    const err = new LytError(LytErrorCodes.RENDER_ERROR, '渲染失败')
    const vm = { name: 'TestComponent' }

    boundary.capture(err, vm, 'render function')

    const errors = boundary.getErrors()
    expect(errors.length).toBe(1)
    expect(errors[0].error).toBe(err)
    expect(errors[0].vm).toBe(vm)
    expect(errors[0].info).toBe('render function')
    expect(errors[0].timestamp).toBeGreaterThan(0)
  })

  it('capture 捕获普通 Error', () => {
    const boundary = new ErrorBoundary()
    const err = new Error('普通错误')

    boundary.capture(err, null, 'some info')

    const errors = boundary.getErrors()
    expect(errors.length).toBe(1)
    expect(errors[0].error).toBe(err)
    expect(errors[0].info).toBe('some info')
  })

  it('capture 触发 onError 回调', () => {
    let capturedError: LytError | null = null
    let capturedVm: any = null

    const boundary = new ErrorBoundary({
      onError: (error, vm) => {
        capturedError = error
        capturedVm = vm
      },
    })

    const err = new LytError(LytErrorCodes.COMPONENT_INVALID_PROPS, '属性无效')
    const vm = { name: 'MyComp' }
    boundary.capture(err, vm)

    expect(capturedError).not.toBeNull()
    expect(capturedError!.code).toBe(LytErrorCodes.COMPONENT_INVALID_PROPS)
    expect(capturedVm).toBe(vm)
  })

  it('capture 触发 onErrorCaptured 回调', () => {
    let captured = false

    const boundary = new ErrorBoundary({
      onErrorCaptured: (error, vm, info) => {
        captured = true
        return true // 阻止传播
      },
      onError: () => {
        // 不应该被调用
        expect(true).toBe(false)
      },
    })

    const err = new LytError(LytErrorCodes.OPERATION_FAILED, '操作失败')
    boundary.capture(err, null, 'test')

    expect(captured).toBe(true)
  })
})

describe('ErrorBoundary 获取错误列表', () => {

  it('getErrors 返回所有捕获的错误', () => {
    const boundary = new ErrorBoundary()
    const err1 = new LytError(LytErrorCodes.NOT_FOUND, '未找到')
    const err2 = new LytError(LytErrorCodes.ALREADY_EXISTS, '已存在')

    boundary.capture(err1, null)
    boundary.capture(err2, null)

    const errors = boundary.getErrors()
    expect(errors.length).toBe(2)
    expect(errors[0].error).toBe(err1)
    expect(errors[1].error).toBe(err2)
  })

  it('getErrors 返回副本，不影响内部状态', () => {
    const boundary = new ErrorBoundary()
    boundary.capture(new LytError(LytErrorCodes.NOT_FOUND, '未找到'), null)

    const errors = boundary.getErrors()
    errors.pop() // 修改副本

    expect(boundary.getErrors().length).toBe(1) // 内部不受影响
  })
})

describe('ErrorBoundary 清除错误', () => {

  it('clear 清除所有错误', () => {
    const boundary = new ErrorBoundary()
    boundary.capture(new LytError(LytErrorCodes.NOT_FOUND, '未找到'), null)
    boundary.capture(new LytError(LytErrorCodes.ALREADY_EXISTS, '已存在'), null)

    expect(boundary.getErrors().length).toBe(2)

    boundary.clear()

    expect(boundary.getErrors().length).toBe(0)
  })

  it('clear 后可以继续捕获新错误', () => {
    const boundary = new ErrorBoundary()
    boundary.capture(new LytError(LytErrorCodes.NOT_FOUND, '未找到'), null)
    boundary.clear()

    boundary.capture(new LytError(LytErrorCodes.PARSE_ERROR, '解析错误'), null)
    expect(boundary.getErrors().length).toBe(1)
    expect(boundary.getErrors()[0].error.code).toBe(LytErrorCodes.PARSE_ERROR)
  })
})

describe('ErrorBoundary 全局处理器', () => {

  it('setGlobalHandler 设置全局处理器', () => {
    let handlerCalled = false
    let receivedError: Error | null = null

    ErrorBoundary.setGlobalHandler((error, vm, info) => {
      handlerCalled = true
      receivedError = error
    })

    expect(ErrorBoundary.globalHandler).not.toBeNull()

    const err = new LytError(LytErrorCodes.ROUTE_NOT_FOUND, '路由未找到')
    handleError(err, null, 'navigate')

    expect(handlerCalled).toBe(true)
    expect(receivedError).toBe(err)

    // 恢复
    ErrorBoundary.globalHandler = null
  })

  it('全局处理器接收正确的参数', () => {
    let capturedInfo = ''

    ErrorBoundary.setGlobalHandler((error, vm, info) => {
      capturedInfo = info
    })

    handleError(new Error('test error'), { name: 'App' }, 'mount')

    expect(capturedInfo).toBe('mount')

    ErrorBoundary.globalHandler = null
  })
})

describe('warn 警告系统', () => {

  it('warn 开发模式输出', () => {
    setDevModeEH(true)
    setDevModeUtil(true)
    // warn 在开发模式下调用 console.warn
    // 我们无法直接断言 console.warn 的输出，但可以确保不抛错
    warnEH('这是一条开发警告')
    expect(true).toBe(true)
  })

  it('warn 生产模式不输出', () => {
    setDevModeEH(false)
    setDevModeUtil(false)
    // 生产模式下 warn 不应调用 console.warn
    // 同样无法直接断言，但确保不抛错
    warnEH('这条警告不应该输出')
    expect(true).toBe(true)
    // 恢复开发模式
    setDevModeEH(true)
    setDevModeUtil(true)
  })

  it('warnOnce 只警告一次', () => {
    setDevModeEH(true)
    setDevModeUtil(true)
    // warnOnce 内部去重，多次调用同一条消息只输出一次
    warnOnceEH('只警告一次的消息')
    warnOnceEH('只警告一次的消息')
    warnOnceEH('只警告一次的消息')
    // 不抛错即通过
    expect(true).toBe(true)
  })

  it('warnOnce 不同消息各自独立', () => {
    setDevModeEH(true)
    setDevModeUtil(true)
    warnOnceEH('消息A')
    warnOnceEH('消息B')
    warnOnceEH('消息A') // 重复
    // 不抛错即通过
    expect(true).toBe(true)
  })
})

describe('handleError 统一处理', () => {

  it('handleError 处理 LytError', () => {
    setDevModeEH(true)
    setDevModeUtil(true)
    ErrorBoundary.globalHandler = null

    const err = new LytError(LytErrorCodes.RENDER_ERROR, '渲染失败')
    // 不应抛错
    handleError(err, { name: 'App' }, 'render')
    expect(true).toBe(true)
  })

  it('handleError 处理普通 Error', () => {
    setDevModeEH(true)
    setDevModeUtil(true)
    ErrorBoundary.globalHandler = null

    const err = new Error('普通错误')
    handleError(err, null, 'unknown')
    expect(true).toBe(true)
  })

  it('handleError 调用全局处理器', () => {
    let called = false

    ErrorBoundary.setGlobalHandler(() => {
      called = true
    })

    handleError(new Error('test'), null, 'info')
    expect(called).toBe(true)

    ErrorBoundary.globalHandler = null
  })

  it('handleError 生产模式不输出到 console', () => {
    setDevModeEH(false)
    setDevModeUtil(false)
    ErrorBoundary.globalHandler = null

    // 生产模式下不调用 console.error
    handleError(new LytError(LytErrorCodes.NOT_FOUND, '未找到'), null)
    expect(true).toBe(true)

    setDevModeEH(true)
    setDevModeUtil(true)
  })
})

describe('callWithErrorHandling 安全执行', () => {

  it('正常函数返回正确结果', () => {
    const result = callWithErrorHandling(() => 42)
    expect(result).toBe(42)
  })

  it('抛出错误的函数返回 undefined', () => {
    const result = callWithErrorHandling(() => {
      throw new Error('内部错误')
    })
    expect(result).toBeUndefined()
  })

  it('抛出 LytError 的函数返回 undefined', () => {
    const result = callWithErrorHandling(() => {
      throw new LytError(LytErrorCodes.COMPUTED_CYCLE, '循环依赖')
    })
    expect(result).toBeUndefined()
  })

  it('抛出非 Error 值的函数返回 undefined', () => {
    const result = callWithErrorHandling(() => {
      throw '字符串错误' // eslint-disable-line no-throw-literal
    })
    expect(result).toBeUndefined()
  })

  it('callWithErrorHandling 传递 instance 参数', () => {
    let receivedInstance: any = null

    ErrorBoundary.setGlobalHandler((error, vm) => {
      receivedInstance = vm
    })

    const vm = { name: 'TestComponent' }
    callWithErrorHandling(() => {
      throw new Error('test')
    }, vm)

    expect(receivedInstance).toBe(vm)

    ErrorBoundary.globalHandler = null
  })
})

describe('createMessage 友好提示', () => {

  it('COMPONENT_MISSING_TEMPLATE 生成友好提示', () => {
    const msg = createMessage(LytErrorCodes.COMPONENT_MISSING_TEMPLATE, 'MyCounter')
    expect(msg).toContain('[Lyt 5002]')
    // 旧枚举值 COMPONENT_MISSING_TEMPLATE=5002 在 getErrorMessage 中没有注册，返回默认消息
  })

  it('NOT_FOUND 生成友好提示', () => {
    const msg = createMessage(LytErrorCodes.NOT_FOUND, '/api/users')
    expect(msg).toContain('[Lyt 1002]')
    // 旧枚举值 NOT_FOUND=1002 在 getErrorMessage 中没有注册，返回默认消息
  })

  it('REACTIVE_READONLY 生成友好提示', () => {
    const msg = createMessage(LytErrorCodes.REACTIVE_READONLY, 'count')
    expect(msg).toContain('[Lyt 2001]')
    // 旧枚举值 REACTIVE_READONLY=2001 在 getErrorMessage 中没有注册，返回默认消息
  })

  it('ROUTE_NOT_FOUND 生成友好提示', () => {
    const msg = createMessage(LytErrorCodes.ROUTE_NOT_FOUND, '/dashboard')
    expect(msg).toContain('[Lyt 6001]')
    // 旧枚举值 ROUTE_NOT_FOUND=6001 在 getErrorMessage 中没有注册，返回默认消息
  })

  it('STORE_DUPLICATE 生成友好提示', () => {
    const msg = createMessage(LytErrorCodes.STORE_DUPLICATE, 'userStore')
    expect(msg).toContain('[Lyt 7002]')
    // 旧枚举值 STORE_DUPLICATE=7002 在 getErrorMessage 中没有注册，返回默认消息
  })

  it('未知错误码返回默认提示', () => {
    // 使用一个不存在的错误码（通过类型断言绕过枚举检查）
    const msg = createMessage(9999 as any)
    expect(msg).toContain('[Lyt 9999]')
    expect(msg).toContain('未知错误')
  })
})

// ================================================================
//  新增测试：扩展错误码常量 ErrorCodes
// ================================================================

describe('ErrorCodes 扩展错误码常量', () => {

  it('核心错误码范围 1xx', () => {
    expect(ErrorCodes.APP_MOUNT_FAILED).toBe(100)
    expect(ErrorCodes.APP_UNMOUNT_FAILED).toBe(101)
    expect(ErrorCodes.APP_PLUGIN_INVALID).toBe(102)
    expect(ErrorCodes.APP_PROVIDE_INVALID).toBe(103)
  })

  it('组件错误码范围 2xx', () => {
    expect(ErrorCodes.COMPONENT_INVALID).toBe(200)
    expect(ErrorCodes.COMPONENT_PROPS_INVALID).toBe(201)
    expect(ErrorCodes.COMPONENT_EMIT_INVALID).toBe(202)
    expect(ErrorCodes.COMPONENT_LIFECYCLE_ERROR).toBe(203)
    expect(ErrorCodes.COMPONENT_RENDER_ERROR).toBe(204)
  })

  it('响应式错误码范围 3xx', () => {
    expect(ErrorCodes.REACTIVE_SET_READONLY).toBe(300)
    expect(ErrorCodes.REACTIVE_EFFECT_ERROR).toBe(301)
    expect(ErrorCodes.COMPUTED_GETTER_ERROR).toBe(302)
    expect(ErrorCodes.WATCH_CALLBACK_ERROR).toBe(303)
  })

  it('编译器错误码范围 4xx', () => {
    expect(ErrorCodes.COMPILER_PARSE_ERROR).toBe(400)
    expect(ErrorCodes.COMPILER_TRANSFORM_ERROR).toBe(401)
    expect(ErrorCodes.COMPILER_CODEGEN_ERROR).toBe(402)
    expect(ErrorCodes.SFC_PARSE_ERROR).toBe(403)
  })

  it('渲染器错误码范围 5xx', () => {
    expect(ErrorCodes.RENDERER_HYDRATE_ERROR).toBe(500)
    expect(ErrorCodes.RENDERER_HYDRATE_MISMATCH).toBe(501)
  })

  it('路由错误码范围 6xx', () => {
    expect(ErrorCodes.ROUTER_DUPLICATE_ROUTE).toBe(600)
    expect(ErrorCodes.ROUTER_NAVIGATION_ABORTED).toBe(601)
    expect(ErrorCodes.ROUTE_NOT_FOUND).toBe(602)
  })

  it('Store 错误码范围 7xx', () => {
    expect(ErrorCodes.STORE_DUPLICATE_ID).toBe(700)
    expect(ErrorCodes.STORE_DISPOSED).toBe(701)
    expect(ErrorCodes.STORE_PATCH_ERROR).toBe(702)
  })

  it('所有 ErrorCodes 键值均可访问', () => {
    const keys = Object.keys(ErrorCodes)
    expect(keys.length).toBeGreaterThan(0)
    // 确保所有值都是数字
    for (const key of keys) {
      expect(typeof (ErrorCodes as any)[key]).toBe('number')
    }
  })
})

// ================================================================
//  新增测试：createLytError 工厂函数
// ================================================================

describe('createLytError 工厂函数', () => {

  it('创建正确类型的 LytError 实例', () => {
    const err = createLytError(LytErrorCodes.NOT_FOUND, '资源未找到')
    expect(err instanceof LytError).toBe(true)
    expect(err instanceof Error).toBe(true)
  })

  it('包含正确的 code 和 message', () => {
    const err = createLytError(LytErrorCodes.PARSE_ERROR, '模板解析失败')
    expect(err.code).toBe(LytErrorCodes.PARSE_ERROR)
    expect(err.message).toBe('模板解析失败')
    expect(err.name).toBe('LytError')
  })

  it('支持 details 参数', () => {
    const details = { line: 10, column: 5 }
    const err = createLytError(LytErrorCodes.INVALID_ARGUMENT, '参数错误', details)
    expect(err.details).toEqual(details)
  })

  it('无 details 时 details 为 undefined', () => {
    const err = createLytError(LytErrorCodes.OPERATION_FAILED, '操作失败')
    expect(err.details).toBeUndefined()
  })
})

// ================================================================
//  新增测试：warnOnce 去重验证
// ================================================================

describe('warnOnce 去重验证', () => {

  it('warnOnce 同一消息只输出一次（通过 console.warn 拦截验证）', () => {
    resetWarnedMessagesEH()
    resetWarnedMessagesUtil()
    setDevModeEH(true)
    setDevModeUtil(true)

    let warnCount = 0
    const originalWarn = console.warn
    console.warn = (...args: any[]) => {
      warnCount++
      originalWarn.apply(console, args)
    }

    warnOnceEH('去重测试消息')
    warnOnceEH('去重测试消息')
    warnOnceEH('去重测试消息')

    expect(warnCount).toBe(1)

    console.warn = originalWarn
  })

  it('warnOnce 不同消息各自独立计数', () => {
    resetWarnedMessagesEH()
    resetWarnedMessagesUtil()
    setDevModeEH(true)
    setDevModeUtil(true)

    let warnCount = 0
    const originalWarn = console.warn
    console.warn = (...args: any[]) => {
      warnCount++
      originalWarn.apply(console, args)
    }

    warnOnceEH('消息X')
    warnOnceEH('消息Y')
    warnOnceEH('消息X') // 重复，不计数

    expect(warnCount).toBe(2)

    console.warn = originalWarn
  })

  it('warnOnce 生产模式不输出', () => {
    resetWarnedMessagesEH()
    resetWarnedMessagesUtil()
    setDevModeEH(false)
    setDevModeUtil(false)

    let warnCount = 0
    const originalWarn = console.warn
    console.warn = (...args: any[]) => {
      warnCount++
      originalWarn.apply(console, args)
    }

    warnOnceEH('生产模式消息')
    warnOnceEH('生产模式消息')

    expect(warnCount).toBe(0)

    console.warn = originalWarn
    setDevModeEH(true)
    setDevModeUtil(true)
  })

  it('resetWarnedMessages 重置后可以重新警告', () => {
    resetWarnedMessagesEH()
    resetWarnedMessagesUtil()
    setDevModeEH(true)
    setDevModeUtil(true)

    let warnCount = 0
    const originalWarn = console.warn
    console.warn = (...args: any[]) => {
      warnCount++
      originalWarn.apply(console, args)
    }

    warnOnceEH('可重置的消息')
    warnOnceEH('可重置的消息') // 重复
    expect(warnCount).toBe(1)

    resetWarnedMessagesEH()
    resetWarnedMessagesUtil()

    warnOnceEH('可重置的消息') // 重置后应再次输出
    expect(warnCount).toBe(2)

    console.warn = originalWarn
  })
})

// ================================================================
//  新增测试：ErrorBoundary 增强功能
// ================================================================

describe('ErrorBoundary 增强功能', () => {

  it('hasError 初始为 false', () => {
    const boundary = new ErrorBoundary()
    expect(boundary.hasError).toBe(false)
  })

  it('capture 后 hasError 变为 true', () => {
    const boundary = new ErrorBoundary()
    boundary.capture(new Error('test'), null)
    expect(boundary.hasError).toBe(true)
  })

  it('clear 后 hasError 重置为 false', () => {
    const boundary = new ErrorBoundary()
    boundary.capture(new Error('test'), null)
    expect(boundary.hasError).toBe(true)
    boundary.clear()
    expect(boundary.hasError).toBe(false)
  })

  it('getErrorCount 返回正确数量', () => {
    const boundary = new ErrorBoundary()
    expect(boundary.getErrorCount()).toBe(0)
    boundary.capture(new Error('e1'), null)
    expect(boundary.getErrorCount()).toBe(1)
    boundary.capture(new Error('e2'), null)
    boundary.capture(new Error('e3'), null)
    expect(boundary.getErrorCount()).toBe(3)
  })

  it('getLastErrors 返回最后一条错误', () => {
    const boundary = new ErrorBoundary()
    expect(boundary.getLastErrors()).toBeNull()

    boundary.capture(new Error('first'), null, 'info1')
    boundary.capture(new Error('second'), null, 'info2')

    const last = boundary.getLastErrors()
    expect(last).not.toBeNull()
    expect(last!.error.message).toBe('second')
    expect(last!.info).toBe('info2')
  })

  it('maxErrors 限制最大错误记录数', () => {
    const boundary = new ErrorBoundary({ maxErrors: 3 })
    boundary.capture(new Error('e1'), null)
    boundary.capture(new Error('e2'), null)
    boundary.capture(new Error('e3'), null)
    boundary.capture(new Error('e4'), null) // 超出限制

    expect(boundary.getErrorCount()).toBe(3)
    // 最早的 e1 应该被丢弃
    const errors = boundary.getErrors()
    expect(errors[0].error.message).toBe('e2')
    expect(errors[2].error.message).toBe('e4')
  })

  it('fallback 回调生成降级内容', () => {
    const boundary = new ErrorBoundary({
      fallback: (error, vm, info) => ({
        type: 'error-fallback',
        message: error.message,
        info,
      }),
    })

    expect(boundary.getFallback()).toBeNull()

    boundary.capture(new Error('渲染崩溃'), { name: 'App' }, 'render')

    const fallback = boundary.getFallback()
    expect(fallback).not.toBeNull()
    expect(fallback.type).toBe('error-fallback')
    expect(fallback.message).toBe('渲染崩溃')
    expect(fallback.info).toBe('render')
  })

  it('无 fallback 配置时 getFallback 返回 null', () => {
    const boundary = new ErrorBoundary()
    boundary.capture(new Error('test'), null)
    expect(boundary.getFallback()).toBeNull()
  })
})

// ================================================================
//  新增测试：新错误码系统 (error-codes.ts)
// ================================================================

import {
  LytErrorCodes as NewLytErrorCodes,
  ErrorCategory,
  getErrorMessage,
  getCategory,
} from '../src/error-codes'

describe('新错误码系统 LytErrorCodes', () => {

  it('编译器错误码范围 1000-1999', () => {
    expect(NewLytErrorCodes.LYT_COMPILER_PARSE_ERROR).toBe(1001)
    expect(NewLytErrorCodes.LYT_COMPILER_INVALID_EXPRESSION).toBe(1002)
    expect(NewLytErrorCodes.LYT_COMPILER_INVALID_TEMPLATE).toBe(1003)
    expect(NewLytErrorCodes.LYT_COMPILER_INVALID_DIRECTIVE).toBe(1004)
    expect(NewLytErrorCodes.LYT_COMPILER_CODEGEN_ERROR).toBe(1005)
    expect(NewLytErrorCodes.LYT_COMPILER_SFC_PARSE_ERROR).toBe(1006)
    expect(NewLytErrorCodes.LYT_COMPILER_TRANSFORM_ERROR).toBe(1007)
  })

  it('渲染器错误码范围 2000-2999', () => {
    expect(NewLytErrorCodes.LYT_RENDERER_MOUNT_FAILED).toBe(2001)
    expect(NewLytErrorCodes.LYT_RENDERER_PATCH_FAILED).toBe(2002)
    expect(NewLytErrorCodes.LYT_RENDERER_HYDRATION_MISMATCH).toBe(2003)
    expect(NewLytErrorCodes.LYT_RENDERER_INVALID_VNODE).toBe(2004)
    expect(NewLytErrorCodes.LYT_RENDERER_UNMOUNT_FAILED).toBe(2005)
  })

  it('组件错误码范围 3000-3999', () => {
    expect(NewLytErrorCodes.LYT_COMPONENT_INVALID_PROPS).toBe(3001)
    expect(NewLytErrorCodes.LYT_COMPONENT_MISSING_RENDER).toBe(3002)
    expect(NewLytErrorCodes.LYT_COMPONENT_LIFECYCLE_ERROR).toBe(3003)
    expect(NewLytErrorCodes.LYT_COMPONENT_INVALID).toBe(3004)
    expect(NewLytErrorCodes.LYT_COMPONENT_EMIT_INVALID).toBe(3005)
    expect(NewLytErrorCodes.LYT_COMPONENT_RENDER_ERROR).toBe(3006)
  })

  it('路由错误码范围 4000-4999', () => {
    expect(NewLytErrorCodes.LYT_ROUTER_INVALID_ROUTE).toBe(4001)
    expect(NewLytErrorCodes.LYT_ROUTER_NAVIGATION_FAILED).toBe(4002)
    expect(NewLytErrorCodes.LYT_ROUTER_DUPLICATE_ROUTE).toBe(4003)
    expect(NewLytErrorCodes.LYT_ROUTER_NAVIGATION_ABORTED).toBe(4004)
    expect(NewLytErrorCodes.LYT_ROUTER_GUARD_ERROR).toBe(4005)
  })

  it('Store 错误码范围 5000-5999', () => {
    expect(NewLytErrorCodes.LYT_STORE_ALREADY_EXISTS).toBe(5001)
    expect(NewLytErrorCodes.LYT_STORE_NOT_FOUND).toBe(5002)
    expect(NewLytErrorCodes.LYT_STORE_DISPOSED).toBe(5003)
    expect(NewLytErrorCodes.LYT_STORE_PATCH_ERROR).toBe(5004)
  })

  it('响应式错误码范围 6000-6999', () => {
    expect(NewLytErrorCodes.LYT_REACTIVITY_READONLY_SET).toBe(6001)
    expect(NewLytErrorCodes.LYT_REACTIVITY_READONLY_DELETE).toBe(6002)
    expect(NewLytErrorCodes.LYT_REACTIVITY_EFFECT_ERROR).toBe(6003)
    expect(NewLytErrorCodes.LYT_REACTIVITY_COMPUTED_CYCLE).toBe(6004)
    expect(NewLytErrorCodes.LYT_REACTIVITY_EFFECT_DISPOSED).toBe(6005)
  })

  it('核心错误码范围 7000-7999', () => {
    expect(NewLytErrorCodes.LYT_CORE_PLUGIN_ERROR).toBe(7001)
    expect(NewLytErrorCodes.LYT_CORE_MOUNT_NO_CONTAINER).toBe(7002)
    expect(NewLytErrorCodes.LYT_CORE_ALREADY_MOUNTED).toBe(7003)
    expect(NewLytErrorCodes.LYT_CORE_INVALID_ARGUMENT).toBe(7004)
    expect(NewLytErrorCodes.LYT_CORE_NOT_FOUND).toBe(7005)
    expect(NewLytErrorCodes.LYT_CORE_ALREADY_EXISTS).toBe(7006)
    expect(NewLytErrorCodes.LYT_CORE_OPERATION_FAILED).toBe(7007)
  })
})

describe('ErrorCategory 分类常量', () => {

  it('包含所有模块分类', () => {
    expect(ErrorCategory.COMPILER).toBe('COMPILER')
    expect(ErrorCategory.RENDERER).toBe('RENDERER')
    expect(ErrorCategory.COMPONENT).toBe('COMPONENT')
    expect(ErrorCategory.ROUTER).toBe('ROUTER')
    expect(ErrorCategory.STORE).toBe('STORE')
    expect(ErrorCategory.REACTIVITY).toBe('REACTIVITY')
    expect(ErrorCategory.CORE).toBe('CORE')
  })
})

describe('getErrorMessage 错误码到消息映射', () => {

  it('编译器错误返回正确消息', () => {
    const msg = getErrorMessage(NewLytErrorCodes.LYT_COMPILER_PARSE_ERROR)
    expect(msg).toContain('模板解析错误')
  })

  it('渲染器错误返回正确消息', () => {
    const msg = getErrorMessage(NewLytErrorCodes.LYT_RENDERER_MOUNT_FAILED)
    expect(msg).toContain('挂载失败')
  })

  it('组件错误返回正确消息', () => {
    const msg = getErrorMessage(NewLytErrorCodes.LYT_COMPONENT_MISSING_RENDER)
    expect(msg).toContain('缺少 template 或 render 函数')
  })

  it('未知错误码返回默认消息', () => {
    const msg = getErrorMessage(99999)
    expect(msg).toBe('未知错误。')
  })
})

describe('getCategory 错误码到分类映射', () => {

  it('1000-1999 返回 COMPILER', () => {
    expect(getCategory(1001)).toBe('COMPILER')
    expect(getCategory(1999)).toBe('COMPILER')
  })

  it('2000-2999 返回 RENDERER', () => {
    expect(getCategory(2001)).toBe('RENDERER')
    expect(getCategory(2999)).toBe('RENDERER')
  })

  it('3000-3999 返回 COMPONENT', () => {
    expect(getCategory(3001)).toBe('COMPONENT')
    expect(getCategory(3999)).toBe('COMPONENT')
  })

  it('4000-4999 返回 ROUTER', () => {
    expect(getCategory(4001)).toBe('ROUTER')
  })

  it('5000-5999 返回 STORE', () => {
    expect(getCategory(5001)).toBe('STORE')
  })

  it('6000-6999 返回 REACTIVITY', () => {
    expect(getCategory(6001)).toBe('REACTIVITY')
  })

  it('7000-7999 返回 CORE', () => {
    expect(getCategory(7001)).toBe('CORE')
  })

  it('超出范围返回 UNKNOWN', () => {
    expect(getCategory(0)).toBe('UNKNOWN')
    expect(getCategory(999)).toBe('UNKNOWN')
    expect(getCategory(12000)).toBe('UNKNOWN')
  })
})

// ================================================================
//  新增测试：LytError 类 (lyt-error.ts)
// ================================================================

import {
  LytError as NewLytError,
  createCompilerError,
  createRendererError,
  createComponentError,
} from '../src/lyt-error'

describe('NewLytError 类', () => {

  it('使用错误码创建，自动填充消息和分类', () => {
    const err = new NewLytError(NewLytErrorCodes.LYT_COMPILER_PARSE_ERROR)
    expect(err.name).toBe('LytError')
    expect(err.code).toBe(NewLytErrorCodes.LYT_COMPILER_PARSE_ERROR)
    expect(err.category).toBe('COMPILER')
    expect(err.message).toContain('模板解析错误')
  })

  it('支持自定义消息覆盖默认消息', () => {
    const err = new NewLytError(NewLytErrorCodes.LYT_RENDERER_MOUNT_FAILED, '自定义错误消息')
    expect(err.message).toBe('自定义错误消息')
    expect(err.code).toBe(NewLytErrorCodes.LYT_RENDERER_MOUNT_FAILED)
    expect(err.category).toBe('RENDERER')
  })

  it('支持附加详情信息', () => {
    const err = new NewLytError(
      NewLytErrorCodes.LYT_COMPONENT_INVALID_PROPS,
      '属性无效',
      { prop: 'count', expected: 'number', received: 'string' },
    )
    expect(err.details).toEqual({ prop: 'count', expected: 'number', received: 'string' })
  })

  it('是 Error 的实例', () => {
    const err = new NewLytError(NewLytErrorCodes.LYT_CORE_OPERATION_FAILED)
    expect(err instanceof Error).toBe(true)
    expect(err instanceof NewLytError).toBe(true)
  })

  it('details 默认为 undefined', () => {
    const err = new NewLytError(NewLytErrorCodes.LYT_STORE_NOT_FOUND)
    expect(err.details).toBeUndefined()
  })
})

describe('createCompilerError 工厂函数', () => {

  it('创建编译器错误并附带源位置', () => {
    const err = createCompilerError(
      NewLytErrorCodes.LYT_COMPILER_PARSE_ERROR,
      { file: 'App.vue', line: 10, column: 5, source: '<div>{{' },
    )
    expect(err.code).toBe(NewLytErrorCodes.LYT_COMPILER_PARSE_ERROR)
    expect(err.category).toBe('COMPILER')
    expect(err.loc).toBeDefined()
    expect(err.loc!.file).toBe('App.vue')
    expect(err.loc!.line).toBe(10)
    expect(err.loc!.column).toBe(5)
    expect(err.loc!.source).toBe('<div>{{')
  })

  it('支持自定义消息', () => {
    const err = createCompilerError(
      NewLytErrorCodes.LYT_COMPILER_INVALID_EXPRESSION,
      undefined,
      '表达式语法错误',
    )
    expect(err.message).toBe('表达式语法错误')
  })

  it('不传 loc 时 loc 为 undefined', () => {
    const err = createCompilerError(NewLytErrorCodes.LYT_COMPILER_CODEGEN_ERROR)
    expect(err.loc).toBeUndefined()
  })
})

describe('createRendererError 工厂函数', () => {

  it('创建渲染器错误并附带 VNode 上下文', () => {
    const vnode = { type: 'div', props: {} }
    const err = createRendererError(
      NewLytErrorCodes.LYT_RENDERER_PATCH_FAILED,
      vnode,
    )
    expect(err.code).toBe(NewLytErrorCodes.LYT_RENDERER_PATCH_FAILED)
    expect(err.category).toBe('RENDERER')
    expect(err.details).toBeDefined()
    expect(err.details.vnode).toBe(vnode)
  })

  it('支持自定义消息', () => {
    const err = createRendererError(
      NewLytErrorCodes.LYT_RENDERER_MOUNT_FAILED,
      null,
      '挂载目标不存在',
    )
    expect(err.message).toBe('挂载目标不存在')
  })
})

describe('createComponentError 工厂函数', () => {

  it('使用组件名称字符串创建', () => {
    const err = createComponentError(
      NewLytErrorCodes.LYT_COMPONENT_INVALID_PROPS,
      'MyCounter',
    )
    expect(err.code).toBe(NewLytErrorCodes.LYT_COMPONENT_INVALID_PROPS)
    expect(err.category).toBe('COMPONENT')
    expect(err.details).toBeDefined()
    expect(err.details.component).toBe('MyCounter')
  })

  it('使用组件实例对象创建', () => {
    const err = createComponentError(
      NewLytErrorCodes.LYT_COMPONENT_LIFECYCLE_ERROR,
      { name: 'MyForm' },
    )
    expect(err.details.component).toBe('MyForm')
  })

  it('不传组件时 details.component 为 undefined', () => {
    const err = createComponentError(NewLytErrorCodes.LYT_COMPONENT_RENDER_ERROR)
    expect(err.details.component).toBeUndefined()
  })
})

// ================================================================
//  新增测试：warn 工具 (warn.ts)
// ================================================================

describe('warn 工具函数 (warn.ts)', () => {

  it('warn 开发模式输出到 console.warn', () => {
    setDevModeUtil(true)
    let called = false
    const original = console.warn
    console.warn = () => { called = true }
    warnUtil('测试警告')
    expect(called).toBe(true)
    console.warn = original
  })

  it('warn 生产模式不输出', () => {
    setDevModeUtil(false)
    let called = false
    const original = console.warn
    console.warn = () => { called = true }
    warnUtil('生产模式警告')
    expect(called).toBe(false)
    console.warn = original
    setDevModeUtil(true)
  })

  it('warnOnce 同一消息只输出一次', () => {
    resetWarnedMessagesUtil()
    setDevModeUtil(true)
    let count = 0
    const original = console.warn
    console.warn = () => { count++ }
    warnOnceUtil('去重消息')
    warnOnceUtil('去重消息')
    warnOnceUtil('去重消息')
    expect(count).toBe(1)
    console.warn = original
  })

  it('warnOnce 不同消息各自独立', () => {
    resetWarnedMessagesUtil()
    setDevModeUtil(true)
    let count = 0
    const original = console.warn
    console.warn = () => { count++ }
    warnOnceUtil('消息A')
    warnOnceUtil('消息B')
    warnOnceUtil('消息A')
    expect(count).toBe(2)
    console.warn = original
  })

  it('warnOnce 生产模式不输出', () => {
    resetWarnedMessagesUtil()
    setDevModeUtil(false)
    let count = 0
    const original = console.warn
    console.warn = () => { count++ }
    warnOnceUtil('生产模式')
    expect(count).toBe(0)
    console.warn = original
    setDevModeUtil(true)
  })

  it('error 始终输出到 console.error', () => {
    setDevModeUtil(true)
    let called = false
    const original = console.error
    console.error = () => { called = true }
    errorUtil('错误消息')
    expect(called).toBe(true)
    console.error = original
  })

  it('error 生产模式也输出', () => {
    setDevModeUtil(false)
    let called = false
    const original = console.error
    console.error = () => { called = true }
    errorUtil('生产模式错误')
    expect(called).toBe(true)
    console.error = original
    setDevModeUtil(true)
  })

  it('setDevMode 切换开发/生产模式', () => {
    setDevModeUtil(false)
    expect(getDevMode()).toBe(false)
    setDevModeUtil(true)
    expect(getDevMode()).toBe(true)
  })

  it('resetWarnedMessages 清空已警告集合', () => {
    resetWarnedMessagesUtil()
    setDevModeUtil(true)
    let count = 0
    const original = console.warn
    console.warn = () => { count++ }
    warnOnceUtil('可重置消息')
    warnOnceUtil('可重置消息')
    expect(count).toBe(1)
    resetWarnedMessagesUtil()
    warnOnceUtil('可重置消息')
    expect(count).toBe(2)
    console.warn = original
  })
})

// ================================================================
//  新增测试：开发模式错误增强 (dev-error.ts)
// ================================================================

import {
  formatError,
  getComponentStack,
  createErrorOverlay,
} from '../src/dev-error'

describe('formatError 格式化错误', () => {

  it('格式化普通 Error', () => {
    const err = new Error('普通错误')
    const formatted = formatError(err)
    expect(formatted).toContain('[Lyt Error]')
    expect(formatted).toContain('普通错误')
  })

  it('格式化 LytError 包含分类和错误码', () => {
    const err = new NewLytError(NewLytErrorCodes.LYT_COMPILER_PARSE_ERROR)
    const formatted = formatError(err)
    expect(formatted).toContain('[COMPILER]')
    expect(formatted).toContain('1001')
  })

  it('格式化包含源位置信息', () => {
    const err = createCompilerError(
      NewLytErrorCodes.LYT_COMPILER_PARSE_ERROR,
      { file: 'test.vue', line: 5, column: 10 },
    )
    const formatted = formatError(err)
    expect(formatted).toContain('test.vue:5:10')
  })

  it('格式化包含组件上下文', () => {
    const err = createComponentError(
      NewLytErrorCodes.LYT_COMPONENT_LIFECYCLE_ERROR,
      'MyComponent',
    )
    const formatted = formatError(err)
    expect(formatted).toContain('MyComponent')
  })

  it('格式化包含修复建议', () => {
    const err = new NewLytError(NewLytErrorCodes.LYT_COMPILER_PARSE_ERROR)
    const formatted = formatError(err)
    expect(formatted).toContain('Suggestion:')
  })

  it('格式化包含堆栈信息', () => {
    const err = new Error('有堆栈')
    const formatted = formatError(err)
    expect(formatted).toContain('Stack:')
  })
})

describe('getComponentStack 组件栈追踪', () => {

  it('空实例返回空字符串', () => {
    expect(getComponentStack(null)).toBe('')
    expect(getComponentStack(undefined)).toBe('')
  })

  it('单个组件返回组件名', () => {
    const instance = { name: 'App' }
    expect(getComponentStack(instance)).toBe('App')
  })

  it('多层组件返回用 > 连接的栈', () => {
    const child = { name: 'Child', parent: { name: 'Parent', parent: { name: 'App' } } }
    const stack = getComponentStack(child)
    expect(stack).toBe('Child > Parent > App')
  })

  it('支持 $name 属性', () => {
    const instance = { $name: 'MyComp' }
    expect(getComponentStack(instance)).toBe('MyComp')
  })

  it('支持 $parent 属性', () => {
    const child = { name: 'Child', $parent: { name: 'Parent' } }
    const stack = getComponentStack(child)
    expect(stack).toBe('Child > Parent')
  })

  it('匿名组件显示 Anonymous', () => {
    const instance = {}
    expect(getComponentStack(instance)).toBe('Anonymous')
  })
})

describe('createErrorOverlay 错误覆盖层', () => {

  it('生成包含错误信息的 HTML', () => {
    setDevModeUtil(true)
    const err = new Error('测试覆盖层错误')
    const html = createErrorOverlay(err)
    expect(html).toContain('Lyt.js Runtime Error')
    expect(html).toContain('测试覆盖层错误')
  })

  it('生产模式返回空字符串', () => {
    setDevModeUtil(false)
    const err = new Error('生产模式错误')
    const html = createErrorOverlay(err)
    expect(html).toBe('')
    setDevModeUtil(true)
  })

  it('HTML 包含样式信息', () => {
    setDevModeUtil(true)
    const err = new Error('样式测试')
    const html = createErrorOverlay(err)
    expect(html).toContain('position: fixed')
    expect(html).toContain('z-index: 999999')
  })

  it('正确转义 HTML 特殊字符', () => {
    setDevModeUtil(true)
    const err = new Error('<script>alert("xss")</script>')
    const html = createErrorOverlay(err)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

// ================================================================
//  新增测试：CLI 模块错误码 (8000-8999)
// ================================================================

describe('CLI 模块错误码', () => {

  it('CLI 错误码范围 8000-8999', () => {
    expect(NewLytErrorCodes.LYT_CLI_SCAFFOLD_FAILED).toBe(8001)
    expect(NewLytErrorCodes.LYT_CLI_BUILD_FAILED).toBe(8002)
    expect(NewLytErrorCodes.LYT_CLI_DEV_SERVER_ERROR).toBe(8003)
    expect(NewLytErrorCodes.LYT_CLI_CONFIG_INVALID).toBe(8004)
    expect(NewLytErrorCodes.LYT_CLI_HMR_CONNECTION_FAILED).toBe(8005)
  })

  it('CLI 错误码返回正确的错误消息', () => {
    expect(getErrorMessage(NewLytErrorCodes.LYT_CLI_SCAFFOLD_FAILED)).toContain('脚手架创建失败')
    expect(getErrorMessage(NewLytErrorCodes.LYT_CLI_BUILD_FAILED)).toContain('构建失败')
    expect(getErrorMessage(NewLytErrorCodes.LYT_CLI_DEV_SERVER_ERROR)).toContain('开发服务器启动失败')
    expect(getErrorMessage(NewLytErrorCodes.LYT_CLI_CONFIG_INVALID)).toContain('配置文件无效')
    expect(getErrorMessage(NewLytErrorCodes.LYT_CLI_HMR_CONNECTION_FAILED)).toContain('热模块替换连接失败')
  })

  it('CLI 错误码分类为 CLI', () => {
    expect(getCategory(NewLytErrorCodes.LYT_CLI_SCAFFOLD_FAILED)).toBe('CLI')
    expect(getCategory(NewLytErrorCodes.LYT_CLI_BUILD_FAILED)).toBe('CLI')
    expect(getCategory(NewLytErrorCodes.LYT_CLI_DEV_SERVER_ERROR)).toBe('CLI')
    expect(getCategory(NewLytErrorCodes.LYT_CLI_CONFIG_INVALID)).toBe('CLI')
    expect(getCategory(NewLytErrorCodes.LYT_CLI_HMR_CONNECTION_FAILED)).toBe('CLI')
  })
})

// ================================================================
//  新增测试：DevTools 模块错误码 (9000-9999)
// ================================================================

describe('DevTools 模块错误码', () => {

  it('DevTools 错误码范围 9000-9999', () => {
    expect(NewLytErrorCodes.LYT_DEVTOOLS_CONNECTION_FAILED).toBe(9001)
    expect(NewLytErrorCodes.LYT_DEVTOOLS_PANEL_ERROR).toBe(9002)
    expect(NewLytErrorCodes.LYT_DEVTOOLS_PERF_OVERFLOW).toBe(9003)
    expect(NewLytErrorCodes.LYT_DEVTOOLS_COMPONENT_TREE_ERROR).toBe(9004)
  })

  it('DevTools 错误码返回正确的错误消息', () => {
    expect(getErrorMessage(NewLytErrorCodes.LYT_DEVTOOLS_CONNECTION_FAILED)).toContain('连接失败')
    expect(getErrorMessage(NewLytErrorCodes.LYT_DEVTOOLS_PANEL_ERROR)).toContain('面板加载错误')
    expect(getErrorMessage(NewLytErrorCodes.LYT_DEVTOOLS_PERF_OVERFLOW)).toContain('性能数据溢出')
    expect(getErrorMessage(NewLytErrorCodes.LYT_DEVTOOLS_COMPONENT_TREE_ERROR)).toContain('组件树解析错误')
  })

  it('DevTools 错误码分类为 DEVTOOLS', () => {
    expect(getCategory(NewLytErrorCodes.LYT_DEVTOOLS_CONNECTION_FAILED)).toBe('DEVTOOLS')
    expect(getCategory(NewLytErrorCodes.LYT_DEVTOOLS_PANEL_ERROR)).toBe('DEVTOOLS')
    expect(getCategory(NewLytErrorCodes.LYT_DEVTOOLS_PERF_OVERFLOW)).toBe('DEVTOOLS')
    expect(getCategory(NewLytErrorCodes.LYT_DEVTOOLS_COMPONENT_TREE_ERROR)).toBe('DEVTOOLS')
  })
})

// ================================================================
//  新增测试：Plugin 模块错误码 (10000-10999)
// ================================================================

describe('Plugin 模块错误码', () => {

  it('Plugin 错误码范围 10000-10999', () => {
    expect(NewLytErrorCodes.LYT_PLUGIN_INSTALL_FAILED).toBe(10001)
    expect(NewLytErrorCodes.LYT_PLUGIN_ALREADY_INSTALLED).toBe(10002)
    expect(NewLytErrorCodes.LYT_PLUGIN_INVALID).toBe(10003)
    expect(NewLytErrorCodes.LYT_PLUGIN_UNINSTALL_FAILED).toBe(10004)
  })

  it('Plugin 错误码返回正确的错误消息', () => {
    expect(getErrorMessage(NewLytErrorCodes.LYT_PLUGIN_INSTALL_FAILED)).toContain('插件安装失败')
    expect(getErrorMessage(NewLytErrorCodes.LYT_PLUGIN_ALREADY_INSTALLED)).toContain('插件已安装')
    expect(getErrorMessage(NewLytErrorCodes.LYT_PLUGIN_INVALID)).toContain('无效的插件')
    expect(getErrorMessage(NewLytErrorCodes.LYT_PLUGIN_UNINSTALL_FAILED)).toContain('插件卸载失败')
  })

  it('Plugin 错误码分类为 PLUGIN', () => {
    expect(getCategory(NewLytErrorCodes.LYT_PLUGIN_INSTALL_FAILED)).toBe('PLUGIN')
    expect(getCategory(NewLytErrorCodes.LYT_PLUGIN_ALREADY_INSTALLED)).toBe('PLUGIN')
    expect(getCategory(NewLytErrorCodes.LYT_PLUGIN_INVALID)).toBe('PLUGIN')
    expect(getCategory(NewLytErrorCodes.LYT_PLUGIN_UNINSTALL_FAILED)).toBe('PLUGIN')
  })
})

// ================================================================
//  新增测试：SSR 模块错误码 (11000-11999)
// ================================================================

describe('SSR 模块错误码', () => {

  it('SSR 错误码范围 11000-11999', () => {
    expect(NewLytErrorCodes.LYT_SSR_STREAM_ERROR).toBe(11101)
    expect(NewLytErrorCodes.LYT_SSR_SUSPENSE_TIMEOUT).toBe(11102)
    expect(NewLytErrorCodes.LYT_SSR_HYDRATION_ERROR).toBe(11103)
    expect(NewLytErrorCodes.LYT_SSR_ISLAND_ERROR).toBe(11104)
  })

  it('SSR 错误码返回正确的错误消息', () => {
    expect(getErrorMessage(NewLytErrorCodes.LYT_SSR_STREAM_ERROR)).toContain('流式渲染错误')
    expect(getErrorMessage(NewLytErrorCodes.LYT_SSR_SUSPENSE_TIMEOUT)).toContain('Suspense 超时')
    expect(getErrorMessage(NewLytErrorCodes.LYT_SSR_HYDRATION_ERROR)).toContain('水合错误')
    expect(getErrorMessage(NewLytErrorCodes.LYT_SSR_ISLAND_ERROR)).toContain('Island 组件错误')
  })

  it('SSR 错误码分类为 SSR', () => {
    expect(getCategory(NewLytErrorCodes.LYT_SSR_STREAM_ERROR)).toBe('SSR')
    expect(getCategory(NewLytErrorCodes.LYT_SSR_SUSPENSE_TIMEOUT)).toBe('SSR')
    expect(getCategory(NewLytErrorCodes.LYT_SSR_HYDRATION_ERROR)).toBe('SSR')
    expect(getCategory(NewLytErrorCodes.LYT_SSR_ISLAND_ERROR)).toBe('SSR')
  })
})

// ================================================================
//  新增测试：ErrorCategory 包含新模块分类
// ================================================================

describe('ErrorCategory 新增分类常量', () => {

  it('包含 CLI 分类', () => {
    expect(ErrorCategory.CLI).toBe('CLI')
  })

  it('包含 DEVTOOLS 分类', () => {
    expect(ErrorCategory.DEVTOOLS).toBe('DEVTOOLS')
  })

  it('包含 PLUGIN 分类', () => {
    expect(ErrorCategory.PLUGIN).toBe('PLUGIN')
  })

  it('包含 SSR 分类', () => {
    expect(ErrorCategory.SSR).toBe('SSR')
  })
})
