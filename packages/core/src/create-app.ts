// src/create-app.ts
import { createRenderer, createVNode } from '@lytjs/vdom';
import { isSafeAttribute } from '@lytjs/common-string';
import type { App, AppConfig, Plugin, Component, ComponentPublicInstance } from './types';

export function createApp(rootComponent: Component, rootProps: any = null): App {
  const context = createAppContext();
  const installedPlugins = new Set<Plugin | Function>();

  const app: App = {
    config: createContextConfig(context),

    use(plugin: Plugin | Function, ...options: any[]) {
      if (installedPlugins.has(plugin)) return app;

      if (typeof plugin === 'function') {
        (plugin as Function)(app, ...options);
      } else {
        plugin.install(app, ...options);
      }

      installedPlugins.add(plugin);
      return app;
    },

    mount(rootContainer: any) {
      const container = typeof rootContainer === 'string'
        ? document.querySelector(rootContainer)
        : rootContainer;

      if (!container) {
        throw new Error(
          `[LytJS] Failed to mount app: cannot find element matching selector "${rootContainer}". ` +
          `Make sure the target element exists in the DOM before calling app.mount().`
        );
      }

      // 解析根组件的 render 函数，生成 VNode
      const comp = rootComponent as any;
      let vnode: any;

      if (typeof comp === 'object' && comp.render) {
        // 组件对象：创建一个简单的渲染上下文并调用 render
        const instance = {
          ...rootProps,
          ...comp.data?.(),
          ...comp.methods,
          $props: rootProps || {},
          $refs: {},
          $slots: {},
          $emit: () => {},
        };
        vnode = comp.render.call(instance);
      } else if (typeof comp === 'function') {
        // 函数式组件
        vnode = comp(rootProps);
      } else {
        vnode = createVNode(comp, rootProps);
      }

      const renderer = createRenderer(getRendererOptions());
      context.renderer = renderer;
      context._container = container;
      context._vnode = vnode;

      renderer.mount(vnode, container);

      const publicInstance: ComponentPublicInstance = {
        $data: {},
        $el: vnode.el,
        $options: rootComponent as any,
        $props: rootProps || {},
        $refs: {},
        $slots: {},
        $emit: () => {},
        $forceUpdate: () => {},
        $nextTick: () => Promise.resolve(),
      };

      return publicInstance;
    },

    unmount() {
      if (context.renderer && context._vnode) {
        context.renderer.unmount(context._vnode);
        context._vnode = null;
      }
      context._container = null;
    },

    provide(key, value) {
      context.provides[key as string] = value;
      return app;
    },

    inject(key) {
      return context.provides[key as string];
    },

    component(name, component) {
      context.components[name] = component;
      return app;
    },

    directive(name, directive) {
      context.directives[name] = directive;
      return app;
    },

    mixin(mixin) {
      context.mixins.push(mixin);
      return app;
    },
  };

  return app;
}

function createAppContext() {
  return {
    config: {
      performance: false,
      globalProperties: {} as Record<string, any>,
    } as AppConfig,
    provides: Object.create(null),
    components: {} as Record<string, Component>,
    directives: {} as Record<string, any>,
    mixins: [] as any[],
    renderer: null as any,
    _vnode: null as any,
    _container: null as any,
  };
}

function createContextConfig(context: any): AppConfig {
  return new Proxy({} as AppConfig, {
    get(_, key: string) {
      if (key === 'globalProperties') {
        return context.config.globalProperties;
      }
      return context.config[key];
    },
    set(_, key: string, value: any) {
      if (key === 'globalProperties') {
        context.config.globalProperties = value;
        return true;
      }
      context.config[key] = value;
      return true;
    },
  });
}

function getRendererOptions() {
  return {
    patchProp(el: any, key: string, prevValue: any, nextValue: any) {
      if (key === 'class') {
        el.className = nextValue || '';
      } else if (key === 'style') {
        for (const k in nextValue) el.style[k] = nextValue[k];
      } else if (key.startsWith('on')) {
        const event = key.slice(2).toLowerCase();
        el.removeEventListener(event, prevValue);
        if (nextValue) el.addEventListener(event, nextValue);
      } else if (nextValue == null) {
        el.removeAttribute(key);
      } else {
        if (isSafeAttribute(key, String(nextValue))) {
          el.setAttribute(key, String(nextValue));
        }
      }
    },
    insert(el: any, parent: any, anchor: any) {
      parent.insertBefore(el, anchor || null);
    },
    remove(el: any) {
      el.parentNode?.removeChild(el);
    },
    createElement(type: string) {
      return document.createElement(type);
    },
    createText(text: string) {
      return document.createTextNode(text);
    },
    createComment(text: string) {
      return document.createComment(text);
    },
    setText(node: any, text: string) {
      node.nodeValue = text;
    },
    setElementText(el: any, text: string) {
      el.textContent = text;
    },
    parentNode(node: any) {
      return node.parentNode;
    },
    nextSibling(node: any) {
      return node.nextSibling;
    },
  };
}
