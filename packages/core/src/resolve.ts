// src/resolve.ts
// @lytjs/core - 组件/指令解析

import type { Component, Directive } from "./types";
import { getCurrentInstance } from "@lytjs/component";

/**
 * 解析组件：从当前组件实例的 components 选项和全局注册中查找
 */
export function resolveComponent(name: string): Component | undefined {
  const instance = getCurrentInstance();
  if (!instance) {
    if (__DEV__) {
      console.warn(
        `[lytjs/core] resolveComponent("${name}") was called outside of a component setup function. ` +
          `Global components will not be resolved.`,
      );
    }
    return undefined;
  }

  // 1. 先从当前组件的 components 选项中查找
  const components = (instance.type as any)?.components;
  if (components && components[name]) {
    return components[name] as Component;
  }

  // 2. 再从全局注册中查找（appContext.components）
  const globalComponents = instance.appContext?.components;
  if (globalComponents && globalComponents[name]) {
    return globalComponents[name] as Component;
  }

  if (__DEV__) {
    console.warn(
      `[lytjs/core] Failed to resolve component "${name}". ` +
        `If this is a native HTML element, register it as a component.`,
    );
  }
  return undefined;
}

/**
 * 解析指令：从当前组件实例的 directives 选项和全局注册中查找
 */
export function resolveDirective(name: string): Directive | undefined {
  const instance = getCurrentInstance();
  if (!instance) {
    if (__DEV__) {
      console.warn(
        `[lytjs/core] resolveDirective("${name}") was called outside of a component setup function. ` +
          `Global directives will not be resolved.`,
      );
    }
    return undefined;
  }

  // 1. 先从当前组件的 directives 选项中查找
  const directives = (instance.type as any)?.directives;
  if (directives && directives[name]) {
    return directives[name] as Directive;
  }

  // 2. 再从全局注册中查找（appContext.directives）
  const globalDirectives = instance.appContext?.directives;
  if (globalDirectives && globalDirectives[name]) {
    return globalDirectives[name] as Directive;
  }

  if (__DEV__) {
    console.warn(
      `[lytjs/core] Failed to resolve directive "${name}".`,
    );
  }
  return undefined;
}
