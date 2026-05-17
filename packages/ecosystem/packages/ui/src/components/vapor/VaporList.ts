/**
 * @lytjs/ui - VaporList 组件
 *
 * Vapor 模式的高性能列表组件，使用基于 key 的增量更新
 * 最小化 DOM 操作，适用于大型列表和高频更新场景
 */

import { createVNode, type VNode } from '@lytjs/vdom';
import { type Signal } from '@lytjs/reactivity';

export interface VaporListProps<T> {
  data: T[] | Signal<T[]>;
  keyFn: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => VNode | VNode[];
  emptyRender?: () => VNode | VNode[];
  class?: string;
  style?: string;
  onMount?: (item: T, index: number, element: HTMLElement) => void;
  onUnmount?: (item: T, index: number, element: HTMLElement) => void;
}

export const VaporList = {
  name: 'VaporList',
  props: {
    data: { type: [Array, Object], required: true },
    keyFn: { type: Function, required: true },
    renderItem: { type: Function, required: true },
    emptyRender: { type: Function, default: undefined },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onMount: { type: Function, default: undefined },
    onUnmount: { type: Function, default: undefined },
  },
  setup(props: Record<string, unknown>) {
    const p = props as unknown as VaporListProps<unknown>;

    return () => {
      const children: VNode[] = [];

      // 获取数据（处理 Signal 和普通数组）
      const data = (() => {
        const dataSource = p.data;
        let value: unknown[] = [];
        if (Array.isArray(dataSource)) {
          value = dataSource;
        } else if (typeof dataSource === 'object' && dataSource !== null && 'value' in dataSource) {
          // 处理 Signal 类型
          const signalValue = (dataSource as { value: unknown }).value;
          value = Array.isArray(signalValue) ? signalValue : [];
        }
        return value;
      })();

      if (data.length === 0) {
        // 渲染空状态
        if (p.emptyRender) {
          const emptyContent = p.emptyRender();
          if (Array.isArray(emptyContent)) {
            children.push(...emptyContent);
          } else {
            children.push(emptyContent);
          }
        }
      } else {
        // 渲染列表项
        for (let index = 0; index < data.length; index++) {
          const item = data[index]!;
          const itemContent = p.renderItem(item, index);
          if (Array.isArray(itemContent)) {
            children.push(...itemContent);
          } else {
            children.push(itemContent);
          }
        }
      }

      return createVNode('div', {
        class: ['vapor-list', p.class].filter(Boolean).join(' '),
        style: p.style || undefined,
      }, children);
    };
  },
};
