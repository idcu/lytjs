// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/compiler` 的**客户端/服务端边界分析**（`src/client-server-boundary/index.ts`，547 行）
 *
 * ## 为什么要有这条
 *
 * `analyzeBoundary` / `splitClientServer` **从 `compiler/src/index.ts` 公开转出**（属于 `@lytjs/compiler`
 * 的 API 面），但此前**没有任何测试引用**（实测 25.2% 覆盖、244 条语句未覆盖）。
 *
 * ## 本文件盯的核心问题
 *
 * 该模块用两套正则模式判断「服务端/客户端专用 API」：
 * - `isServerOnlyImport()` 用 `p.test(importPath)` —— 锚点模式（`/^fs$/`）**正好**匹配整个 import 路径 ✓
 * - 但扫描**源码里是否用了全局 API** 时，代码把 `pattern.source` 拼进 `\b...\b` ⇒ 得到 `\b^window$\b`
 *   ⇒ **只有整个源文件恰好等于 `window` 才匹配** ⇒ 全局 API 检测**整体失效**。
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeBoundary,
  splitClientServer,
  runtime,
  serverOnly,
  clientOnly,
  createEnvironmentValue,
} from '../src/client-server-boundary';

// ==================== 全局 API 检测 ====================

describe('analyzeBoundary：全局 API 检测', () => {
  it('★ 源码里用了 document ⇒ 判为客户端模块', () => {
    const r = analyzeBoundary(`const el = document.querySelector('#app');`);

    expect(r.clientImports).toContain('document');
    expect(r.type).toBe('client');
    expect(r.needsServerStub).toBe(true);
  });

  it('★ 源码里用了 fetch / localStorage 等 ⇒ 同样算客户端', () => {
    expect(analyzeBoundary(`fetch('/api');`).clientImports).toContain('fetch');
    expect(analyzeBoundary(`localStorage.setItem('k','v');`).clientImports).toContain(
      'localStorage',
    );
  });

  it('★ 源码里用了 node 内置模块的裸名 ⇒ 判为服务端模块', () => {
    const r = analyzeBoundary(`const data = fs.readFileSync('a.txt');`);

    expect(r.serverImports).toContain('fs');
    expect(r.type).toBe('server');
    expect(r.needsClientStub).toBe(true);
  });

  it('客户端 + 服务端混用 ⇒ shared，且两边都要桩', () => {
    const r = analyzeBoundary(`
      import fs from 'fs';
      export function save() { return fs.writeFileSync('a', document.title); }
    `);

    expect(r.type).toBe('shared');
    expect(r.serverImports).toContain('fs');
    expect(r.clientImports).toContain('document');
    expect(r.needsClientStub).toBe(true);
    expect(r.needsServerStub).toBe(true);
  });

  it('纯共享代码（无任何专用 API）⇒ shared 且无需桩', () => {
    const r = analyzeBoundary(`export const add = (a: number, b: number) => a + b;`);

    expect(r.type).toBe('shared');
    expect(r.needsClientStub).toBe(false);
    expect(r.needsServerStub).toBe(false);
  });
});

// ==================== 导入语句检测 ====================

describe('analyzeBoundary：导入语句', () => {
  it('node: 前缀与内置模块 ⇒ 服务端导入', () => {
    const r = analyzeBoundary(`
      import { readFile } from 'node:fs/promises';
      import path from 'path';
    `);

    expect(r.serverImports).toContain('node:fs/promises');
    expect(r.serverImports).toContain('path');
    expect(r.type).toBe('server');
  });

  it('普通第三方/相对导入不算专用', () => {
    const r = analyzeBoundary(`import { ref } from '@lytjs/reactivity';`);

    expect(r.serverImports).toEqual([]);
    expect(r.clientImports).toEqual([]);
    expect(r.type).toBe('shared');
  });
});

// ==================== 函数级归属 ====================

