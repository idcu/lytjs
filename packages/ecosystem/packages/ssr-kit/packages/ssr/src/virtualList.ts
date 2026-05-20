/**
 * @lytjs/ssr - 虚拟列表组件
 *
 * 高性能大数据列表渲染
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal, computedSignal as computed } from '@lytjs/reactivity';

export const VirtualList = defineComponent({
  name: 'LytVirtualList',

  props: {
    data: { type: Array, default: () => [] },
    itemHeight: { type: Number, default: 50 },
    height: { type: Number, default: 400 },
    buffer: { type: Number, default: 5 },
    class: { type: String, default: '' },
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setup(props: any, { slots }: any) {
    const scrollTop = signal(0);

    const visibleCount = computed(() => {
      return Math.ceil(props.height / props.itemHeight) + props.buffer * 2;
    });

    const startIndex = computed(() => {
      const start = Math.floor(scrollTop() / props.itemHeight);
      return Math.max(0, start - props.buffer);
    });

    const endIndex = computed(() => {
      return Math.min(props.data.length, startIndex() + visibleCount());
    });

    const visibleData = computed(() => {
      return props.data.slice(startIndex(), endIndex());
    });

    const totalHeight = computed(() => {
      return props.data.length * props.itemHeight;
    });

    const offset = computed(() => {
      return startIndex() * props.itemHeight;
    });

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      scrollTop.set(target.scrollTop);
    };

    const getListClass = () => {
      const classes = ['lyt-virtual-list'];
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      const items = visibleData().map((item: unknown, index: number) => {
        const actualIndex = startIndex() + index;
        const slotContent = slots?.default?.({ item, index: actualIndex });
        return createVNode(
          'div',
          {
            class: 'lyt-virtual-list__item',
            style: `height: ${props.itemHeight}px;`,
            'data-index': actualIndex,
          },
          slotContent
        );
      });

      return createVNode(
        'div',
        {
          class: getListClass(),
          style: `height: ${props.height}px; overflow-y: auto;`,
          onScroll: handleScroll,
        },
        [
          createVNode(
            'div',
            {
              class: 'lyt-virtual-list__content',
              style: `height: ${totalHeight()}px; position: relative;`,
            },
            [
              createVNode(
                'div',
                {
                  class: 'lyt-virtual-list__visible',
                  style: `position: absolute; top: ${offset()}px; left: 0; right: 0;`,
                },
                items
              ),
            ]
          ),
        ]
      );
    };
  },
});

export default VirtualList;
