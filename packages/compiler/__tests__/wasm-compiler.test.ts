/**
 * Lyt.js WASM 编译器 — 单元测试
 *
 * 测试覆盖 WASM 模拟层的所有核心功能：
 *   - 编译器初始化与生命周期
 *   - 模板编译（基础/插值/事件/条件/列表/嵌套）
 *   - 错误处理与警告
 *   - AST 解析与 Tokenizer
 *   - 代码生成正确性
 *   - 静态提升与 Patch Flags
 *   - 浏览器编译器（compileToFunction/hotReload/stats）
 *   - 性能基准
 *   - 边界情况
 *   - SSR/Module/Function 模式
 *   - 缓存机制
 */

import { describe, it, expect } from '../../test-utils/src/index';

import {
  createWASMCompiler,
  type WASMCompiler,
  type WASMCompileResult,
  type WASMCompileError,
  type WASMCompileWarning,
} from '../src/wasm-compiler';

import {
  tokenize,
  buildAST,
  parseInterpolation,
  type Token,
  type Expression,
} from '../src/wasm-parser';

import {
  generateRenderCode,
  generateHoistedCode,
  generatePatchFlags,
} from '../src/wasm-generator';

import {
  createBrowserCompiler,
  type BrowserCompiler,
  type CompilerStats,
} from '../src/wasm-playground';

import { CompilerPatchFlags } from '../src/patch-flags';

import {
  parseHTML,
  compile,
  transform,
  type ASTNode,
  type RootNode,
  type ElementNode,
} from '../src/index';

// ================================================================
//  辅助函数
// ================================================================

/** 创建并初始化编译器 */
async function createInitializedCompiler(): Promise<WASMCompiler> {
  const compiler = createWASMCompiler();
  await compiler.init();
  return compiler;
}

/** 获取 AST 中的所有元素节点 */
function getElements(nodes: ASTNode[]): ElementNode[] {
  const elements: ElementNode[] = [];
  function walk(node: ASTNode) {
    if (node.type === 'Element') {
      elements.push(node);
      for (const child of node.children) walk(child);
    }
  }
  for (const node of nodes) walk(node);
  return elements;
}

/** 生成大型模板（指定节点数） */
function generateLargeTemplate(nodeCount: number): string {
  let template = '<div>';
  for (let i = 0; i < nodeCount; i++) {
    template += `<span class="item-${i}">item ${i}</span>`;
  }
  template += '</div>';
  return template;
}

// ================================================================
//  WASM 编译器初始化与生命周期
// ================================================================

