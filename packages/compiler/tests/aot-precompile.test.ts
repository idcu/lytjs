/**
 * 真 AOT 预编译（`precompileTemplate`）行为级测试
 *
 * 断言产物是**可 `import()` 的 ESM 模块源**（含 helper import + `export { render }`），
 * 且**不含 `new Function`** —— 即运行时无需编译、编译器可移出产物。
 * 并实际把产物写入 `.mjs`、`import()` 后调用 `render()`，证明它真的能跑。
 *
 * 与「运行时编译」（`core/src/template-compiler.ts` 用 `new Function` 注入 helper）
 * 形成对照：本测试的第二条用例**完全不经过 `new Function`** 就渲染出了 VNode。
 */

import { describe, it, expect, afterAll } from 'vitest';
import { writeFile, rm, mkdir } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { precompileTemplate } from '../src/optimizations';

const HERE = dirname(fileURLToPath(import.meta.url));
// ⚠️ 唯一临时目录：全量套件并行运行时，固定名目录会与「上一次运行的 afterAll 清理」竞态
// （实测偶发 import 失败）。用 pid+时间戳隔离。
const TMP_DIR = join(HERE, `__aot_tmp_${process.pid}_${Date.now()}__`);

afterAll(async () => {
  await rm(TMP_DIR, { recursive: true, force: true });
});

describe('precompileTemplate —— 真 AOT（构建期产出可导入模块源）', () => {
  it('产物是可导入的 ESM 模块源：含 @lytjs/core import + export render，且无 new Function', () => {
    const { code, size } = precompileTemplate('<div>{{ msg }}</div>');
    expect(size).toBe(code.length);
    expect(code).toContain("from '@lytjs/core'");
    expect(code).toMatch(/function\s+render\s*\(/);
    expect(code).toContain('export { render }');
    // 关键：AOT 产物不得依赖运行时 new Function
    expect(code).not.toContain('new Function');
  });

  it('产物真的能 import() 并在运行时渲染（不经过 new Function）', async () => {
    await mkdir(TMP_DIR, { recursive: true });
    const { code } = precompileTemplate('<div>hello</div>');
    const file = join(TMP_DIR, 'render.mjs');
    await writeFile(file, code, 'utf8');

    // 加 cache-busting query：避免 vitest 模块缓存把同 URL 的旧产物返回
    const mod = (await import(`${pathToFileURL(file).href}?t=${Date.now()}`)) as {
      render: (ctx: unknown, cache: unknown) => { type?: unknown } | null;
    };
    expect(typeof mod.render).toBe('function');

    const vnode = mod.render({}, {});
    expect(vnode).toBeTruthy();
    expect(vnode!.type).toBe('div');
    // 动态 import 走真实 ESM 加载，全量套件高负载下会 >5s（默认超时）⇒ 显式放宽
  }, 30000);

  it('自定义 runtimeModuleName 生效（helper 从指定包导入）', () => {
    const { code } = precompileTemplate('<span>x</span>', {
      runtimeModuleName: '@lytjs/vdom',
    });
    expect(code).toContain("from '@lytjs/vdom'");
    expect(code).not.toContain("from '@lytjs/core'");
  });
});
