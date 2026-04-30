// src/create-app.ts
// @lytjs/core - createApp 工厂函数

import {
  createRenderer,
  createVNode,
  createDOMRendererOptions,
} from "@lytjs/vdom";
import type { App, Plugin, Component, ComponentPublicInstance } from "./types";
import { createAppContext, createContextConfig } from "./app-context";

export function createApp(
  rootComponent: Component,
  rootProps: Record<string, unknown> | null = null,
): App {
  const context = createAppContext();
  const installedPlugins = new Set<Plugin | Function>();

  const app: App = {
    config: createContextConfig(context),

    use(plugin: Plugin | Function, ...options: any[]) {
      if (installedPlugins.has(plugin)) return app;
      try {
        if (typeof plugin === "function") {
          (plugin as Function)(app, ...options);
        } else {
          plugin.install(app, ...options);
        }
        installedPlugins.add(plugin);
      } catch (err) {
        console.error(
          `[LytJS] Plugin failed to install: ${typeof plugin === "function" ? plugin.name || "anonymous function" : (plugin as Plugin).install?.name || "plugin"}`,
          err,
        );
        throw err;
      }
      return app;
    },

    mount(rootContainer: any) {
      const container =
        typeof rootContainer === "string"
          ? document.querySelector(rootContainer)
          : rootContainer;

      if (!container) {
        throw new Error(
          `[LytJS] Failed to mount app: cannot find element matching selector "${rootContainer}". ` +
            `Make sure the target element exists in the DOM before calling app.mount().`,
        );
      }

      const comp = rootComponent as any;
      let vnode: any;

      if (typeof comp === "object" && comp.render) {
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
      } else if (typeof comp === "function") {
        vnode = comp(rootProps);
      } else {
        vnode = createVNode(comp, rootProps);
      }

      const renderer = createRenderer(createDOMRendererOptions());
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