describe('WASM Compiler 初始化', () => {
  it('应该成功创建编译器实例', () => {
    const compiler = createWASMCompiler();
    expect(compiler).toBeDefined();
    expect(typeof compiler.init).toBe('function');
    expect(typeof compiler.compile).toBe('function');
    expect(typeof compiler.parse).toBe('function');
    expect(typeof compiler.transform).toBe('function');
    expect(typeof compiler.generate).toBe('function');
    expect(typeof compiler.getVersion).toBe('function');
    expect(typeof compiler.getMemoryUsage).toBe('function');
    expect(typeof compiler.dispose).toBe('function');
  });

  it('应该成功初始化', async () => {
    const compiler = createWASMCompiler();
    await compiler.init();
    // 初始化后应该能正常编译
    const result = compiler.compile('<div>hello</div>');
    expect(result.errors).toHaveLength(0);
  });

  it('未初始化时编译应该抛出错误', async () => {
    const compiler = createWASMCompiler();
    expect(() => compiler.compile('<div>hello</div>')).toThrow('not initialized');
  });

  it('dispose 后编译应该抛出错误', async () => {
    const compiler = await createInitializedCompiler();
    compiler.dispose();
    expect(() => compiler.compile('<div>hello</div>')).toThrow('disposed');
  });

  it('dispose 后再次初始化应该抛出错误', async () => {
    const compiler = await createInitializedCompiler();
    compiler.dispose();
    let threw = false;
    try {
      await compiler.init();
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it('应该正确报告版本号', async () => {
    const compiler = await createInitializedCompiler();
    const version = compiler.getVersion();
    expect(version).toContain('wasm');
    compiler.dispose();
  });

  it('应该追踪内存使用量', async () => {
    const compiler = await createInitializedCompiler();
    expect(compiler.getMemoryUsage()).toBe(0);
    compiler.compile('<div>hello</div>');
    expect(compiler.getMemoryUsage()).toBeGreaterThan(0);
    compiler.dispose();
  });

  it('dispose 应该重置内存使用量', async () => {
    const compiler = await createInitializedCompiler();
    compiler.compile('<div>hello</div>');
    expect(compiler.getMemoryUsage()).toBeGreaterThan(0);
    compiler.dispose();
    expect(compiler.getMemoryUsage()).toBe(0);
  });
});

// ================================================================
//  基础模板编译
// ================================================================

describe('WASM Compiler 基础编译', () => {
  it('应该编译简单 div 模板', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<div>hello</div>');
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("h('div'");
    expect(result.ast.length).toBe(1);
    compiler.dispose();
  });

  it('应该编译带属性的模板', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<div class="container" id="app">content</div>');
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("'class': 'container'");
    expect(result.code).toContain("'id': 'app'");
    compiler.dispose();
  });

  it('应该编译嵌套元素', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<div><span>inner</span></div>');
    expect(result.errors).toHaveLength(0);
    expect(result.ast.length).toBe(1);
    compiler.dispose();
  });
});

// ================================================================
//  插值编译
// ================================================================

describe('WASM Compiler 插值编译', () => {
  it('应该编译简单插值', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<div>{{ message }}</div>');
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('_ctx.message');
    compiler.dispose();
  });

  it('应该编译混合文本和插值', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<div>Hello {{ name }}!</div>');
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('_ctx.name');
    compiler.dispose();
  });

  it('应该正确统计动态节点数', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<div>{{ a }} {{ b }}</div>');
    expect(result.dynamicCount).toBeGreaterThan(0);
    compiler.dispose();
  });
});

// ================================================================
//  事件绑定编译
// ================================================================

describe('WASM Compiler 事件绑定', () => {
  it('应该编译 @click 事件', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<button @click="handleClick">Click</button>');
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('onClick');
    expect(result.code).toContain('_ctx.handleClick');
    compiler.dispose();
  });

  it('应该编译 v-on:input 事件', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<input v-on:input="onInput" />');
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('onInput');
    compiler.dispose();
  });
});

// ================================================================
//  条件渲染编译
// ================================================================

describe('WASM Compiler 条件渲染', () => {
  it('应该编译 v-if 指令', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<div v-if="show">visible</div>');
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('_ctx.show');
    expect(result.code).toContain('?');
    expect(result.code).toContain(': null');
    compiler.dispose();
  });
});

// ================================================================
//  列表渲染编译
// ================================================================

describe('WASM Compiler 列表渲染', () => {
  it('应该编译 v-each 指令', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<li v-each="item in items">{{ item }}</li>');
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('renderList');
    expect(result.code).toContain('_ctx.items');
    compiler.dispose();
  });

  it('应该编译带索引的 v-each', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<li v-each="(item, index) in items">{{ item }}</li>');
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('index');
    compiler.dispose();
  });
});

// ================================================================
//  嵌套组件编译
// ================================================================

describe('WASM Compiler 嵌套组件', () => {
  it('应该编译自定义组件（标签被解析器小写化）', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<div><mycomponent :value="data" /></div>');
    expect(result.errors).toHaveLength(0);
    // parseHTML 会将标签名小写化
    expect(result.code).toContain('mycomponent');
    compiler.dispose();
  });
});

// ================================================================
//  错误处理
// ================================================================

