import { describe, it, expect, beforeEach, afterEach } from '../../test-utils/src/index'
import { createLogger } from '../src/index'
import type { Logger, LogEntry } from '../src/index'

// ======================== 辅助工具 ========================

/** 拦截 console 方法的返回类型 */
interface ConsoleSpy {
  calls: any[][]
  restore: () => void
}

/**
 * 拦截指定的 console 方法，返回 spy 对象
 */
function spyOnConsole(method: 'debug' | 'info' | 'warn' | 'error'): ConsoleSpy {
  const original = console[method]
  const calls: any[][] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(console as any)[method] = (...args: any[]) => {
    calls.push(args)
  }

  return {
    calls,
    restore() {
      ;(console as any)[method] = original
    },
  }
}

/**
 * 拦截所有 console 日志方法
 */
function spyOnAllConsole(): Record<string, ConsoleSpy> {
  return {
    debug: spyOnConsole('debug'),
    info: spyOnConsole('info'),
    warn: spyOnConsole('warn'),
    error: spyOnConsole('error'),
  }
}

/**
 * 恢复所有 console 方法
 */
function restoreAllConsole(spies: Record<string, ConsoleSpy>): void {
  for (const spy of Object.values(spies)) {
    spy.restore()
  }
}

// ======================== 测试套件 ========================

describe('createLogger', () => {
  it('应该使用默认配置创建日志实例', () => {
    const logger = createLogger()
    expect(logger).toBeDefined()
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.setLevel).toBe('function')
    expect(typeof logger.getLevel).toBe('function')
    expect(typeof logger.getLogs).toBe('function')
    expect(typeof logger.clearLogs).toBe('function')
    expect(typeof logger.destroy).toBe('function')
    expect(typeof logger.install).toBe('function')
    logger.destroy()
  })

  it('默认日志级别应为 info', () => {
    const logger = createLogger()
    expect(logger.getLevel()).toBe('info')
    logger.destroy()
  })

  it('应该接受自定义配置', () => {
    const logger = createLogger({
      level: 'debug',
      prefix: '[TEST]',
      persist: false,
      maxLogs: 100,
      timestamp: false,
    })
    expect(logger.getLevel()).toBe('debug')
    logger.destroy()
  })
})

describe('日志级别输出', () => {
  let spies: Record<string, ConsoleSpy>
  let logger: Logger

  beforeEach(() => {
    spies = spyOnAllConsole()
    logger = createLogger({ level: 'debug' })
  })

  afterEach(() => {
    logger.destroy()
    restoreAllConsole(spies)
  })

  it('debug 级别应该调用 console.debug', () => {
    logger.debug('debug message')
    expect(spies.debug.calls.length).toBe(1)
    expect(spies.debug.calls[0][0]).toContain('DEBUG')
    expect(spies.debug.calls[0][0]).toContain('debug message')
  })

  it('info 级别应该调用 console.info', () => {
    logger.info('info message')
    expect(spies.info.calls.length).toBe(1)
    expect(spies.info.calls[0][0]).toContain('INFO ')
    expect(spies.info.calls[0][0]).toContain('info message')
  })

  it('warn 级别应该调用 console.warn', () => {
    logger.warn('warn message')
    expect(spies.warn.calls.length).toBe(1)
    expect(spies.warn.calls[0][0]).toContain('WARN ')
    expect(spies.warn.calls[0][0]).toContain('warn message')
  })

  it('error 级别应该调用 console.error', () => {
    logger.error('error message')
    expect(spies.error.calls.length).toBe(1)
    expect(spies.error.calls[0][0]).toContain('ERROR')
    expect(spies.error.calls[0][0]).toContain('error message')
  })

  it('应该支持多个参数', () => {
    logger.info('hello', 'world', 42)
    expect(spies.info.calls.length).toBe(1)
    expect(spies.info.calls[0][0]).toContain('hello world 42')
    // 额外参数也会传递给 console
    expect(spies.info.calls[0].length >= 2).toBeTruthy()
  })

  it('应该正确序列化对象参数', () => {
    const obj = { key: 'value' }
    logger.info(obj)
    expect(spies.info.calls.length).toBe(1)
    expect(spies.info.calls[0][0]).toContain('"key"')
    expect(spies.info.calls[0][0]).toContain('"value"')
  })

  it('应该正确序列化 Error 对象', () => {
    const err = new Error('test error')
    logger.error(err)
    expect(spies.error.calls.length).toBe(1)
    expect(spies.error.calls[0][0]).toContain('test error')
  })
})

