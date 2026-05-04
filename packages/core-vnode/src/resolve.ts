// src/resolve.ts
// @lytjs/core-vnode - 组件/指令解析

import type { Component, Directive } from './types';
import { getCurrentInstance } from '@lytjs/component';
import { warn } from '@lytjs/common-error';

/**
 * Common native HTML elements that should not trigger resolution warnings.
 */
const HTML_ELEMENTS = new Set([
  // 结构元素
  'div',
  'span',
  'p',
  'a',
  'img',
  'input',
  'button',
  'form',
  'table',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'footer',
  'nav',
  'section',
  'article',
  'main',
  'aside',
  // 文本元素
  'br',
  'hr',
  'pre',
  'code',
  'blockquote',
  'strong',
  'em',
  'i',
  'b',
  'u',
  's',
  'small',
  'sub',
  'sup',
  'label',
  'abbr',
  'cite',
  'dfn',
  'kbd',
  'mark',
  'q',
  'samp',
  'var',
  'wbr',
  // 表单元素
  'select',
  'option',
  'textarea',
  'optgroup',
  'fieldset',
  'legend',
  'datalist',
  'output',
  'progress',
  'meter',
  // 媒体元素
  'picture',
  'video',
  'audio',
  'source',
  'track',
  'canvas',
  'map',
  'area',
  'svg',
  // 交互元素
  'details',
  'summary',
  'dialog',
  // 模板/插槽
  'template',
  'slot',
  // 脚本/样式/元数据
  'script',
  'style',
  'link',
  'meta',
  'title',
  'head',
  'body',
  'html',
  'noscript',
  // 表格子元素
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',
  // 列表子元素
  'dl',
  'dt',
  'dd',
  // 其他
  'figure',
  'figcaption',
  'iframe',
  'object',
  'embed',
  'param',
  'time',
  'data',
  'ruby',
  'rt',
  'rp',
  'bdi',
  'bdo',
  'ins',
  'del',
]);

/**
 * 解析组件：从当前组件实例的 components 选项和全局注册中查找
 */
export function resolveComponent(name: string): Component | undefined {
  const instance = getCurrentInstance();
  if (!instance) {
    if (__DEV__) {
      warn(
        `resolveComponent("${name}") was called outside of a component setup function. ` +
          `Global components will not be resolved.`,
      );
    }
    return undefined;
  }

  // 1. 先从当前组件的 components 选项中查找
  const components = (instance.type as Record<string, unknown>)?.components;
  if (components && (components as Record<string, Component>)[name]) {
    return (components as Record<string, Component>)[name];
  }

  // 2. 再从全局注册中查找（appContext.components）
  const globalComponents = instance.appContext?.components;
  if (globalComponents && globalComponents[name]) {
    return globalComponents[name] as Component;
  }

  if (__DEV__) {
    if (!HTML_ELEMENTS.has(name)) {
      warn(
        `Failed to resolve component "${name}". ` +
          `If this is a native HTML element, register it as a component.`,
      );
    }
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
      warn(
        `resolveDirective("${name}") was called outside of a component setup function. ` +
          `Global directives will not be resolved.`,
      );
    }
    return undefined;
  }

  // 1. 先从当前组件的 directives 选项中查找
  const directives = (instance.type as Record<string, unknown>)?.directives;
  if (directives && (directives as Record<string, Directive>)[name]) {
    return (directives as Record<string, Directive>)[name];
  }

  // 2. 再从全局注册中查找（appContext.directives）
  const globalDirectives = instance.appContext?.directives;
  if (globalDirectives && globalDirectives[name]) {
    return globalDirectives[name] as Directive;
  }

  if (__DEV__) {
    warn(`Failed to resolve directive "${name}".`);
  }
  return undefined;
}
