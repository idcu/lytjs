/**
 * @lytjs/ssr - 虚拟列表组件
 *
 * 高性能大数据列表渲染
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal, computedSignal as computed } from '@lytjs/reactivity';

/**
 * 虚拟列表组件
 */
export const VirtualList = defineComponent({
  name: 'LytVirtualList',

  props: {
    data: { type: Array, default: () => [] },
    itemHeight: { type: Number, default: 50 },
    height: { type: Number, default: 400 },
    buffer: { type: Number, default: 5 },
    class: { type: String, default: '' },
  },

  setup(props: any, { slots }: any) {
    // 滚动位置
    const scrollTop = signal(0);

    // 可视区域能显示的项数
    const visibleCount = computed(() => {
      return Math.ceil(props.height / props.itemHeight) + props.buffer * 2;
    });

    // 起始索引
    const startIndex = computed(() => {
      const start = Math.floor(scrollTop() / props.itemHeight);
      return Math.max(0, start - props.buffer);
    });

    // 结束索引
    const endIndex = computed(() => {
      return Math.min(props.data.length, startIndex() + visibleCount());
    });

    // 可视数据
    const visibleData = computed(() => {
      return props.data.slice(startIndex(), endIndex());
    });

    // 总高度
    const totalHeight = computed(() => {
      return props.data.length * props.itemHeight;
    });

    // 偏移量
    const offset = computed(() => {
      return startIndex() * props.itemHeight;
    });

    // 处理滚动
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      scrollTop.set(target.scrollTop);
    };

    // 生成类名
    const getListClass = () => {
      const classes = ['lyt-virtual-list'];
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      const items = visibleData().map((item: any, index: number) => {
        const actualIndex = startIndex() + index;
        return createVNode(
          'div',
          {
            class: 'lyt-virtual-list__item',
            style: `height: ${props.itemHeight}px;`,
            'data-index': actualIndex,
          },
          slots.default?.({ item, index: actualIndex })
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
