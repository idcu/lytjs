// src/resolve.ts
// @lytjs/core - 组件/指令解析

import type { Component, Directive } from './types';

/**
 * 解析全局注册的组件
 */
export function resolveComponent(_name: string, _maybeSelfReference?: boolean): Component | undefined {
  // 在实际运行时，需要从当前渲染上下文的 appContext 中查找
  return undefined;
}

/**
 * 解析全局注册的指令
 */
export function resolveDirective(_name: string): Directive | undefined {
  // 在实际运行时，需要从当前渲染上下文的 appContext 中查找
  return undefined;
}
