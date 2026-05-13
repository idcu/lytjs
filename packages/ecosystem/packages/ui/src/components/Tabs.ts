/**
 * @lytjs/ui - Tabs 组件
 *
 * 标签页组件，支持卡片式和边框卡片式
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';

/**
 * TabPane 组件
 */
export const TabPane = defineComponent({
  name: 'LytTabPane',

  props: {
    label: { type: String, required: true },
    name: { type: String, required: true },
    disabled: { type: Boolean, default: false },
  },

  setup(_props: any, { slots }: any) {
    return () => {
      return createVNode('div', { class: 'lyt-tab-pane' }, slots.default?.());
    };
  },
});

/**
 * Tabs 组件
 */
export const Tabs = defineComponent({
  name: 'LytTabs',

  props: {
    modelValue: { type: String, default: '' },
    type: { type: String, default: '' },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    // 获取所有 TabPane
    const getPanes = (): any[] => {
      const defaultSlot = slots.default?.();
      if (!defaultSlot) return [];

      return defaultSlot
        .filter((vnode: any) => vnode && vnode.type?.name === 'LytTabPane')
        .map((vnode: any) => ({
          props: vnode.props,
          children: vnode.children,
        }));
    };

    // 切换标签
    const handleTabClick = (pane: any) => {
      if (pane.disabled) return;
      emit('update:modelValue', pane.name);
      props.onChange?.(pane.name);
    };

    // 生成类名
    const getTabsClass = () => {
      const classes = ['lyt-tabs'];
      if (props.type) classes.push(`lyt-tabs--${props.type}`);
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      const panes = getPanes();
      const activePane = panes.find((p: any) => p.props.name === props.modelValue) || panes[0];

      // 标签头
      const headerChildren = panes.map((pane: any) =>
        createVNode(
          'div',
          {
            class: `lyt-tabs__item ${pane.props.name === props.modelValue ? 'lyt-tabs__item--active' : ''} ${
              pane.props.disabled ? 'lyt-tabs__item--disabled' : ''
            }`,
            onClick: () => handleTabClick(pane.props),
          },
          pane.props.label
        )
      );

      return createVNode('div', { class: getTabsClass() }, [
        createVNode('div', { class: 'lyt-tabs__header' }, headerChildren),
        createVNode('div', { class: 'lyt-tabs__content' }, activePane ? activePane.children?.default?.() : []),
      ]);
    };
  },
});

export default { Tabs, TabPane };
