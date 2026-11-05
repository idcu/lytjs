/**
 * src/directives.ts
 * 自定义指令的**运行时消费端**（2026-10-31 新增）
 *
 * ## 背景
 *
 * `withDirectives(vnode, [...])` 只是把指令挂到 `vnode._directives` 上；
 * **此前全仓没有任何地方读它** —— 指令写了等于没写（连告警都没有）。
 *
 * 本模块在三个热路径被调用：
 *   · `patch-element.ts` 的 `mountElement` → `beforeMount` / `mounted`
 *   · `patch-element.ts` 的 `patchElement` → `beforeUpdate` / `updated`
 *   · `patch.ts` 的 `unmount`           → `beforeUnmount` / `unmounted`
 *
 * ## 契约（与 Vue 一致）
 *
 * ```ts
 * app.directive('focus', {
 *   mounted(el, binding) { el.focus(); },          // binding: { value, oldValue, arg, modifiers, instance }
 *   updated(el, binding) { … },
 *   unmounted(el) { … },
 * })
 * ```
 *
 * 钩子抛错**不吞**：与渲染函数抛错同级别，交给上层错误处理 —— 吞掉只会制造"指令没生效"
 * 这种最难排查的现象。
 */

import type { VNode } from '@lytjs/common-vnode';

export type DirectiveHookName =
  | 'created'
  | 'beforeMount'
  | 'mounted'
  | 'beforeUpdate'
  | 'updated'
  | 'beforeUnmount'
  | 'unmounted';

interface DirectiveEntry {
  dir?: Record<string, unknown>;
  value?: unknown;
  arg?: unknown;
  modifiers?: unknown;
}

type DirectiveVNode = VNode & { _directives?: DirectiveEntry[] };

/** 该 vnode 是否挂了指令（供调用方提前短路，避免热路径上的属性读取） */
export function hasDirectives(vnode: VNode): boolean {
  const entries = (vnode as DirectiveVNode)._directives;
  return !!entries && entries.length > 0;
}

/**
 * 触发 vnode 上的指令钩子。
 *
 * @param vnode     当前 vnode（挂载/更新后）
 * @param name      钩子名
 * @param prevVNode 更新场景的旧 vnode（用于 `binding.oldValue`）
 */
export function invokeDirectiveHook(
  vnode: VNode,
  name: DirectiveHookName,
  prevVNode: VNode | null = null,
): void {
  const entries = (vnode as DirectiveVNode)._directives;
  if (!entries || entries.length === 0) return;

  const prevEntries = prevVNode ? (prevVNode as DirectiveVNode)._directives : undefined;
  const el = vnode.el;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const hook = entry?.dir?.[name];
    if (typeof hook !== 'function') continue;

    const prev = prevEntries?.[i];
    (hook as (el: unknown, binding: Record<string, unknown>) => void)(el, {
      value: entry!.value,
      oldValue: prev ? prev.value : undefined,
      arg: entry!.arg,
      modifiers: (entry!.modifiers as Record<string, boolean>) ?? {},
      instance: null,
    });
  }
}