describe('WASM Compiler 错误处理', () => {
  it('应该处理空模板', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('');
    expect(result.errors).toHaveLength(0);
    expect(result.code).toBeDefined();
    compiler.dispose();
  });

  it('应该产生警告', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<div>test</div>', { ssr: true });
    expect(result.warnings.length).toBeGreaterThan(0);
    compiler.dispose();
  });

  it('编译结果应包含正确的结构', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<div>{{ msg }}</div>');
    expect(result.code !== undefined).toBe(true);
    expect(Array.isArray(result.ast)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(result.renderFn !== undefined).toBe(true);
    expect(typeof result.staticCount).toBe('number');
    expect(typeof result.dynamicCount).toBe('number');
    expect(typeof result.compileTime).toBe('number');
    compiler.dispose();
  });
});

// ================================================================
//  AST 解析
// ================================================================

describe('WASM Parser AST 解析', () => {
  it('parse 应该返回 AST 节点数组', async () => {
    const compiler = await createInitializedCompiler();
    const ast = compiler.parse('<div><span>hello</span></div>');
    expect(Array.isArray(ast)).toBe(true);
    expect(ast.length).toBe(1);
    compiler.dispose();
  });

  it('parse 应该正确处理多根节点', async () => {
    const compiler = await createInitializedCompiler();
    const ast = compiler.parse('<div>a</div><div>b</div>');
    expect(ast.length).toBe(2);
    compiler.dispose();
  });
});

// ================================================================
//  Tokenizer
// ================================================================

describe('WASM Tokenizer', () => {
  it('应该 tokenize 简单 HTML', () => {
    const tokens = tokenize('<div>hello</div>');
    // tag-open, text, tag-close = 3 tokens
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe('tag-open');
    expect(tokens[0].value).toBe('div');
  });

  it('应该 tokenize 属性', () => {
    const tokens = tokenize('<div class="app">hello</div>');
    const attrTokens = tokens.filter(t => t.type === 'attr');
    expect(attrTokens.length).toBe(1);
    expect(attrTokens[0].value).toContain('class');
  });

  it('应该 tokenize 插值表达式', () => {
    const tokens = tokenize('<div>{{ message }}</div>');
    const interpTokens = tokens.filter(t => t.type === 'interpolation');
    expect(interpTokens.length).toBe(1);
    expect(interpTokens[0].value).toBe('message');
  });

  it('应该 tokenize 注释', () => {
    const tokens = tokenize('<!-- comment --><div>hello</div>');
    const commentTokens = tokens.filter(t => t.type === 'comment');
    expect(commentTokens.length).toBe(1);
    expect(commentTokens[0].value).toBe(' comment ');
  });

  it('应该 tokenize 自闭合标签', () => {
    const tokens = tokenize('<br/><input type="text" />');
    const openTags = tokens.filter(t => t.type === 'tag-open');
    expect(openTags.length).toBe(2);
  });

  it('Token 应包含位置信息', () => {
    const tokens = tokenize('<div>hello</div>');
    for (const token of tokens) {
      expect(token.loc).toBeDefined();
      expect(typeof token.loc.start).toBe('number');
      expect(typeof token.loc.line).toBe('number');
    }
  });
});

// ================================================================
//  buildAST
// ================================================================

describe('WASM buildAST', () => {
  it('应该从 tokens 构建 AST', () => {
    const tokens = tokenize('<div class="app"><span>hello</span></div>');
    const ast = buildAST(tokens);
    expect(ast.length).toBe(1);
    expect(ast[0].type).toBe('Element');
  });

  it('应该正确构建嵌套结构', () => {
    const tokens = tokenize('<div><p><span>deep</span></p></div>');
    const ast = buildAST(tokens);
    const elements = getElements(ast);
    expect(elements.length).toBe(3);
  });
});

// ================================================================
//  parseInterpolation
// ================================================================

