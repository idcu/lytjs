/**
 * Lyt.js CLI — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 测试 CLI 的工具函数（不需要实际执行命令）。
 *
 * 测试覆盖：
 *   - parseArgs 解析无参数
 *   - parseArgs 解析 --flag
 *   - parseArgs 解析 --key=value
 *   - parseArgs 解析位置参数
 *   - colorText 基本着色
 *   - getMIMEType html/css/js/json/unknown
 */

import { describe, it, expect } from '../../test-utils/src/index'

import { parseArgs, colorText, getMIMEType } from '../src/utils'

// ================================================================
//  parseArgs 测试
// ================================================================

describe('parseArgs', () => {
  it('解析无参数', () => {
    const result = parseArgs(['node', 'lyt'])
    expect(result.command).toBe('')
    expect(result.args.length).toBe(0)
    expect(Object.keys(result.options).length).toBe(0)
  })

  it('解析 --flag', () => {
    const result = parseArgs(['node', 'lyt', '--minify', '--help'])
    expect(result.options.minify).toBe(true)
    expect(result.options.help).toBe(true)
  })

  it('解析 --key=value', () => {
    const result = parseArgs(['node', 'lyt', '--port=3000', '--template=spa'])
    expect(result.options.port).toBe('3000')
    expect(result.options.template).toBe('spa')
  })

  it('解析位置参数', () => {
    const result = parseArgs(['node', 'lyt', 'create', 'my-app'])
    expect(result.command).toBe('create')
    expect(result.args.length).toBe(1)
    expect(result.args[0]).toBe('my-app')
  })
})

// ================================================================
//  colorText 测试
// ================================================================

describe('colorText', () => {
  it('基本着色', () => {
    const result = colorText('hello', 'red')
    // 应包含 ANSI 转义码
    expect(result).toContain('hello')
    expect(result).toContain('\x1b[')
    expect(result).toContain('\x1b[0m') // 重置码
  })

  it('未知颜色返回原文', () => {
    const result = colorText('hello', 'unknownColor')
    expect(result).toBe('hello')
  })
})

// ================================================================
//  getMIMEType 测试
// ================================================================

describe('getMIMEType', () => {
  it('html', () => {
    expect(getMIMEType('index.html')).toBe('text/html; charset=utf-8')
    expect(getMIMEType('page.htm')).toBe('text/html; charset=utf-8')
  })

  it('css', () => {
    expect(getMIMEType('style.css')).toBe('text/css; charset=utf-8')
  })

  it('js', () => {
    expect(getMIMEType('app.js')).toBe('application/javascript; charset=utf-8')
    expect(getMIMEType('module.mjs')).toBe('application/javascript; charset=utf-8')
    expect(getMIMEType('app.ts')).toBe('application/javascript; charset=utf-8')
  })

  it('json', () => {
    expect(getMIMEType('data.json')).toBe('application/json; charset=utf-8')
  })

  it('unknown', () => {
    expect(getMIMEType('file.xyz')).toBe('application/octet-stream')
    expect(getMIMEType('noext')).toBe('application/octet-stream')
  })
})
