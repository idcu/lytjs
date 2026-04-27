/**
 * @lytjs/plugin-highlight — 完整单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 测试代码高亮功能。
 *
 * 测试覆盖：
 *   1. highlight 基本功能
 *   2. highlight JavaScript 关键字
 *   3. highlight TypeScript 类型关键字
 *   4. highlight 字符串
 *   5. highlight 数字
 *   6. highlight 注释
 *   7. highlight HTML 标签
 *   8. highlight CSS
 *   9. highlight JSON
 *  10. highlightBlock 带行号
 *  11. highlightBlock 不带行号
 *  12. HIGHLIGHT_STYLES 导出
 *  13. injectStyles
 *  14. 自定义 classPrefix
 *  15. 未知语言返回转义文本
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '../../test-utils/src/index'

import { highlight, highlightBlock, HIGHLIGHT_STYLES, injectStyles } from '../src/index'

// ================================================================
//  1. highlight 基本功能
// ================================================================

describe('highlight 基本功能', () => {

  it('返回 HTML 字符串', () => {
    const result = highlight('const x = 1', 'javascript')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('包含 span 标签', () => {
    const result = highlight('const x = 1', 'javascript')
    expect(result).toContain('<span')
    expect(result).toContain('</span>')
  })
})

// ================================================================
//  2. highlight JavaScript 关键字
// ================================================================

describe('highlight JavaScript 关键字', () => {

  it('高亮 const 关键字', () => {
    const result = highlight('const x = 1', 'javascript')
    expect(result).toContain('const')
    expect(result).toContain('lyt-hl-keyword')
  })

  it('高亮 function 关键字', () => {
    const result = highlight('function hello() {}', 'javascript')
    expect(result).toContain('lyt-hl-keyword')
  })

  it('高亮 return 关键字', () => {
    const result = highlight('return 42', 'javascript')
    expect(result).toContain('lyt-hl-keyword')
  })

  it('高亮 if/else 关键字', () => {
    const result = highlight('if (true) {} else {}', 'javascript')
    expect(result).toContain('lyt-hl-keyword')
  })

  it('高亮 async/await 关键字', () => {
    const result = highlight('async function foo() { await bar() }', 'javascript')
    expect(result).toContain('lyt-hl-keyword')
  })
})

// ================================================================
//  3. highlight TypeScript 类型关键字
// ================================================================

describe('highlight TypeScript 类型关键字', () => {

  it('高亮 interface 关键字', () => {
    const result = highlight('interface User { name: string }', 'typescript')
    expect(result).toContain('lyt-hl-type')
  })

  it('高亮 type 关键字', () => {
    const result = highlight('type ID = string | number', 'typescript')
    expect(result).toContain('lyt-hl-type')
  })

  it('高亮 enum 关键字', () => {
    const result = highlight('enum Color { Red, Blue }', 'typescript')
    expect(result).toContain('lyt-hl-type')
  })
})

// ================================================================
//  4. highlight 字符串
// ================================================================

describe('highlight 字符串', () => {

  it('高亮双引号字符串', () => {
    const result = highlight('const s = "hello"', 'javascript')
    expect(result).toContain('lyt-hl-string')
  })

  it('高亮单引号字符串', () => {
    const result = highlight("const s = 'world'", 'javascript')
    expect(result).toContain('lyt-hl-string')
  })

  it('高亮模板字符串', () => {
    const result = highlight('const s = `template`', 'javascript')
    expect(result).toContain('lyt-hl-string')
  })
})

// ================================================================
//  5. highlight 数字
// ================================================================

describe('highlight 数字', () => {

  it('高亮整数', () => {
    const result = highlight('const x = 42', 'javascript')
    expect(result).toContain('lyt-hl-number')
  })

  it('高亮浮点数', () => {
    const result = highlight('const pi = 3.14', 'javascript')
    expect(result).toContain('lyt-hl-number')
  })

  it('高亮十六进制数字', () => {
    const result = highlight('const hex = 0xFF', 'javascript')
    expect(result).toContain('lyt-hl-number')
  })
})

// ================================================================
//  6. highlight 注释
// ================================================================

describe('highlight 注释', () => {

  it('高亮单行注释', () => {
    const result = highlight('// this is a comment', 'javascript')
    expect(result).toContain('lyt-hl-comment')
  })

  it('高亮多行注释', () => {
    const result = highlight('/* multi\nline\ncomment */', 'javascript')
    expect(result).toContain('lyt-hl-comment')
  })
})

// ================================================================
//  7. highlight HTML 标签
// ================================================================

describe('highlight HTML 标签', () => {

  it('高亮 HTML 标签', () => {
    const result = highlight('<div class="app">Hello</div>', 'html')
    expect(result).toContain('lyt-hl-tag')
    expect(result).toContain('div')
  })

  it('高亮 HTML 属性', () => {
    const result = highlight('<div class="app" id="main">', 'html')
    expect(result).toContain('lyt-hl-attribute')
  })

  it('高亮 HTML 注释', () => {
    const result = highlight('<!-- comment -->', 'html')
    expect(result).toContain('lyt-hl-comment')
  })
})

