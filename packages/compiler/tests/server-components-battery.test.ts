// @vitest-environment node
/**
 * `compiler/src/server-components/index.ts` 行为电池。
 *
 * 该文件此前 **160/168 语句未覆盖（4.8%）**，一条判据都没有。它的产物是**要被执行的代码**，
 * 所以本电池的重点不是「字符串里有没有某个词」，而是：
 * ① 生成的代码**能不能通过语法解析**；② **能不能真正执行**（TDZ / 重复声明这类问题
 * 只有真的跑一遍才会暴露）。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  detectServerDirective,
  analyzeServerComponent,
  compileServerComponent,
  generateServerComponentCode,
  generateClientStubCode,
  generateTypeDefinition,
  createServerReference,
  createServerProxy,
} from '../src/server-components/index';
import type { ServerComponentAnalysis } from '../src/server-components/index';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** 把 ESM 产物降级成可 `new Function` 的脚本（只为验证语法/执行，不改语义） */
function toExecutable(code: string): string {
  return code
    .replace(/^\s*import\s+.*$/gm, '')
    .replace(/^\s*export\s+\{[^}]*\};?$/gm, '')
    .replace(/^(\s*)export\s+/gm, '$1');
}

const emptyAnalysis: ServerComponentAnalysis = {
  isServerComponent: true,
  isClientComponent: false,
  serverFunctions: [],
  clientImports: [],
  dataFetchers: [],
  serializedData: {},
};

describe('detectServerDirective', () => {
  it('识别单引号 / 双引号 / 带分号的 use server', () => {
    expect(detectServerDirective(`'use server';`)).toBe('use server');
    expect(detectServerDirective(`"use server"`)).toBe('use server');
    expect(detectServerDirective(`'use server';\nimport x from 'y';`)).toBe('use server');
  });

  it('识别 use client', () => {
    expect(detectServerDirective(`'use client';`)).toBe('use client');
  });

  it('没有指令时返回 null', () => {
    expect(detectServerDirective('export const a = 1;')).toBeNull();
  });

  it('指令不在行首时不误判（`const msg = "use server"` 不算）', () => {
    expect(detectServerDirective(`const msg = "use server";`)).toBeNull();
  });

  it('两个指令同时存在时 use server 优先（既有约定）', () => {
    expect(detectServerDirective(`'use server';\n'use client';`)).toBe('use server');
  });
});

describe('analyzeServerComponent', () => {
  it('use server ⇒ isServerComponent，use client ⇒ isClientComponent', () => {
    expect(analyzeServerComponent(`'use server';`).isServerComponent).toBe(true);
    expect(analyzeServerComponent(`'use server';`).isClientComponent).toBe(false);
    expect(analyzeServerComponent(`'use client';`).isClientComponent).toBe(true);
    expect(analyzeServerComponent(`'use client';`).isServerComponent).toBe(false);
  });

  it('提取 async function（导出与非导出都算）', () => {
    const a = analyzeServerComponent(`
      'use server';
      export async function save() {}
      async function internal() {}
    `);

    expect(a.serverFunctions).toEqual(['save', 'internal']);
  });

  it('提取导出的箭头函数（async 与同步）', () => {
    const a = analyzeServerComponent(`
      'use server';
      export const submit = async (data) => data;
      export const double = (x) => x * 2;
      export const single = x => x;
    `);

    expect(a.serverFunctions).toEqual(['submit', 'double', 'single']);
  });

  it('提取客户端导入（含具名与默认）', () => {
    const a = analyzeServerComponent(`
      'use server';
      import a from './a';
      import { b, c } from './b';
      import * as d from './d';
    `);

    expect(a.clientImports).toEqual(['./a', './b', './d']);
  });

  it('提取数据获取函数（fetch/load/get 开头的 function 声明）', () => {
    const a = analyzeServerComponent(`
      'use server';
      async function fetchUser() {}
      function loadData() {}
      export function getThing() {}
      function other() {}
    `);

    expect(a.dataFetchers).toEqual(['fetchUser', 'loadData', 'getThing']);
  });

  it('serializedData 初始为空对象', () => {
    expect(analyzeServerComponent(`'use server';`).serializedData).toEqual({});
  });

  it('未提供 options 时使用默认值（不抛错）', () => {
    expect(() => analyzeServerComponent(`'use server';`)).not.toThrow();
  });
});

