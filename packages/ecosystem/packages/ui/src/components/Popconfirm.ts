/**
 * @lytjs/ui - Popconfirm 气泡确认框组件
 *
 * 气泡确认框组件，用于操作确认
 */

import type { PopconfirmProps, PopconfirmSlots, PopconfirmSetupProps } from './types';
import { defineComponent, type PropType } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { signal } from '@lytjs/reactivity';
import { getDialogA11yProps, getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';

export const Popconfirm = defineComponent({
  name: 'LytPopconfirm',

  props: {
    title: { type: String, default: '' },
    confirmButtonText: { type: String, default: '确定' },
    cancelButtonText: { type: String, default: '取消' },
    confirmButtonType: { type: String, default: 'primary' },
    cancelButtonType: { type: String, default: '' },
    icon: { type: String, default: '' },
    iconColor: { type: String, default: '' },
    hideIcon: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    width: { type: Number, default: 0 },
    class: { type: String, default: '' },
    style: {
      type: [String, Object] as unknown as PropType<string | Record<string, string>>,
      default: '',
    },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    onConfirm: { type: Function, default: undefined },
    onCancel: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as PopconfirmSetupProps;
    const visible = signal(false);

    const getPopconfirmClass = () => {
      const classes = ['lyt-popconfirm'];
      if (_props.class) classes.push(_props.class as string);
      return classes.join(' ');
    };

    const getPopconfirmStyle = () => {
      const style: Record<string, string> = {};
      if (_props.width) {
        style.width = `${_props.width}px`;
      }
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

    // ★ 2026-10-04 修复**组件根本无法开合**：
    //   `visible` signal 此前**从未被设为 true、也从未被读取** ——
    //   渲染时**无条件** push `lyt-popconfirm__popup` ⇒ 气泡**永久可见**。
    //   现补：reference 上的 hover 触发 + 按 `visible()` 决定是否渲染气泡。
    //   `disabled` 为真时不响应触发（此前 `disabled` 声明了却从未使用）。
    const canOpen = (): boolean => !_props.disabled;

    const show = (): void => {
      if (canOpen()) visible.set(true);
    };
    const hide = (): void => {
      if (visible()) visible.set(false);
    };

    const handleConfirm = () => {
      visible.set(false);
      emit('confirm');
      _props.onConfirm?.();
    };

    const handleCancel = () => {
      visible.set(false);
      emit('cancel');
      _props.onCancel?.();
    };

    return () => {
      const children: VNode[] = [];

      if (slots.reference) {
        const refContent = slots.reference();
        // ★ 2026-10-04 修正：此前**只有数组形态**才渲染 reference ——
        //   slot 返回**单个 VNode**（最常见写法）时被**整个丢弃**，
        //   表现为「触发元素不见了、气泡也开不了」。
        //   现在两种形态都处理（与本包其它组件如 CheckboxGroup 的写法一致）。
        const refNodes: VNode[] = Array.isArray(refContent)
          ? (refContent as VNode[])
          : refContent
            ? [refContent as VNode]
            : [];
        if (refNodes.length > 0) {
          children.push(
            createVNode(
              'div',
              {
                class: 'lyt-popconfirm__reference',
                onMouseenter: show,
                onMouseleave: hide,
              },
              refNodes,
            ),
          );
        }
      }

      const popupChildren: VNode[] = [];

      const contentChildren: VNode[] = [];

      if (!_props.hideIcon) {
        const iconChildren: VNode[] = [];
        if (slots.icon) {
          const iconContent = slots.icon();
          if (Array.isArray(iconContent)) {
            iconChildren.push(...(iconContent as VNode[]));
          }
        }
        contentChildren.push(
          createVNode(
            'span',
            {
              class: 'lyt-popconfirm__icon',
              // ★ 2026-10-04：`iconColor` 声明了却从未使用 ⇒ 图标颜色不可定制。
              style: _props.iconColor ? { color: _props.iconColor as string } : undefined,
            },
            iconChildren,
          ),
        );
      }

      const titleId = _props.id ? `${_props.id}-title` : undefined;
      if (slots.default || _props.title) {
        const titleChildren: VNode[] = [];
        if (slots.default) {
          const titleContent = slots.default();
          if (Array.isArray(titleContent)) {
            titleChildren.push(...(titleContent as VNode[]));
          }
        } else {
          titleChildren.push(createVNode('span', {}, _props.title as string));
        }
        contentChildren.push(
          createVNode(
            'span',
            {
              class: 'lyt-popconfirm__title',
              id: titleId,
            },
            titleChildren,
          ),
        );
      }

      popupChildren.push(createVNode('div', { class: 'lyt-popconfirm__content' }, contentChildren));

      const buttonChildren: VNode[] = [];
      const cancelBtnProps = getButtonA11yProps({ ariaLabel: _props.cancelButtonText as string });
      buttonChildren.push(
        createVNode(
          'button',
          mergeA11yProps(cancelBtnProps, {
            // ★ 2026-10-04：`cancelButtonType` 声明了却从未使用 ⇒ 取消按钮类型不可定制。
            class:
              'lyt-button lyt-button--small' +
              (_props.cancelButtonType ? ` lyt-button--${_props.cancelButtonType}` : ''),
            onClick: handleCancel,
          }),
          [createVNode('span', {}, _props.cancelButtonText as string)],
        ),
      );

      const confirmBtnProps = getButtonA11yProps({ ariaLabel: _props.confirmButtonText as string });
      buttonChildren.push(
        createVNode(
          'button',
          mergeA11yProps(confirmBtnProps, {
            class: `lyt-button lyt-button--small lyt-button--${_props.confirmButtonType}`,
            onClick: handleConfirm,
          }),
          [createVNode('span', {}, _props.confirmButtonText as string)],
        ),
      );
      popupChildren.push(createVNode('div', { class: 'lyt-popconfirm__buttons' }, buttonChildren));

      const a11yProps = getDialogA11yProps({
        id: _props.id as string,
        ariaLabel: (_props.ariaLabel as string) || (_props.title as string),
        ariaDescribedBy: (_props.ariaDescribedBy as string) || titleId,
        labelledBy: titleId,
        modal: true,
      });

      // ★ 关键修复点：此前**无条件**渲染气泡（等于永久可见）；现在按状态渲染。
      if (visible()) {
        children.push(
          createVNode(
            'div',
            mergeA11yProps(a11yProps, { class: 'lyt-popconfirm__popup' }),
            popupChildren,
          ),
        );
      }

      return createVNode(
        'div',
        {
          class: getPopconfirmClass(),
          style: getPopconfirmStyle(),
        },
        children,
      );
    };
  },
});

export type { PopconfirmProps, PopconfirmSlots };