describe('analyzeBoundary：函数级归属', () => {
  it('★ 函数体里用了客户端 API ⇒ clientFunctions', () => {
    const r = analyzeBoundary(`
      function loadData() {
        return fetch('/api/list');
      }
    `);

    expect(r.clientFunctions).toContain('loadData');
    expect(r.serverFunctions).not.toContain('loadData');
  });

  it('★ 函数体里用了服务端 API ⇒ serverFunctions', () => {
    const r = analyzeBoundary(`
      function readConfig() {
        return fs.readFileSync('config.json');
      }
    `);

    expect(r.serverFunctions).toContain('readConfig');
  });

  it('两边都用的函数不归任何一侧（保守）', () => {
    const r = analyzeBoundary(`
      function both() {
        return fs.existsSync(document.title);
      }
    `);

    expect(r.clientFunctions).not.toContain('both');
    expect(r.serverFunctions).not.toContain('both');
  });
});

// ==================== 组件边界 ====================

describe('analyzeBoundary：组件边界', () => {
  it('★ 识别组件的生命周期钩子归属与 server/client 前缀 props', () => {
    const r = analyzeBoundary(`
      const Comp = defineComponent({
        name: 'UserCard',
        props: { serverUser: null, clientTheme: null, plain: null },
        mounted() { document.title = 'x'; },
        serverPrefetch() { return fs.readFile('x'); },
      });
    `);

    expect(r.componentsToSplit).toHaveLength(1);
    const c = r.componentsToSplit[0]!;
    expect(c.name).toBe('UserCard');
    expect(c.serverProps).toEqual(['serverUser']);
    expect(c.clientProps).toEqual(['clientTheme']);
    expect(c.clientMethods).toContain('mounted');
    expect(c.serverMethods).toContain('serverPrefetch');
    expect(c.type).toBe('shared'); // 两侧都有
    expect(c.lifecycleHooks).toEqual([
      { name: 'mounted', type: 'client' },
      { name: 'serverPrefetch', type: 'server' },
    ]);
  });

  it('无生命周期钩子的组件不进 componentsToSplit', () => {
    const r = analyzeBoundary(`
      const Comp = defineComponent({ name: 'Plain', props: { a: null } });
    `);

    expect(r.componentsToSplit).toHaveLength(0);
  });
});

// ==================== 分割产物 ====================

describe('splitClientServer', () => {
  it('纯客户端模块：clientCode 就是原文，serverCode 为空', () => {
    const src = `const el = document.body;`;
    const r = splitClientServer(src);

    expect(r.clientCode).toBe(src);
    expect(r.serverCode).toBe('');
    expect(r.sharedCode).toBe('');
  });

  it('shared 模块：两侧各带指令，且**不得**把全局对象当成可 import 的模块', () => {
    const src = `
      import fs from 'fs';
      export function read() { return fs.readFileSync('a'); }
      export function paint() { document.body.className = 'x'; }
    `;
    const r = splitClientServer(src);

    expect(r.serverCode.startsWith("'use server';")).toBe(true);
    expect(r.clientCode.startsWith("'use client';")).toBe(true);

    // ★ 关键：`document` 是浏览器全局，不是模块 ⇒ 生成 `import 'document';` 是**非法代码**
    expect(r.clientCode).not.toContain("import 'document'");
    expect(r.serverCode).toContain("import 'fs'");
  });

  it('generateTypes: false ⇒ 不产出类型定义', () => {
    const src = `
      import fs from 'fs';
      export function read() { return fs.readFileSync('a'); }
      export function paint() { document.body.className = 'x'; }
    `;

    expect(splitClientServer(src, { generateTypes: false }).typeDefinition).toBe('');
    expect(splitClientServer(src).typeDefinition).toContain('export function');
  });
});

// ==================== 运行时环境判定 ====================

describe('runtime / serverOnly / clientOnly / createEnvironmentValue', () => {
  it('jsdom 环境下 isClient=true、isServer=false、isNode=true', () => {
    expect(runtime.isClient).toBe(true);
    expect(runtime.isServer).toBe(false);
    expect(runtime.isNode).toBe(true);
  });

  it('serverOnly 在客户端返回 undefined 且**不执行**回调', () => {
    let called = false;
    const r = serverOnly(() => {
      called = true;
      return 1;
    });

    expect(r).toBeUndefined();
    expect(called).toBe(false);
  });

  it('clientOnly 在客户端执行并返回结果', () => {
    expect(clientOnly(() => 42)).toBe(42);
  });

  it('createEnvironmentValue 选客户端分支', () => {
    expect(createEnvironmentValue({ server: () => 'S', client: () => 'C' })).toBe('C');
    expect(createEnvironmentValue({ server: () => 'S' })).toBeUndefined();
  });
});
