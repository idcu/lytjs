/**
 * @lytjs/ui - Breadcrumb 面包屑组件
 *
 * 面包屑导航组件，显示当前页面在网站层级中的位置
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';

export const BreadcrumbItem = defineComponent({
  name: 'LytBreadcrumbItem',

  props: {
    to: { type: String, default: '' },
    replace: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    label: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>) {
    const handleClick = () => {
      if (props.disabled) return;
      if (props.to) {
        if (props.replace) {
          window.location.replace(props.to as string);
        } else {
          window.location.href = props.to as string;
        }
      }
    };

    return () => {
      const children: VNode[] = [];
      if (props.label) {
        children.push(createVNode('span', {}, props.label as string));
      }

      return createVNode(
        'span',
        {
          class: ['lyt-breadcrumb__item', props.disabled ? 'lyt-breadcrumb__item--disabled' : '']
            .filter(Boolean)
            .join(' '),
          onClick: handleClick,
        },
        children,
      );
    };
  },
});

export const Breadcrumb = defineComponent({
  name: 'LytBreadcrumb',

  props: {
    separator: { type: String, default: '/' },
    separatorClass: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }) {
    return () => {
      // ⚠️ 2026-10-10 修复（P0-4）：此前这里是
      //     `const items: VNode[] = [];`
      // 一个**硬编码的空数组**，且全函数**无任何填充点** ⇒ 下面的 `items.forEach`
      // 循环体永不执行 ⇒ 组件恒渲染空的 `<div class="lyt-breadcrumb"></div>`。
      // 子组件 `BreadcrumbItem` 本身实现完好，但**从未被消费**。
      // 特征：不报错、不警告、测试全绿，功能完全不生效。
      //
      // 现改为消费默认插槽的子节点（与同目录 Steps.ts 同模式）。
      // 必须**同时处理「数组」与「单个 VNode」两种 slot 返回形态** ——
      // 只处理数组会在单子节点时把内容整个丢掉，`check-ui-slot-single-node` 门禁会抓。
      const content: VNode[] = [];

      const items: VNode[] = [];
      if (slots.default) {
        const slotContent = slots.default();
        if (Array.isArray(slotContent)) {
          items.push(...(slotContent as VNode[]));
        } else if (slotContent) {
          items.push(slotContent as VNode);
        }
      }

      items.forEach((item, index) => {
        if (index > 0) {
          content.push(
            createVNode(
              'span',
              {
                class: ['lyt-breadcrumb__separator', props.separatorClass as string]
                  .filter(Boolean)
                  .join(' '),
              },
              [createVNode('span', {}, props.separator as string)],
            ),
          );
        }
        content.push(item as VNode);
      });

      return createVNode('div', { class: 'lyt-breadcrumb' }, content);
    };
  },
});
