/**
 * @lytjs/plugin-vue-router — RouterView 和 RouterLink 组件
 *
 * 提供 vue-router 4 兼容的内置组件：
 * - RouterView: 根据 currentRoute.matched 渲染对应组件
 * - RouterLink: 生成 <a> 标签，点击时调用 router.push()
 */

import { getCurrentInstance } from '@lytjs/compat';
import type { VueRouter } from './router';

// ============================================================
// RouterView
// ============================================================

/**
 * RouterView 组件
 *
 * 根据 currentRoute.matched 渲染对应组件。
 * 支持 name 属性用于命名视图。
 *
 * @example
 * ```html
 * <RouterView />
 * <RouterView name="sidebar" />
 * ```
 */
export const RouterView = {
  name: 'RouterView',

  props: {
    /** 命名视图名称 */
    name: {
      type: String,
      default: 'default',
    },
  },

  setup(props: any) {
    const instance = getCurrentInstance();

    return () => {
      // 从 app context 中获取 router
      const app = instance?.appContext?.app;
      if (!app) {
        console.warn('[plugin-vue-router] RouterView: 无法获取 app 实例');
        return null;
      }

      const router = (app as any)._vueRouter as VueRouter | undefined;
      if (!router) {
        console.warn('[plugin-vue-router] RouterView: router 未安装');
        return null;
      }

      const currentRoute = router.currentRoute.value;

      // 查找匹配的路由记录
      const matched = currentRoute.matched;
      if (!matched || matched.length === 0) {
        return null;
      }

      // 获取最深层匹配的组件
      const deepestMatched = matched[matched.length - 1];
      const component = deepestMatched?.component;

      if (!component) {
        return null;
      }

      // 返回 VNode
      // 使用 h 函数创建组件 VNode
      try {
        const { h } = require('@lytjs/core');
        return h(component, {
          route: currentRoute,
        });
      } catch {
        // 如果无法使用 h 函数，返回 null
        console.warn('[plugin-vue-router] RouterView: 无法渲染组件，请确保 @lytjs/core 可用');
        return null;
      }
    };
  },
};

// ============================================================
// RouterLink
// ============================================================

/**
 * RouterLink 组件
 *
 * 生成 <a> 标签，点击时调用 router.push() 进行导航。
 * 支持 to、replace、activeClass、exactActiveClass 等属性。
 *
 * @example
 * ```html
 * <RouterLink to="/home">首页</RouterLink>
 * <RouterLink to="/user/123" replace>用户</RouterLink>
 * <RouterLink :to="{ name: 'user', params: { id: 123 } }">用户</RouterLink>
 * ```
 */
export const RouterLink = {
  name: 'RouterLink',

  props: {
    /** 目标路由（路径字符串或路由对象） */
    to: {
      type: [String, Object],
      required: true,
    },
    /** 是否使用 replace 替代 push */
    replace: {
      type: Boolean,
      default: false,
    },
    /** 激活时的 CSS 类名 */
    activeClass: {
      type: String,
      default: 'router-link-active',
    },
    /** 精确匹配激活时的 CSS 类名 */
    exactActiveClass: {
      type: String,
      default: 'router-link-exact-active',
    },
    /** 自定义标签名 */
    custom: {
      type: Boolean,
      default: false,
    },
    /** HTML tag */
    tag: {
      type: String,
      default: 'a',
    },
  },

  setup(props: any, { slots }: any) {
    const instance = getCurrentInstance();

    function resolveTo(to: string | any): string {
      if (typeof to === 'string') {
        return to;
      }
      // 支持 { path, query, hash, params } 格式
      if (to.path) {
        let path = to.path;
        // 处理 params
        if (to.params) {
          for (const key of Object.keys(to.params)) {
            path = path.replace(`:${key}`, String(to.params[key]));
          }
        }
        // 处理 query
        if (to.query && Object.keys(to.query).length) {
          const qs = Object.entries(to.query)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
            .join('&');
          path += '?' + qs;
        }
        // 处理 hash
        if (to.hash) {
          path += '#' + to.hash;
        }
        return path;
      }
      // 支持 { name, params } 格式
      if (to.name) {
        const app = instance?.appContext?.app;
        const router = (app as any)?._vueRouter as VueRouter | undefined;
        if (router) {
          const resolved = router.resolve(to);
          return resolved.fullPath;
        }
      }
      return '/';
    }

    function isActive(currentPath: string, targetPath: string, exact: boolean): boolean {
      if (exact) {
        return currentPath === targetPath;
      }
      return currentPath.startsWith(targetPath);
    }

    function handleClick(event: Event): void {
      // 阻止默认行为
      event.preventDefault();

      const app = instance?.appContext?.app;
      if (!app) return;

      const router = (app as any)._vueRouter as VueRouter | undefined;
      if (!router) return;

      const targetPath = resolveTo(props.to);

      if (props.replace) {
        router.replace(targetPath);
      } else {
        router.push(targetPath);
      }
    }

    return () => {
      const app = instance?.appContext?.app;
      const router = (app as any)?._vueRouter as VueRouter | undefined;
      const currentPath = router?.currentRoute.value?.path || '/';
      const targetPath = resolveTo(props.to);

      const active = isActive(currentPath, targetPath, false);
      const exactActive = isActive(currentPath, targetPath, true);

      const classObj: Record<string, boolean> = {};
      if (active) classObj[props.activeClass] = true;
      if (exactActive) classObj[props.exactActiveClass] = true;

      const href = targetPath;

      if (props.custom) {
        // 自定义渲染模式
        return slots.default?.({
          href,
          isActive: active,
          isExactActive: exactActive,
          navigate: handleClick,
          route: router?.currentRoute.value,
        });
      }

      // 默认渲染 <a> 标签
      try {
        const { h } = require('@lytjs/core');
        return h(
          props.tag || 'a',
          {
            href,
            class: classObj,
            onClick: handleClick,
          },
          slots.default?.()
        );
      } catch {
        // 回退：返回简单对象描述
        return {
          tag: 'a',
          props: { href, class: classObj, onClick: handleClick },
          children: slots.default?.(),
        };
      }
    };
  },
};