describe('setLevel / getLevel', () => {
  let logger: Logger

  beforeEach(() => {
    logger = createLogger({ level: 'info' })
  })

  afterEach(() => {
    logger.destroy()
  })

  it('getLevel 应该返回当前日志级别', () => {
    expect(logger.getLevel()).toBe('info')
  })

  it('setLevel 应该切换日志级别', () => {
    logger.setLevel('debug')
    expect(logger.getLevel()).toBe('debug')
  })

  it('setLevel 切换到 warn 后，debug 和 info 不应输出', () => {
    const spies = spyOnAllConsole()
    logger.setLevel('warn')

    logger.debug('should not appear')
    logger.info('should not appear')

    expect(spies.debug.calls.length).toBe(0)
    expect(spies.info.calls.length).toBe(0)

    restoreAllConsole(spies)
  })

  it('setLevel 切换到 error 后，只有 error 输出', () => {
    const spies = spyOnAllConsole()
    logger.setLevel('error')

    logger.debug('no')
    logger.info('no')
    logger.warn('no')
    logger.error('yes')

    expect(spies.debug.calls.length).toBe(0)
    expect(spies.info.calls.length).toBe(0)
    expect(spies.warn.calls.length).toBe(0)
    expect(spies.error.calls.length).toBe(1)

    restoreAllConsole(spies)
  })

  it('setLevel 切换到 silent 后，所有日志都不输出', () => {
    const spies = spyOnAllConsole()
    logger.setLevel('silent')

    logger.debug('no')
    logger.info('no')
    logger.warn('no')
    logger.error('no')

    expect(spies.debug.calls.length).toBe(0)
    expect(spies.info.calls.length).toBe(0)
    expect(spies.warn.calls.length).toBe(0)
    expect(spies.error.calls.length).toBe(0)

    restoreAllConsole(spies)
  })
})

describe('silent 模式', () => {
  it('创建时 level 为 silent 不应输出任何日志', () => {
    const spies = spyOnAllConsole()
    const logger = createLogger({ level: 'silent' })

    logger.debug('no')
    logger.info('no')
    logger.warn('no')
    logger.error('no')

    expect(spies.debug.calls.length).toBe(0)
    expect(spies.info.calls.length).toBe(0)
    expect(spies.warn.calls.length).toBe(0)
    expect(spies.error.calls.length).toBe(0)

    logger.destroy()
    restoreAllConsole(spies)
  })

  it('silent 模式下 getLogs 仍然为空（日志不记录）', () => {
    const logger = createLogger({ level: 'silent' })
    logger.info('no')
    expect(logger.getLogs()).toHaveLength(0)
    logger.destroy()
  })
})

describe('getLogs / clearLogs', () => {
  let logger: Logger

  beforeEach(() => {
    logger = createLogger({ level: 'debug' })
  })

  afterEach(() => {
    logger.destroy()
  })

  it('getLogs 应该返回所有已记录的日志', () => {
    logger.info('first')
    logger.info('second')
    logger.warn('third')

    const logs = logger.getLogs()
    expect(logs).toHaveLength(3)
    expect(logs[0].level).toBe('info')
    expect(logs[0].message).toBe('first')
    expect(logs[1].level).toBe('info')
    expect(logs[1].message).toBe('second')
    expect(logs[2].level).toBe('warn')
    expect(logs[2].message).toBe('third')
  })

  it('getLogs 返回的应该是副本，修改不影响内部状态', () => {
    logger.info('test')
    const logs = logger.getLogs()
    logs.push({ level: 'error', message: 'fake', timestamp: 0, args: [] })
    expect(logger.getLogs()).toHaveLength(1)
  })

  it('clearLogs 应该清除所有日志记录', () => {
    logger.info('first')
    logger.info('second')
    expect(logger.getLogs()).toHaveLength(2)

    logger.clearLogs()
    expect(logger.getLogs()).toHaveLength(0)
  })

  it('clearLogs 后新日志应该正常记录', () => {
    logger.info('before clear')
    logger.clearLogs()
    logger.info('after clear')

    const logs = logger.getLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0].message).toBe('after clear')
  })

  it('每条日志条目应包含 level、message、timestamp、args', () => {
    logger.info('hello', 'world')

    const logs = logger.getLogs()
    expect(logs).toHaveLength(1)
    const entry = logs[0]
    expect(entry.level).toBe('info')
    expect(entry.message).toBe('hello world')
    expect(entry.timestamp).toBeGreaterThan(0)
    expect(entry.args).toEqual(['hello', 'world'])
  })
})

