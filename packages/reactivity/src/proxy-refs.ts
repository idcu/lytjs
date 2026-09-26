/**
 * @lytjs/reactivity - proxyRefs
 * 自动解包 ref 的对象代理
 *
 * ## 为什么需要它（2026-09-26 修复）
 *
 * 组件 `setup()` 返回的状态对象此前被**原样**存进 `instance.setupState`，
 * 于是模板里的 `{{ msg }}` 编译成 `toDisplayString(_ctx.msg)` 时拿到的是
 * **Ref 对象本身**，页面渲染出的是它的 JSON 序列化：
 * ```
 * { "dep": [], "__v_isRef": true, "_rawValue": "hi", "_value": "hi" }
 * ```
 * 这是所有使用 `ref()` 的组件都会踩到的问题（README 首个示例即如此）。
 *
 * 与 Vue 一致的做法：把 setup 返回值经 `proxyRefs()` 包装，
 * 读取时自动 `unref`、写入时自动写回 `.value`。
 */

import { unref, isRef } from './ref';
import { isReactive } from './reactive';

type RecordLike = Record<string, unknown>;

/**
 * 浅层解包代理的 handler：
 * - `get`：读到的 ref 自动 `unref`（深层 ref 不展开，与 Vue 的 shallow 语义一致）
 * - `set`：若旧值是 ref、新值不是，则写入 `.value`（保持响应式链路不断）
 */
const shallowUnwrapHandlers: ProxyHandler<RecordLike> = {
  get(target, key, receiver) {
    return unref(Reflect.get(target, key, receiver));
  },
  set(target, key, value, receiver) {
    const oldValue = Reflect.get(target, key, receiver);
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return true;
    }
    return Reflect.set(target, key, value, receiver);
  },
};

/**
 * 返回一个会**自动解包 ref** 的代理对象。
 *
 * @param objectWithRefs 含 ref 的普通对象（通常是 `setup()` 的返回值）
 * @returns 读取时自动 unref 的代理；若入参已是 reactive 对象则原样返回（避免双重代理）
 */
export function proxyRefs<T extends object>(objectWithRefs: T): T {
  return (isReactive(objectWithRefs)
    ? objectWithRefs
    : new Proxy(objectWithRefs as RecordLike, shallowUnwrapHandlers)) as T;
}
