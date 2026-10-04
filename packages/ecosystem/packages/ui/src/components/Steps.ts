/**
 * @lytjs/ui - Steps 步骤条组件
 *
 * 步骤条组件，用于引导用户按照流程完成任务
 */

import type { StepsProps, StepsSlots, StepsSetupProps } from './types';
import { defineComponent, type PropType } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { mergeA11yProps } from '@lytjs/common-a11y';

/**
 * Steps 步骤条组件
 */
export const Steps = defineComponent({
  name: 'LytSteps',

  props: {
    active: { type: Number, default: 0 },
    processStatus: {
      type: String as () => 'process' | 'finish' | 'error' | 'success',
      default: 'process',
    },
    finishStatus: {
      type: String as () => 'wait' | 'process' | 'finish' | 'error' | 'success',
      default: 'success',
    },
    direction: { type: String as () => 'horizontal' | 'vertical', default: 'horizontal' },
    alignCenter: { type: Boolean, default: false },
    simple: { type: Boolean, default: false },
    class: { type: String, default: '' },
    style: {
      type: [String, Object] as unknown as PropType<string | Record<string, string>>,
      default: '',
    },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }) {
    const _props = props as StepsSetupProps;

    const getStepsClass = () => {
      const classes = ['lyt-steps'];
      if (_props.direction) classes.push(`lyt-steps--${_props.direction}`);
      if (_props.simple) classes.push('lyt-steps--simple');
      if (_props.alignCenter) classes.push('lyt-steps--align-center');
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const getStepsStyle = () => {
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

    return () => {
      const children: VNode[] = [];

      // ★ 2026-10-04 修两处：
      // ① 此前**只有数组形态**才渲染 ⇒ slot 返回单个 VNode 时内容被整个丢弃；
      // ② `active` / `processStatus` / `finishStatus` / `onChange` 声明了却从未使用
      //    ⇒ 步骤的「完成 / 进行中 / 等待」状态与切换回调都**不生效**。
      //    现按索引算出状态并注入每个 Step 子节点（语义沿用 Element-Plus 的 `el-steps`）。
      const activeIndex = (_props.active as number) ?? 0;
      const processStatus = (_props.processStatus as string) ?? 'process';
      const finishStatus = (_props.finishStatus as string) ?? 'success';
      const statusFor = (index: number): string => {
        if (index < activeIndex) return finishStatus;
        if (index === activeIndex) return processStatus;
        return 'wait';
      };

      if (slots.default) {
        const slotContent = slots.default();
        const raw = Array.isArray(slotContent)
          ? (slotContent as VNode[])
          : slotContent
            ? [slotContent as VNode]
            : [];
        raw.forEach((child, index) => {
          const stepProps = {
            ...(child.props ?? {}),
            status: (child.props?.status as string | undefined) ?? statusFor(index),
            index,
            onClick: (e: MouseEvent) => {
              (child.props?.onClick as ((e: MouseEvent) => void) | undefined)?.(e);
              if (index !== activeIndex) _props.onChange?.(index);
            },
          };
          children.push({ ...child, props: stepProps } as VNode);
        });
      }

      return createVNode(
        'div',
        mergeA11yProps(
          {
            id: _props.id,
            'aria-label': _props.ariaLabel,
            'aria-describedby': _props.ariaDescribedBy,
            role: 'navigation',
          },
          {
            class: getStepsClass(),
            style: getStepsStyle(),
          },
        ),
        children,
      );
    };
  },
});

export type { StepsProps, StepsSlots };