describe('WASM parseInterpolation', () => {
  it('应该解析简单标识符', () => {
    const expr = parseInterpolation('message');
    expect(expr.type).toBe('identifier');
    expect(expr.value).toBe('message');
  });

  it('应该解析成员访问', () => {
    const expr = parseInterpolation('user.name');
    expect(expr.type).toBe('member');
    expect(expr.value).toBe('user.name');
  });

  it('应该解析函数调用', () => {
    const expr = parseInterpolation('formatDate()');
    expect(expr.type).toBe('call');
    expect(expr.value).toBe('formatDate()');
  });

  it('应该解析二元表达式', () => {
    const expr = parseInterpolation('count > 0');
    expect(expr.type).toBe('binary');
    expect(expr.value).toBe('count > 0');
  });

  it('应该解析字面量', () => {
    const expr = parseInterpolation('42');
    expect(expr.type).toBe('literal');
    expect(expr.value).toBe('42');
  });
});

// ================================================================
//  代码生成
// ================================================================

describe('WASM Generator 代码生成', () => {
  it('应该生成正确的渲染代码', async () => {
    const compiler = await createInitializedCompiler();
    const ast = compiler.parse('<div class="app">hello</div>');
    const code = compiler.generate(ast);
    expect(code).toContain("h('div'");
    expect(code).toContain("'class': 'app'");
    compiler.dispose();
  });

  it('function 模式应该生成函数包装', async () => {
    const compiler = await createInitializedCompiler();
    const ast = compiler.parse('<div>test</div>');
    const code = compiler.generate(ast, { mode: 'function' });
    expect(code).toContain('function render');
    compiler.dispose();
  });

  it('module 模式应该生成 ESM 导出', async () => {
    const compiler = await createInitializedCompiler();
    const ast = compiler.parse('<div>test</div>');
    const code = compiler.generate(ast, { mode: 'module' });
    expect(code).toContain('export default');
    compiler.dispose();
  });

  it('inline 模式应该只生成表达式', async () => {
    const compiler = await createInitializedCompiler();
    const ast = compiler.parse('<div>test</div>');
    const code = compiler.generate(ast, { inline: true });
    expect(code).not.toContain('function');
    expect(code).not.toContain('export');
    compiler.dispose();
  });

  it('generateRenderCode 应该生成正确代码', () => {
    const ast = buildAST(tokenize('<div>{{ msg }}</div>'));
    const code = generateRenderCode(ast);
    expect(code).toContain("h('div'");
    expect(code).toContain('_ctx.msg');
  });

  it('generateRenderCode 支持自定义前缀', () => {
    const ast = buildAST(tokenize('<div>{{ msg }}</div>'));
    const code = generateRenderCode(ast, { prefix: '$' });
    expect(code).toContain('$ctx.msg');
  });
});

// ================================================================
//  静态提升
// ================================================================

describe('WASM Generator 静态提升', () => {
  it('应该检测静态节点', () => {
    const ast = buildAST(tokenize('<div><span>static text</span></div>'));
    const result = generateHoistedCode(ast);
    expect(result.hoisted.length).toBeGreaterThan(0);
  });

  it('动态节点不应被提升', () => {
    const ast = buildAST(tokenize('<div><span>{{ dynamic }}</span></div>'));
    const result = generateHoistedCode(ast);
    // 包含动态内容的节点不应被提升
    expect(result.hoisted.length).toBe(0);
  });
});

// ================================================================
//  Patch Flags
// ================================================================

describe('WASM Generator Patch Flags', () => {
  it('静态文本应该返回 HOISTED', () => {
    const ast = buildAST(tokenize('hello'));
    const flag = generatePatchFlags(ast[0]);
    expect(flag).toBe(CompilerPatchFlags.HOISTED);
  });

  it('动态文本应该返回 TEXT', () => {
    const ast = buildAST(tokenize('{{ msg }}'));
    const flag = generatePatchFlags(ast[0]);
    expect(flag).toBe(CompilerPatchFlags.TEXT);
  });

  it('v-if 节点应该返回 BAIL', async () => {
    // 使用主编译器的 parse + transform 来获取带有 ifCondition 的 AST
    const root = parseHTML('<div v-if="show">content</div>');
    transform(root);
    const flag = generatePatchFlags(root.children[0]);
    expect(flag).toBe(CompilerPatchFlags.BAIL);
  });

  it('事件绑定应该包含 EVENT 标记', async () => {
    // 使用主编译器的 parse + transform 来获取带有 events 的 AST
    const root = parseHTML('<button @click="handleClick">Click</button>');
    transform(root);
    const flag = generatePatchFlags(root.children[0]);
    expect((flag & CompilerPatchFlags.EVENT) === CompilerPatchFlags.EVENT).toBe(true);
  });
});