describe('generateServerComponentCode', () => {
  it('注入服务端运行时导入，并移除 use server 指令', () => {
    const source = `'use server';\nexport async function save() {}`;
    const code = generateServerComponentCode(source, analyzeServerComponent(source));

    expect(code).toContain(`import { createServerReference } from '@lytjs/renderer/server';`);
    expect(code).not.toContain(`'use server'`);
    expect(code).toContain('export async function save() {}');
  });

  it('为每个服务端函数生成 Reference 常量', () => {
    const source = `'use server';\nexport async function save() {}\nexport async function load() {}`;
    const code = generateServerComponentCode(source, analyzeServerComponent(source));

    expect(code).toContain(`export const saveReference = createServerReference('save', save);`);
    expect(code).toContain(`export const loadReference = createServerReference('load', load);`);
  });

  it('★ 箭头函数形式（`export const f = async () => {}`）生成的代码必须能执行', () => {
    const source = `'use server';\nexport const submit = async (data) => data;`;
    const code = generateServerComponentCode(source, analyzeServerComponent(source));

    const run = new Function('createServerReference', toExecutable(code)) as (
      ref: (id: string, fn: unknown) => unknown,
    ) => void;

    // 修复前：Reference 常量被插在源码**之前** ⇒ `const submit` 尚未初始化 ⇒ TDZ ReferenceError
    expect(() => run((_id, fn) => fn)).not.toThrow();
  });

  it('★ 函数声明形式也必须能执行（回归护栏）', () => {
    const source = `'use server';\nexport async function save() {}`;
    const code = generateServerComponentCode(source, analyzeServerComponent(source));
    const run = new Function('createServerReference', toExecutable(code)) as (
      ref: (id: string, fn: unknown) => unknown,
    ) => void;

    expect(() => run((_id, fn) => fn)).not.toThrow();
  });

  it('没有服务端函数时也能生成（只有导入 + 源码）', () => {
    const source = `'use server';\nconst a = 1;`;
    const code = generateServerComponentCode(source, analyzeServerComponent(source));

    expect(code).toContain('createServerReference');
    expect(code).toContain('const a = 1;');
  });
});

describe('generateClientStubCode', () => {
  it('为每个服务端函数生成代理', () => {
    const code = generateClientStubCode('MyComp', {
      ...emptyAnalysis,
      serverFunctions: ['save', 'load'],
    });

    expect(code).toContain(`export const save = createServerProxy('MyComp', 'save');`);
    expect(code).toContain(`export const load = createServerProxy('MyComp', 'load');`);
  });

  it('数据获取函数生成「禁止客户端调用」的桩', () => {
    const code = generateClientStubCode('MyComp', { ...emptyAnalysis, dataFetchers: ['getData'] });

    expect(code).toContain('export async function getData(...args: unknown[])');
    expect(code).toContain('is a server-only function and cannot be called on the client');
  });

  it('★ 服务端函数同时是数据获取函数时，桩代码不能重复声明同一个名字', () => {
    // `async function fetchUser()` 会同时被「服务端函数」与「数据获取函数」两个提取器命中
    const source = `'use server';\nasync function fetchUser() {}`;
    const analysis = analyzeServerComponent(source);

    expect(analysis.serverFunctions).toContain('fetchUser');
    expect(analysis.dataFetchers).toContain('fetchUser');

    const code = generateClientStubCode('MyComp', analysis);

    // 修复前会同时产出 `const fetchUser = ...` 与 `function fetchUser(...)` ⇒ SyntaxError
    expect(() => new Function(toExecutable(code))).not.toThrow();
  });

  it('没有任何函数时只产出头部注释与导入', () => {
    const code = generateClientStubCode('Empty', emptyAnalysis);

    expect(code).toContain('// Client stub for server component: Empty');
    expect(code).toContain(`import { createServerProxy } from '@lytjs/renderer/client';`);
  });
});

