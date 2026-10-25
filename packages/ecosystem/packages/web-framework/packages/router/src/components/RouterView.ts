/**
 * @lytjs/router - RouterView component
 *
 * Renders the matched component for the current route.
 * Supports nested routes by rendering child RouterView.
 */

import type { RouteLocationNormalized, RouteRecordNormalized } from '../types';
import { useRoute } from '../composables/useRoute';
import { computedSignal as computed } from '@lytjs/reactivity';
import { createVNode } from '@lytjs/vdom';
import type { VNode } from '@lytjs/vdom';
import { defineAsyncComponent, inject, provide } from '@lytjs/component';
import type { ComponentOptions } from '@lytjs/component';

export interface RouterViewProps {
  name?: string;
  route?: RouteLocationNormalized;
}

/**
 * 视图层级 key。
 *
 * 嵌套路由里每一层 `RouterView` 必须渲染**自己那一层**的匹配记录（`matched[depth]`），
 * 否则内层视图会重复渲染父组件 ⇒ 递归到底。用 `Symbol` 保证不与用户的 provide 撞名。
 */
export const viewDepthKey = Symbol('lytjs-router-view-depth');

// `../types` 里的 `Component` 只是 `unknown` 的别名（且未导出），这里直接用 unknown 表达
type ViewComponent = unknown;

/**
 * 把路由记录里的 `component` 规整成「可交给 `createVNode` 的 vnode type」。
 *
 * - 组件对象（含 `setup` / `render`）⇒ 原样（`defineAsyncComponent` 的产物也是这种）；
 * - **零参函数** `() => import(...)` ⇒ 懒加载器，用 `defineAsyncComponent` 包起来；
 * - 带参函数是**函数式组件**（`(props) => vnode`），原样交给渲染器。
 *
 * ⚠️ 零参 / 带参是这里唯一可靠的运行期信号：两者都是 function，而路由记录的类型把
 *    「懒加载」显式声明为 `() => Promise<Component>`。不需要 props 的函数式组件请先用
 *    `defineFunctionalComponent` 包一层再放进路由。
 */
function resolveViewComponent(component: ViewComponent): ViewComponent {
  if (typeof component !== 'function') return component;
  if ('setup' in component || 'render' in component) return component;
  return component.length === 0
    ? (defineAsyncComponent(component as unknown as () => Promise<ComponentOptions>) as unknown)
    : component;
}

/** 按路由记录的 `props` 配置算出要透传给视图组件的 props */
function resolveRouteProps(
  record: RouteRecordNormalized,
  currentRoute: RouteLocationNormalized,
): Record<string, unknown> {
  const { props } = record;
  if (typeof props === 'function') return props(currentRoute) ?? {};
  if (props === true) return (currentRoute.params ?? {}) as Record<string, unknown>;
  if (props && typeof props === 'object') return props as Record<string, unknown>;
  return {};
}

/**
 * RouterView component
 * Renders the matched component for the current route.
 * Supports named views via the `name` prop and props passing from route records.
 */
export const RouterView = {
  name: 'RouterView',

  props: {
    name: {
      type: String,
      default: 'default',
    },
    // ★ 2026-10-25：`RouterViewProps.route` 此前**只在 TS 接口里声明**，运行期 `props`
    //   选项没有它 ⇒ 传 `:route` 只会落成 attr，组件里永远读不到（装饰性声明）。
    route: {
      type: Object,
      default: undefined,
    },
  },

  setup(props: RouterViewProps) {
    // 当前层级 = 父 RouterView 提供的 depth + 1（根为 0）
    const injectedDepth = inject<number>(viewDepthKey, 0);
    const depth = typeof injectedDepth === 'number' ? injectedDepth : 0;
    provide(viewDepthKey, depth + 1);

    const injectedRoute = useRoute();
    const currentRoute = computed(
      () => (props.route ?? injectedRoute()) as RouteLocationNormalized,
    );

    const matchedView = computed(() => {
      const matched = currentRoute().matched ?? [];
      const record = matched[depth] as RouteRecordNormalized | undefined;
      if (!record) return null;

      const viewName = props.name ?? 'default';
      const component =
        record.components?.[viewName] ?? (viewName === 'default' ? record.component : undefined);

      return component ? { component, record } : null;
    });

    return (): VNode | null => {
      const hit = matchedView();
      if (!hit) return null;

      const routeProps = resolveRouteProps(hit.record, currentRoute());

      // ★ 2026-10-25 修复（P1）：此前返回 `{ ...resolvedComponent, props }` ——
      //   ① 不是 vnode（渲染器只认带 `type` 的对象）⇒ `<RouterView>` 渲染不出任何东西；
      //   ② 还把组件**自身的 props 声明**（`{ id: { type: String } }`）混进了 props 值里；
      //   ③ 对懒加载直接 `component()` 调用会拿到 Promise。
      return createVNode(
        resolveViewComponent(hit.component) as Parameters<typeof createVNode>[0],
        routeProps,
      ) as VNode;
    };
  },
};