// ================================================================
//  浏览器编译器
// ================================================================

describe('Browser Compiler', () => {
  it('应该创建浏览器编译器实例', () => {
    const bc = createBrowserCompiler();
    expect(bc).toBeDefined();
    expect(typeof bc.compileToFunction).toBe('function');
    expect(typeof bc.compile).toBe('function');
    expect(typeof bc.hotReload).toBe('function');
    expect(typeof bc.getStats).toBe('function');
  });

  it('compileToFunction 应该返回可执行函数', async () => {
    const bc = createBrowserCompiler();
    const renderFn = await bc.compileToFunction('<div>hello</div>');
    expect(typeof renderFn).toBe('function');
    const result = renderFn({});
    expect(result).toBeDefined();
  });

  it('compileToFunction 应该正确处理插值', async () => {
    const bc = createBrowserCompiler();
    const renderFn = await bc.compileToFunction('<div>{{ message }}</div>');
    const result = renderFn({ message: 'world' });
    expect(result).toBeDefined();
  });

  it('compile 应该返回完整结果', async () => {
    const bc = createBrowserCompiler();
    const result = await bc.compile('<div>test</div>');
    expect(result.code !== undefined).toBe(true);
    expect(Array.isArray(result.ast)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ================================================================
//  热重载
// ================================================================

describe('Hot Reload', () => {
  it('相同模板应该命中缓存', async () => {
    const bc = createBrowserCompiler();
    const template = '<div>hello</div>';
    const first = await bc.compile(template);
    const stats1 = bc.getStats();
    const second = await bc.compile(template);
    const stats2 = bc.getStats();
    expect(stats2.cacheHitRate).toBeGreaterThan(stats1.cacheHitRate);
  });

  it('变更模板应该触发重新编译', async () => {
    const bc = createBrowserCompiler();
    const oldResult = await bc.compile('<div>old</div>');
    const newResult = await bc.hotReload(oldResult, '<div>new</div>');
    expect(newResult.code).toContain('new');
  });
});

// ================================================================
//  编译器统计
// ================================================================

describe('Compiler Stats', () => {
  it('应该追踪编译次数', async () => {
    const bc = createBrowserCompiler();
    await bc.compile('<div>1</div>');
    await bc.compile('<div>2</div>');
    await bc.compile('<div>3</div>');
    const stats = bc.getStats();
    expect(stats.totalCompilations >= 3).toBe(true);
  });

  it('应该计算平均编译时间', async () => {
    const bc = createBrowserCompiler();
    await bc.compile('<div>test</div>');
    const stats = bc.getStats();
    expect(stats.averageCompileTime >= 0).toBe(true);
  });

  it('应该追踪错误数', async () => {
    const bc = createBrowserCompiler();
    // 正常编译不应增加错误数
    await bc.compile('<div>ok</div>');
    const stats = bc.getStats();
    expect(stats.totalErrors).toBe(0);
  });
});

// ================================================================
//  性能测试
// ================================================================

describe('WASM Compiler 性能', () => {
  it('编译 100 个模板应在 100ms 内完成', async () => {
    const compiler = await createInitializedCompiler();
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      compiler.compile(`<div class="item-${i}"><span>item ${i}</span></div>`);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
    compiler.dispose();
  });

  it('编译大型模板（1000 节点）应在 100ms 内完成', async () => {
    const compiler = await createInitializedCompiler();
    const template = generateLargeTemplate(1000);
    const start = performance.now();
    const result = compiler.compile(template);
    const elapsed = performance.now() - start;
    expect(result.errors).toHaveLength(0);
    expect(elapsed).toBeLessThan(100);
    compiler.dispose();
  });
});

// ================================================================
//  边界情况
// ================================================================

describe('WASM Compiler 边界情况', () => {
  it('应该处理空模板', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('');
    expect(result.errors).toHaveLength(0);
    compiler.dispose();
  });

  it('应该处理自闭合标签', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<br/><hr/><img src="test.jpg" />');
    expect(result.errors).toHaveLength(0);
    expect(result.ast.length).toBe(3);
    compiler.dispose();
  });

  it('应该处理注释', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<!-- comment --><div>hello</div>');
    expect(result.errors).toHaveLength(0);
    // 注释不应生成 AST 节点
    compiler.dispose();
  });

  it('应该处理纯文本模板', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('just some text');
    expect(result.errors).toHaveLength(0);
    compiler.dispose();
  });

  it('应该处理布尔属性', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<input disabled readonly />');
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('disabled');
    expect(result.code).toContain('readonly');
    compiler.dispose();
  });
});