describe('generateTypeDefinition', () => {
  it('为每个服务端函数生成 Promise 签名', () => {
    const code = generateTypeDefinition('MyComp', { ...emptyAnalysis, serverFunctions: ['save'] });

    expect(code).toContain('// Type definitions for server component: MyComp');
    expect(code).toContain('export function save(...args: unknown[]): Promise<unknown>;');
  });

  it('无函数时只产出注释（不产生空签名）', () => {
    const code = generateTypeDefinition('Empty', emptyAnalysis);

    expect(
      code
        .trim()
        .split('\n')
        .filter((l) => l.startsWith('export')),
    ).toEqual([]);
  });
});

describe('compileServerComponent', () => {
  it('非 Server Component ⇒ serverCode / typeDefinition 为 null，clientCode 原样返回', () => {
    const source = `'use client';\nexport default {};`;
    const r = compileServerComponent(source, 'src/ClientComp.tsx');

    expect(r.serverCode).toBeNull();
    expect(r.typeDefinition).toBeNull();
    expect(r.clientCode).toBe(source);
    expect(r.analysis.isClientComponent).toBe(true);
  });

  it('Server Component ⇒ 三份产物齐全，组件名取自文件名', () => {
    const source = `'use server';\nexport async function save() {}`;
    const r = compileServerComponent(source, 'src/components/UserCard.tsx');

    expect(r.serverCode).toContain('createServerReference');
    expect(r.clientCode).toContain('// Client stub for server component: UserCard');
    expect(r.typeDefinition).toContain('server component: UserCard');
  });

  it('generateClientStubs:false ⇒ 不生成客户端桩', () => {
    const source = `'use server';\nexport async function save() {}`;
    const r = compileServerComponent(source, 'a.ts', { generateClientStubs: false });

    expect(r.clientCode).toBeNull();
    expect(r.serverCode).not.toBeNull();
  });

  it('文件名无扩展名 / 无目录时组件名退化正确', () => {
    const source = `'use server';`;

    expect(compileServerComponent(source, 'Comp').typeDefinition).toContain('Comp');
    expect(compileServerComponent(source, 'a/b/c.ts').typeDefinition).toContain('c');
  });

  it('★ 编译产物整体可解析（服务端代码 + 客户端桩）', () => {
    const source = `
      'use server';
      import { db } from './db';
      export async function save(data) { return db.save(data); }
      async function fetchUser(id) { return db.get(id); }
      export const remove = async (id) => db.remove(id);
    `;
    const r = compileServerComponent(source, 'src/Thing.ts');

    expect(() => new Function('createServerReference', toExecutable(r.serverCode!))).not.toThrow();
    expect(() => new Function('createServerProxy', toExecutable(r.clientCode!))).not.toThrow();
  });
});

describe('createServerReference', () => {
  it('给函数打上 id 与标记，并原样返回', async () => {
    const fn = async (x: unknown) => x;
    const returned = createServerReference('save', fn);

    expect(returned).toBe(fn);
    expect((fn as unknown as { __serverReferenceId: string }).__serverReferenceId).toBe('save');
    expect((fn as unknown as { __isServerReference: boolean }).__isServerReference).toBe(true);
    expect(await returned(1)).toBe(1);
  });
});

describe('createServerProxy', () => {
  it('POST 到服务端动作端点，带上组件名 / 函数名与序列化后的参数', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: 1 }) }));
    vi.stubGlobal('fetch', fetchMock);

    const proxy = createServerProxy<(...a: unknown[]) => Promise<unknown>>('MyComp', 'save');
    const result = await proxy({ a: 1 }, 2);

    expect(result).toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];

    expect(url).toBe('/__lytjs_server_action');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['X-Server-Component']).toBe('MyComp');
    expect((init.headers as Record<string, string>)['X-Server-Function']).toBe('save');
    expect(JSON.parse(init.body as string)).toEqual({ args: [{ a: 1 }, 2] });
  });

  it('响应非 2xx 时抛出带状态文本的错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, statusText: 'Internal Server Error' })),
    );

    const proxy = createServerProxy<() => Promise<unknown>>('MyComp', 'boom');

    await expect(proxy()).rejects.toThrow(/Server function boom failed: Internal Server Error/);
  });
});
