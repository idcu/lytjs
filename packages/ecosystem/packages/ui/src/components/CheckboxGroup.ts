/**
 * @lytjs/ui - CheckboxGroup 组件
 *
 * 复选框组组件，用于多选场景
 */

import type { CheckboxGroupProps, CheckboxGroupSlots, CheckboxGroupSetupProps } from './types';
import { defineComponent, type PropType } from '@lytjs/component';
import { signal, watch } from '@lytjs/reactivity';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

/**
 * CheckboxGroup 组件
 */
export const CheckboxGroup = defineComponent({
  name: 'LytCheckboxGroup',

  props: {
    modelValue: { type: Array, default: undefined },
    disabled: { type: Boolean, default: false },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
    size: { type: String, default: 'default' },
    class: { type: String, default: '' },
    style: {
      type: [String, Object] as unknown as PropType<string | Record<string, string>>,
      default: '',
    },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    ariaRequired: { type: Boolean, default: false },
    id: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }) {
    const _props = props as CheckboxGroupSetupProps;

    const getCheckboxGroupClass = () => {
      const classes = ['lyt-checkbox-group'];
      // ★ 2026-10-04：`size` 声明了却从未使用 ⇒ 尺寸不可定制。
      //   写法与本包其它组件（InputNumber / Slider 等）一致。
      if (_props.size && _props.size !== 'default') {
        classes.push(`lyt-checkbox-group--${_props.size}`);
      }
      if (_props.class) classes.push(_props.class as string);
      return classes.join(' ');
    };

    const getCheckboxGroupStyle = () => {
      const style: Record<string, string> = {};
      if (_props.style) {
        if (isString(_props.style)) {
          return _props.style;
        }
        if (isObject(_props.style)) {
          Object.assign(style, _props.style);
        }
      }
      return style;
    };

    // ★ 2026-10-04 实现 group 的 v-model（此前 `modelValue` / `onChange` 声明了却从未使用
    //   ⇒ 本文件里 `emit(` 与 `onChange?.(` 出现 0 次，契约完全失效）。
    type GroupValue = (string | number | boolean)[];
    const groupValue = signal<GroupValue>((_props.modelValue ?? []) as GroupValue);
    watch(
      () => _props.modelValue,
      (v) => groupValue.set((v ?? []) as GroupValue),
    );
    const handleGroupChange = (v: unknown): void => {
      groupValue.set(v as GroupValue);
      _props.onChange?.(v as GroupValue);
    };

    return () => {
      const children: VNode[] = [];

      if (slots.default) {
        const slotContent = slots.default();
        const raw = Array.isArray(slotContent)
          ? (slotContent as VNode[])
          : slotContent
            ? [slotContent as VNode]
            : [];
        // ★ 把 group 的当前值与变更处理注入每个子节点 ⇒ v-model 真正生效
        //   （2026-10-04：此前 `modelValue` / `onChange` 声明了却从未使用）。
        //   依赖两处框架级修复：① setup 传稳定 props 代理（值不再陈旧）
        //   ② props 读取建立响应式依赖（computed 会重算）。
        children.push(
          ...raw.map((child) => {
            const childProps = (child.props ?? {}) as Record<string, unknown>;
            return {
              ...child,
              props: {
                ...childProps,
                modelValue: groupValue(),
                onChange: (v: unknown) => {
                  (childProps.onChange as ((x: unknown) => void) | undefined)?.(v);
                  handleGroupChange(v);
                },
              },
            } as VNode;
          }),
        );
      }

      return createVNode(
        'div',
        mergeA11yProps(
          {
            id: _props.id as string,
            'aria-label': _props.ariaLabel as string,
            'aria-describedby': _props.ariaDescribedBy as string,
            'aria-required': _props.ariaRequired ? 'true' : undefined,
            role: 'group',
          },
          {
            class: getCheckboxGroupClass(),
            style: getCheckboxGroupStyle(),
            'aria-disabled': _props.disabled ? 'true' : undefined,
          },
        ),
        children,
      );
    };
  },
});

export type { CheckboxGroupProps, CheckboxGroupSlots };