// ================================================================
//  8. highlight CSS
// ================================================================

describe('highlight CSS', () => {

  it('高亮 CSS 属性', () => {
    const result = highlight('.button { color: red; }', 'css')
    expect(result).toContain('lyt-hl-property')
  })

  it('高亮 CSS 数字（含单位）', () => {
    const result = highlight('.box { width: 100px; margin: 1em; }', 'css')
    expect(result).toContain('lyt-hl-number')
  })

  it('高亮 CSS 关键字', () => {
    const result = highlight('@media screen { }', 'css')
    expect(result).toContain('lyt-hl-keyword')
  })
})

// ================================================================
//  9. highlight JSON
// ================================================================

describe('highlight JSON', () => {

  it('高亮 JSON 键名', () => {
    const result = highlight('{"name": "Alice", "age": 30}', 'json')
    expect(result).toContain('lyt-hl-property')
  })

  it('高亮 JSON 字符串值', () => {
    const result = highlight('{"name": "Alice"}', 'json')
    expect(result).toContain('lyt-hl-string')
  })

  it('高亮 JSON 数字值', () => {
    const result = highlight('{"age": 30}', 'json')
    expect(result).toContain('lyt-hl-number')
  })

  it('高亮 JSON 布尔值', () => {
    const result = highlight('{"active": true, "deleted": false}', 'json')
    expect(result).toContain('lyt-hl-boolean')
  })

  it('高亮 JSON null', () => {
    const result = highlight('{"value": null}', 'json')
    expect(result).toContain('lyt-hl-null')
  })
})

// ================================================================
//  10. highlightBlock 带行号
// ================================================================

describe('highlightBlock 带行号', () => {

  it('返回包含 html/language/lines 的对象', () => {
    const result = highlightBlock('const x = 1;', 'javascript', { lineNumbers: true })
    expect(result.html).toBeDefined()
    expect(result.language).toBe('javascript')
    expect(result.lines).toBe(1)
    expect(typeof result.html).toBe('string')
  })

  it('带行号时 html 包含行号元素', () => {
    const result = highlightBlock('line1\nline2\nline3', 'javascript', { lineNumbers: true })
    expect(result.html).toContain('lyt-hl-line-numbers')
    expect(result.lines).toBe(3)
  })

  it('自定义起始行号', () => {
    const result = highlightBlock('const x = 1;', 'javascript', {
      lineNumbers: true,
      startLine: 10,
    })
    expect(result.html).toContain('10')
  })
})

// ================================================================
//  11. highlightBlock 不带行号
// ================================================================

describe('highlightBlock 不带行号', () => {

  it('不包含行号元素', () => {
    const result = highlightBlock('const x = 1;', 'javascript')
    expect(result.html).not.toContain('lyt-hl-line-numbers')
  })

  it('包含容器元素', () => {
    const result = highlightBlock('const x = 1;', 'javascript')
    expect(result.html).toContain('lyt-hl-container')
  })
})

// ================================================================
//  12. HIGHLIGHT_STYLES 导出
// ================================================================

describe('HIGHLIGHT_STYLES 导出', () => {

  it('包含 light 和 dark 主题', () => {
    expect(HIGHLIGHT_STYLES).toBeDefined()
    expect(typeof HIGHLIGHT_STYLES.light).toBe('string')
    expect(typeof HIGHLIGHT_STYLES.dark).toBe('string')
  })

  it('light 主题包含基础样式', () => {
    expect(HIGHLIGHT_STYLES.light).toContain('lyt-hl-container')
    expect(HIGHLIGHT_STYLES.light).toContain('lyt-hl-keyword')
  })

  it('dark 主题包含基础样式', () => {
    expect(HIGHLIGHT_STYLES.dark).toContain('lyt-hl-container')
    expect(HIGHLIGHT_STYLES.dark).toContain('lyt-hl-keyword')
  })
})

// ================================================================
//  13. injectStyles
// ================================================================

describe('injectStyles', () => {

  it('调用不报错', () => {
    // 在 Node.js 环境中 document 不可用，函数应静默返回
    injectStyles('light')
  })
})

// ================================================================
//  14. 自定义 classPrefix
// ================================================================

describe('自定义 classPrefix', () => {

  it('使用自定义前缀', () => {
    const result = highlight('const x = 1', 'javascript', {
      classPrefix: 'my-hl',
    })
    expect(result).toContain('my-hl-keyword')
    expect(result).not.toContain('lyt-hl-keyword')
  })
})

// ================================================================
//  15. 未知语言返回转义文本
// ================================================================

describe('未知语言返回转义文本', () => {

  it('未知语言不包含 span 标签', () => {
    const result = highlight('some code here', 'unknown-lang' as any)
    expect(result).not.toContain('<span')
  })

  it('HTML 特殊字符被转义', () => {
    const result = highlight('<div>&"test"</div>', 'unknown-lang' as any)
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
    expect(result).toContain('&amp;')
    expect(result).toContain('&quot;')
  })
})