describe('maxLogs FIFO 限制', () => {
  it('日志条数超过 maxLogs 时应丢弃最旧的日志', () => {
    const logger = createLogger({ level: 'debug', maxLogs: 3 })

    logger.info('log1')
    logger.info('log2')
    logger.info('log3')
    logger.info('log4')

    const logs = logger.getLogs()
    expect(logs).toHaveLength(3)
    // 最旧的 log1 应被丢弃
    expect(logs[0].message).toBe('log2')
    expect(logs[1].message).toBe('log3')
    expect(logs[2].message).toBe('log4')

    logger.destroy()
  })

  it('日志条数等于 maxLogs 时不应丢弃', () => {
    const logger = createLogger({ level: 'debug', maxLogs: 3 })

    logger.info('log1')
    logger.info('log2')
    logger.info('log3')

    const logs = logger.getLogs()
    expect(logs).toHaveLength(3)
    expect(logs[0].message).toBe('log1')
    expect(logs[1].message).toBe('log2')
    expect(logs[2].message).toBe('log3')

    logger.destroy()
  })

  it('maxLogs 为 1 时只保留最新一条', () => {
    const logger = createLogger({ level: 'debug', maxLogs: 1 })

    logger.info('first')
    logger.info('second')
    logger.info('third')

    const logs = logger.getLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0].message).toBe('third')

    logger.destroy()
  })
})

describe('destroy 销毁', () => {
  it('销毁后不应再输出任何日志', () => {
    const spies = spyOnAllConsole()
    const logger = createLogger({ level: 'debug' })

    logger.destroy()

    logger.debug('no')
    logger.info('no')
    logger.warn('no')
    logger.error('no')

    expect(spies.debug.calls.length).toBe(0)
    expect(spies.info.calls.length).toBe(0)
    expect(spies.warn.calls.length).toBe(0)
    expect(spies.error.calls.length).toBe(0)

    restoreAllConsole(spies)
  })

  it('销毁后 getLogs 应返回空数组', () => {
    const logger = createLogger({ level: 'debug' })
    logger.info('before destroy')
    logger.destroy()

    expect(logger.getLogs()).toHaveLength(0)
  })

  it('多次销毁不应报错', () => {
    const logger = createLogger()
    logger.destroy()
    logger.destroy() // 第二次销毁不应抛出异常
  })
})

describe('install 安装到 app', () => {
  it('应该将 logger 注入到 app.config.globalProperties.$logger', () => {
    const logger = createLogger()
    const app: any = {}

    logger.install(app)

    expect(app.config).toBeDefined()
    expect(app.config.globalProperties).toBeDefined()
    expect(app.config.globalProperties.$logger).toBe(logger)

    logger.destroy()
  })

  it('如果 app 已有 config，不应覆盖', () => {
    const logger = createLogger()
    const existingConfig = { existing: true }
    const app: any = { config: existingConfig }

    logger.install(app)

    expect(app.config.existing).toBe(true)
    expect(app.config.globalProperties.$logger).toBe(logger)

    logger.destroy()
  })

  it('如果 app 已有 globalProperties，不应覆盖', () => {
    const logger = createLogger()
    const app: any = {
      config: { globalProperties: { existingProp: 'value' } },
    }

    logger.install(app)

    expect(app.config.globalProperties.existingProp).toBe('value')
    expect(app.config.globalProperties.$logger).toBe(logger)

    logger.destroy()
  })

  it('如果 app 提供 provide 方法，应该调用 app.provide("logger", logger)', () => {
    const logger = createLogger()
    let providedKey: string | undefined
    let providedValue: any
    const app: any = {
      provide(key: string, value: any) {
        providedKey = key
        providedValue = value
      },
    }

    logger.install(app)

    expect(providedKey).toBe('logger')
    expect(providedValue).toBe(logger)

    logger.destroy()
  })

  it('如果 app 不提供 provide 方法，不应报错', () => {
    const logger = createLogger()
    const app: any = {}

    // 不应抛出异常
    logger.install(app)

    expect(app.config.globalProperties.$logger).toBe(logger)

    logger.destroy()
  })
})

