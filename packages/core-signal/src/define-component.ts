// src/define-component.ts
// @lytjs/core-signal - 组件定义

import type { ComponentOptions } from './types';
import { defineComponent as _defineComponent } from '@lytjs/component';

/**
 * 定义组件（re-export from @lytjs/component）
 *
 * Signal 模式下，组件应包含 template 属性。
 * defineComponent 主要用于类型标注和 IDE 提示。
 */
export const defineComponent: (options: ComponentOptions) => ComponentOptions = _defineComponent;
