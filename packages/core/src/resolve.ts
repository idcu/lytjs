// src/resolve.ts
// @lytjs/core - 组件/指令解析

import type { Component, Directive } from "./types";

/**
 * 解析全局注册的组件
 * TODO: 实现从当前渲染上下文的 appContext 中查找组件
 */
export function resolveComponent(name: string): Component | undefined {
  if (__DEV__) {
    console.warn(
      `[lytjs/core] resolveComponent("${name}") is not yet implemented. ` +
        `Dynamic component resolution is not supported in the current version.`,
    );
  }
  return undefined;
}

/**
 * 解析全局注册的指令
 * TODO: 实现从当前渲染上下文的 appContext 中查找指令
 */
export function resolveDirective(name: string): Directive | undefined {
  if (__DEV__) {
    console.warn(
      `[lytjs/core] resolveDirective("${name}") is not yet implemented. ` +
        `Dynamic directive resolution is not supported in the current version.`,
    );
  }
  return undefined;
}
