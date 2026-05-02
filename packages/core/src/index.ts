// src/index.ts
// @lytjs/core - 核心入口

export { createApp } from './create-app';
export { h, h as createElement } from './h';
export { defineComponent, defineAsyncComponent } from './define-component';
export { nextTick } from './next-tick';
export { resolveComponent, resolveDirective } from './resolve';
export { withDirectives, withMemo } from './directives';
export { useSlots, useAttrs, useModel } from './composition';
export {
  defineCustomElement,
  useShadowRoot,
  useHost,
  useWebComponentSlots,
  injectChildStyles,
} from './web-component';
export type { DefineCustomElementOptions } from './web-component';
export {
  onMounted,
  onUnmounted,
  onUpdated,
  onBeforeMount,
  onBeforeUnmount,
  onBeforeUpdate,
  onErrorCaptured,
  onRenderTracked,
  onRenderTriggered,
} from './lifecycle';

// Re-export from sub-packages
export { ref, reactive, computed, watch, watchEffect, effect } from '@lytjs/reactivity';
export { createVNode, Fragment, Text, Comment, cloneVNode, mergeProps } from '@lytjs/vdom';
export { compile } from '@lytjs/compiler';

export type {
  App,
  AppConfig,
  AppOptions,
  Plugin,
  Component,
  ComponentOptions,
  VNode,
  VNodeChildren,
  Renderer,
  Directive,
  DirectiveBinding,
  DirectiveArguments,
  AsyncComponentLoader,
  AsyncComponentOptions,
  ErrorCapturedHook,
  DebuggerHook,
  DebuggerEvent,
  ComponentPublicInstance,
} from './types';