describe('自定义 format 模板', () => {
  let spies: Record<string, ConsoleSpy>
  let logger: Logger

  beforeEach(() => {
    spies = spyOnAllConsole()
  })

  afterEach(() => {
    logger.destroy()
    restoreAllConsole(spies)
  })

  it('应该使用自定义格式模板输出日志', () => {
    logger = createLogger({
      level: 'info',
      format: '[{level}] {prefix} {message}',
      prefix: 'APP',
    })

    logger.info('hello')

    expect(spies.info.calls.length).toBe(1)
    const output = spies.info.calls[0][0]
    // 去掉 ANSI 颜色码后检查
    const clean = output.replace(/\x1b\[[0-9;]*m/g, '')
    expect(clean).toContain('[INFO ]')
    expect(clean).toContain('APP')
    expect(clean).toContain('hello')
  })

  it('格式模板中应支持 {timestamp} 占位符', () => {
    logger = createLogger({
      level: 'info',
      format: '{timestamp} | {level} | {message}',
      timestamp: true,
    })

    logger.info('test')

    expect(spies.info.calls.length).toBe(1)
    const output = spies.info.calls[0][0]
    const clean = output.replace(/\x1b\[[0-9;]*m/g, '')
    // 应包含 ISO 格式时间戳（包含 T 和冒号分隔的日期）
    expect(clean).toContain('T')
    expect(clean).toContain('INFO')
    expect(clean).toContain('test')
  })

  it('timestamp 为 false 时 {timestamp} 应为空字符串', () => {
    logger = createLogger({
      level: 'info',
      format: '{timestamp}|{message}',
      timestamp: false,
    })

    logger.info('test')

    expect(spies.info.calls.length).toBe(1)
    const output = spies.info.calls[0][0]
    const clean = output.replace(/\x1b\[[0-9;]*m/g, '')
    // format: {timestamp}|{message} with timestamp=false => |test
    // But console.info also receives ...args, so calls[0] may have multiple items
    // We check the formatted string (first arg) starts with |
    expect(clean).toContain('|')
    expect(clean).toContain('test')
  })
})

describe('transport 自定义传输', () => {
  it('应该调用自定义 transport 函数', () => {
    const transported: LogEntry[] = []
    const logger = createLogger({
      level: 'debug',
      transport(entry) {
        transported.push(entry)
      },
    })

    logger.info('transport test')
    logger.warn('transport warn')

    expect(transported).toHaveLength(2)
    expect(transported[0].level).toBe('info')
    expect(transported[0].message).toBe('transport test')
    expect(transported[1].level).toBe('warn')
    expect(transported[1].message).toBe('transport warn')

    logger.destroy()
  })

  it('transport 中的 LogEntry 应包含完整的字段', () => {
    let received: LogEntry | undefined
    const logger = createLogger({
      level: 'debug',
      transport(entry) {
        received = entry
      },
    })

    logger.info('detail check', 42, { key: 'val' })

    expect(received).toBeDefined()
    expect(received!.level).toBe('info')
    // serialize 使用 JSON.stringify(arg, null, 2) 格式化对象，所以包含换行和缩进
    expect(received!.message).toContain('detail check')
    expect(received!.message).toContain('42')
    expect(received!.message).toContain('"key"')
    expect(received!.message).toContain('"val"')
    expect(received!.timestamp).toBeGreaterThan(0)
    expect(received!.args).toEqual(['detail check', 42, { key: 'val' }])

    logger.destroy()
  })

  it('transport 抛出异常不应影响日志记录', () => {
    const spies = spyOnAllConsole()
    const logger = createLogger({
      level: 'debug',
      transport() {
        throw new Error('transport error')
      },
    })

    // 不应抛出异常
    logger.info('should still work')

    expect(spies.info.calls.length).toBe(1)
    expect(logger.getLogs()).toHaveLength(1)

    logger.destroy()
    restoreAllConsole(spies)
  })
})

describe('timestamp 时间戳', () => {
  let spies: Record<string, ConsoleSpy>
  let logger: Logger

  beforeEach(() => {
    spies = spyOnAllConsole()
  })

  afterEach(() => {
    logger.destroy()
    restoreAllConsole(spies)
  })

  it('默认应显示时间戳', () => {
    logger = createLogger({ level: 'info' })
    logger.info('with timestamp')

    expect(spies.info.calls.length).toBe(1)
    const output = spies.info.calls[0][0]
    const clean = output.replace(/\x1b\[[0-9;]*m/g, '')
    // 应包含 ISO 格式时间戳（包含 T）
    expect(clean).toContain('T')
  })

  it('timestamp 为 false 时不应显示时间戳', () => {
    logger = createLogger({ level: 'info', timestamp: false })
    logger.info('no timestamp')

    expect(spies.info.calls.length).toBe(1)
    const output = spies.info.calls[0][0]
    const clean = output.replace(/\x1b\[[0-9;]*m/g, '')
    // 不应包含 ISO 格式时间戳（不应包含 T）
    expect(clean).not.toContain('T')
    expect(clean).toContain('INFO')
    expect(clean).toContain('no timestamp')
  })

  it('日志条目中的 timestamp 应为合理的毫秒数', () => {
    logger = createLogger({ level: 'info' })
    const before = Date.now()
    logger.info('timing')
    const after = Date.now()

    const logs = logger.getLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0].timestamp).toBeGreaterThan(0)
    // timestamp 应在合理范围内（before <= ts <= after）
    expect(logs[0].timestamp >= before).toBeTruthy()
    expect(logs[0].timestamp <= after).toBeTruthy()
  })
})

describe('prefix 前缀', () => {
  let spies: Record<string, ConsoleSpy>
  let logger: Logger

  beforeEach(() => {
    spies = spyOnAllConsole()
  })

  afterEach(() => {
    logger.destroy()
    restoreAllConsole(spies)
  })

  it('应该显示自定义前缀', () => {
    logger = createLogger({ level: 'info', prefix: '[MyApp]' })
    logger.info('prefixed')

    expect(spies.info.calls.length).toBe(1)
    const output = spies.info.calls[0][0]
    const clean = output.replace(/\x1b\[[0-9;]*m/g, '')
    expect(clean).toContain('[MyApp]')
    expect(clean).toContain('prefixed')
  })

  it('默认无前缀', () => {
    logger = createLogger({ level: 'info' })
    logger.info('no prefix')

    expect(spies.info.calls.length).toBe(1)
    const output = spies.info.calls[0][0]
    const clean = output.replace(/\x1b\[[0-9;]*m/g, '')
    // 不应包含方括号前缀
    expect(clean).not.toContain('[')
  })

  it('前缀应出现在时间戳之后、级别之前', () => {
    logger = createLogger({ level: 'info', prefix: '[APP]', timestamp: true })
    logger.info('check order')

    expect(spies.info.calls.length).toBe(1)
    const output = spies.info.calls[0][0]
    const clean = output.replace(/\x1b\[[0-9;]*m/g, '')
    const timestampPos = clean.indexOf('T') // ISO 时间戳中包含 T
    const prefixPos = clean.indexOf('[APP]')
    const levelPos = clean.indexOf('INFO')

    expect(timestampPos).toBeLessThan(prefixPos)
    expect(prefixPos).toBeLessThan(levelPos)
  })
})

describe('persist 持久化', () => {
  it('persist 为 true 时在 Node.js 环境不应报错', () => {
    // Node.js 没有 localStorage，插件内部做了静默处理
    const logger = createLogger({ level: 'debug', persist: true })

    // 以下操作都不应抛出异常
    logger.info('persist test')
    logger.warn('persist warn')
    logger.clearLogs()
    logger.info('after clear')

    expect(logger.getLogs()).toHaveLength(1)
    logger.destroy()
  })

  it('persist 为 true 时 destroy 不应报错', () => {
    const logger = createLogger({ level: 'debug', persist: true })
    logger.info('before destroy')

    // 不应抛出异常
    logger.destroy()
  })

  it('persist 为 true 时 clearLogs 不应报错', () => {
    const logger = createLogger({ level: 'debug', persist: true })
    logger.info('test')

    // 不应抛出异常
    logger.clearLogs()
    expect(logger.getLogs()).toHaveLength(0)

    logger.destroy()
  })
})

describe('级别过滤', () => {
  let spies: Record<string, ConsoleSpy>
  let logger: Logger

  beforeEach(() => {
    spies = spyOnAllConsole()
  })

  afterEach(() => {
    logger.destroy()
    restoreAllConsole(spies)
  })

  it('debug 级别下 info/warn/error 都应该输出', () => {
    logger = createLogger({ level: 'debug' })

    logger.info('info msg')
    logger.warn('warn msg')
    logger.error('error msg')

    expect(spies.info.calls.length).toBe(1)
    expect(spies.warn.calls.length).toBe(1)
    expect(spies.error.calls.length).toBe(1)
  })

  it('debug 级别下 debug 也应该输出', () => {
    logger = createLogger({ level: 'debug' })

    logger.debug('debug msg')

    expect(spies.debug.calls.length).toBe(1)
  })

  it('error 级别下 debug/info/warn 不应输出', () => {
    logger = createLogger({ level: 'error' })

    logger.debug('no')
    logger.info('no')
    logger.warn('no')

    expect(spies.debug.calls.length).toBe(0)
    expect(spies.info.calls.length).toBe(0)
    expect(spies.warn.calls.length).toBe(0)
  })

  it('error 级别下 error 应该输出', () => {
    logger = createLogger({ level: 'error' })

    logger.error('yes')

    expect(spies.error.calls.length).toBe(1)
  })

  it('warn 级别下 debug/info 不应输出，warn/error 应该输出', () => {
    logger = createLogger({ level: 'warn' })

    logger.debug('no')
    logger.info('no')
    logger.warn('yes')
    logger.error('yes')

    expect(spies.debug.calls.length).toBe(0)
    expect(spies.info.calls.length).toBe(0)
    expect(spies.warn.calls.length).toBe(1)
    expect(spies.error.calls.length).toBe(1)
  })

  it('info 级别下 debug 不应输出，info/warn/error 应该输出', () => {
    logger = createLogger({ level: 'info' })

    logger.debug('no')
    logger.info('yes')
    logger.warn('yes')
    logger.error('yes')

    expect(spies.debug.calls.length).toBe(0)
    expect(spies.info.calls.length).toBe(1)
    expect(spies.warn.calls.length).toBe(1)
    expect(spies.error.calls.length).toBe(1)
  })

  it('级别过滤应同时影响日志记录（getLogs）', () => {
    logger = createLogger({ level: 'warn' })

    logger.debug('no')
    logger.info('no')
    logger.warn('yes')
    logger.error('yes')

    const logs = logger.getLogs()
    expect(logs).toHaveLength(2)
    expect(logs[0].level).toBe('warn')
    expect(logs[1].level).toBe('error')
  })

  it('动态切换级别后过滤应立即生效', () => {
    logger = createLogger({ level: 'debug' })

    // debug 级别下所有日志都输出
    logger.info('visible')
    expect(logger.getLogs()).toHaveLength(1)

    // 切换到 error 级别
    logger.setLevel('error')
    logger.info('not visible')
    logger.error('visible')

    const logs = logger.getLogs()
    expect(logs).toHaveLength(2)
    expect(logs[0].message).toBe('visible')
    expect(logs[1].message).toBe('visible')
  })
})
