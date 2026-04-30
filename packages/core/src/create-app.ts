// src/create-app.ts
// @lytjs/core - createApp 工厂函数

import {
  createRenderer,
  createVNode,
  createDOMRendererOptions,
} from "@lytjs/vdom";
import type { App, Plugin, Component, ComponentPublicInstance } from "./types";
import { createAppContext, createContextConfig } from "./app-context";
import {
  createComponentInstance,
  setupComponent,
  finishComponentSetup,
  createComponentPublicInstance,
  callUnmountedHook,
} from "@lytjs/component";

export function createApp(
  rootComponent: Component,
  rootProps: Record<string, unknown> | null = null,
): App {
  const context = createAppContext();
  const installedPlugins = new Set<Plugin | ((app: App, ...options: any[]) => void)>();

  const app: App = {
    config: createContextConfig(context),

    use(plugin: Plugin | ((app: App, ...options: any[]) => void), ...options: any[]) {
      if (installedPlugins.has(plugin)) return app;
      try {
        if (typeof plugin === "function") {
          (plugin as (app: App, ...options: any[]) => void)(app, ...options);
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

    mount(rootContainer: string | Element) {
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

      // Create root vnode through the component system's standard flow
      const rootVNode = createVNode(rootComponent as Component, rootProps);

      // Create component instance using the standardized component system
      const instance = createComponentInstance(rootVNode, null);

      // Copy app-level provides into the root instance
      if (context.provides) {
        const rootProvides = instance.provides;
        for (const [key, value] of context.provides) {
          if (!rootProvides.has(key)) {
            rootProvides.set(key, value);
          }
        }
      }

      // Copy app-level components and directives
      for (const [name, comp] of Object.entries(context.components)) {
        if (comp) instance.appContext.components[name] = comp;
      }
      for (const [name, dir] of Object.entries(context.directives)) {
        if (dir) instance.appContext.directives[name] = dir;
      }

      // Set up the component (runs setup, init props/slots, data, lifecycle)
      setupComponent(instance);

      // Save root instance reference for unmount lifecycle hooks
      context._instance = instance;

      // Render using the standard renderer
      const renderer = createRenderer(createDOMRendererOptions());
      context.renderer = renderer;
      context._container = container;
      context._vnode = rootVNode;

      // Mount the vnode
      renderer.mount(rootVNode, container);

      // Create and return the public instance
      const publicInstance = createComponentPublicInstance(instance);

      return publicInstance as ComponentPublicInstance;
    },

    unmount() {
      if (!context.renderer || !context._vnode) return;

      const instance = context._instance;
      if (instance) {
        // 调用 beforeUnmount 和 unmounted 生命周期钩子
        // (包括 Composition API 和 Options API)
        callUnmountedHook(instance);
      }

      context.renderer.unmount(context._vnode);
      context._vnode = null;
      context._container = null;

      // 清理 app context
      context.mixins.length = 0;
      context.components = {};
      context.directives = {};
      context.provides.clear();

      context._instance = null;
    },

    provide(key, value) {
      context.provides.set(key, value);
      return app;
    },

    inject(key) {
      return context.provides.get(key);
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
