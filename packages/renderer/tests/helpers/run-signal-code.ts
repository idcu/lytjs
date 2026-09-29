/**
 * 把 signal codegen 的**产物字符串**真正执行起来的小试验台。
 *
 * 动机：`createSignalRenderer` 走的是**非优化版** codegen，因此优化版（`optimizeSignal: true`，
 * **默认**）此前只有「产物含某字符串」这类**形状断言**——按本仓纪律，形状断言**不能证明可用**：
 * 产物完全可能编译通过、却在运行期取不到值或直接抛错。
 *
 * 做法：产物是一个 ES 模块（`import{ e as effect }from'@lytjs/reactivity'; … export function render(…)`）。
 * 这里把 `import` 语句改写成对真实模块命名空间的**解构取值**，去掉 `export`，再用 `new Function`
 * 求值，返回其中的 `render`。于是可以对**任意** codegen 变体做「mount → 真实 DOM/事件 → 断言」。
 */

import * as reactivity from '@lytjs/reactivity';
import * as domRuntime from '@lytjs/dom-runtime';

type Mod = Record<string, unknown>;

const MODULES: Record<string, Mod> = {
  '@lytjs/reactivity': reactivity as unknown as Mod,
  '@lytjs/dom-runtime': domRuntime as unknown as Mod,
};

export type SignalRenderFn = (ctx: unknown, container: unknown) => unknown;

/** 执行 signal codegen 产物，返回其 `render` 函数 */
export function runSignalModule(code: string): SignalRenderFn {
  const header: string[] = [];

  const body = code.replace(
    /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]\s*;?/g,
    (_all: string, spec: string, mod: string) => {
      if (!(mod in MODULES)) {
        throw new Error(`runSignalModule: 产物引用了未知模块 "${mod}"`);
      }
      for (const raw of spec.split(',')) {
        const part = raw.trim();
        if (!part) continue;
        const [orig, alias] = part.split(/\s+as\s+/).map((x) => x.trim());
        const local = alias || orig;
        header.push(`const ${local} = __mods[${JSON.stringify(mod)}][${JSON.stringify(orig)}];`);
      }
      return '';
    },
  );

  // `export function render(...)` → `function render(...)`，并在末尾把 render 返回出去
  const stripped = body.replace(/^\s*export\s+/gm, '');
  const factory = new Function('__mods', `${header.join('\n')}\n${stripped}\nreturn render;`) as (
    mods: Record<string, Mod>,
  ) => SignalRenderFn;

  return factory(MODULES);
}

/** 便捷：编译 + 执行 + 挂载，返回容器（已插入 document.body） */
export function mountSignal(
  code: string,
  ctx: unknown,
): { container: HTMLElement; render: SignalRenderFn } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const render = runSignalModule(code);
  render(ctx, container);
  return { container, render };
}