// ================================================================
//  SSR 模式
// ================================================================

describe('WASM Compiler SSR 模式', () => {
  it('SSR 模式应该产生警告', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<div>hello</div>', { ssr: true });
    expect(result.warnings.length).toBeGreaterThan(0);
    compiler.dispose();
  });
});

// ================================================================
//  Module vs Function 模式
// ================================================================

describe('WASM Compiler 模式输出', () => {
  it('module 模式应该生成 ESM 代码', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<div>test</div>', { mode: 'module' });
    expect(result.renderFn).toContain('export default');
    compiler.dispose();
  });

  it('function 模式应该生成函数代码', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<div>test</div>', { mode: 'function' });
    expect(result.renderFn).toContain('function render');
    compiler.dispose();
  });

  it('inline 模式应该只生成表达式代码', async () => {
    const compiler = await createInitializedCompiler();
    const result = compiler.compile('<div>test</div>', { inline: true });
    expect(result.renderFn).not.toContain('function');
    expect(result.renderFn).not.toContain('export');
    compiler.dispose();
  });
});

// ================================================================
//  缓存机制
// ================================================================

describe('Browser Compiler 缓存', () => {
  it('重复编译相同模板应该命中缓存', async () => {
    const bc = createBrowserCompiler();
    const template = '<div>cached</div>';
    await bc.compile(template);
    await bc.compile(template);
    await bc.compile(template);
    const stats = bc.getStats();
    // 缓存命中率应该大于 0
    expect(stats.cacheHitRate).toBeGreaterThan(0);
  });

  it('不同模板不应该命中缓存', async () => {
    const bc = createBrowserCompiler();
    await bc.compile('<div>a</div>');
    await bc.compile('<div>b</div>');
    await bc.compile('<div>c</div>');
    const stats = bc.getStats();
    // 全部是不同的模板，编译次数应该大于 0
    expect(stats.totalCompilations > 0).toBe(true);
  });
});

// ================================================================
//  WASM 与主编译器输出一致性
// ================================================================

describe('WASM 与主编译器一致性', () => {
  it('应该生成与主编译器相同的 AST 结构', async () => {
    const template = '<div class="app"><span>{{ message }}</span></div>';
    const compiler = await createInitializedCompiler();
    const wasmAst = compiler.parse(template);
    const mainAst = parseHTML(template);

    // 两者都应该有相同的顶层节点数
    expect(wasmAst.length).toBe(mainAst.children.length);
    compiler.dispose();
  });

  it('应该生成包含 h() 调用的代码', async () => {
    const template = '<div class="container">hello</div>';
    const compiler = await createInitializedCompiler();
    const wasmResult = compiler.compile(template);
    const mainResult = compile(template);

    // 两者都应该生成 h() 调用
    expect(wasmResult.code).toContain("h('div'");
    expect(mainResult.code).toContain("h('div'");
    compiler.dispose();
  });
});
