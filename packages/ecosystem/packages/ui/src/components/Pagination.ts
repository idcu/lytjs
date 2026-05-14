/**
 * @lytjs/ui - Pagination 组件
 *
 * 分页组件，支持多种分页模式、总数显示、每页条数选择
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import { getButtonA11yProps, getFormControlA11yProps, getGroupA11yProps, mergeA11yProps } from '@lytjs/common-a11y';

export interface PaginationSetupProps {
  current: number;
  pageSize: number;
  total: number;
  pageSizes: number[];
  layout: string;
  background: boolean;
  simple: boolean;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  onChange: ((current: number, pageSize: number) => void) | undefined;
  onSizeChange: ((size: number) => void) | undefined;
}

export interface PaginationSlots {
  default?: () => VNode[];
}

export const Pagination = defineComponent({
  name: 'LytPagination',

  props: {
    current: { type: Number, default: 1 },
    pageSize: { type: Number, default: 10 },
    total: { type: Number, default: 0 },
    pageSizes: { type: Array, default: (): number[] => [10, 20, 50, 100] },
    layout: { type: String, default: 'prev, pager, next, jumper, total' },
    background: { type: Boolean, default: false },
    simple: { type: Boolean, default: false },
    class: { type: String, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onSizeChange: { type: Function, default: undefined },
  },

  setup(props: PaginationSetupProps, { slots }: { slots: PaginationSlots }) {
    const currentPage = signal(props.current);
    const currentPageSize = signal(props.pageSize);

    const totalPages = (): number => {
      return Math.ceil(props.total / currentPageSize());
    };

    const getPageRange = (): number[] => {
      const pages: number[] = [];
      const total = totalPages();
      const current = currentPage();
      let start = Math.max(1, current - 2);
      let end = Math.min(total, current + 2);

      if (end - start < 4) {
        if (start === 1) {
          end = Math.min(total, start + 4);
        } else {
          start = Math.max(1, end - 4);
        }
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      return pages;
    };

    const handlePageChange = (page: number) => {
      if (page < 1 || page > totalPages() || page === currentPage()) return;
      currentPage.set(page);
      props.onChange?.(page, currentPageSize());
    };

    const handlePrev = () => {
      handlePageChange(currentPage() - 1);
    };

    const handleNext = () => {
      handlePageChange(currentPage() + 1);
    };

    const handlePageSizeChange = (e: Event) => {
      const size = Number((e.target as HTMLSelectElement).value);
      currentPageSize.set(size);
      currentPage.set(1);
      props.onSizeChange?.(size);
      props.onChange?.(1, size);
    };

    const handleJumperChange = (e: Event) => {
      const value = Number((e.target as HTMLInputElement).value);
      if (value >= 1 && value <= totalPages()) {
        handlePageChange(value);
      }
    };

    return () => {
      const paginationClass = [
        'lyt-pagination',
        props.background ? 'lyt-pagination--background' : '',
        props.simple ? 'lyt-pagination--simple' : '',
        props.class,
      ].filter(Boolean).join(' ');
      
      const groupProps = getGroupA11yProps({ role: 'navigation', ariaLabel: props.ariaLabel || '分页' });
      const a11yProps = {
        id: props.id,
        'aria-describedby': props.ariaDescribedBy,
      };

      const children: VNode[] = [];

      if (props.layout.includes('total')) {
        children.push(createVNode('span', { class: 'lyt-pagination__total' }, [
          `共 ${props.total} 条`,
        ]));
      }

      if (props.layout.includes('prev')) {
        const prevProps = getButtonA11yProps({ ariaLabel: '上一页', disabled: currentPage() === 1 });
        children.push(createVNode('button', mergeA11yProps(prevProps, {
          class: ['lyt-pagination__btn', 'lyt-pagination__prev'],
          disabled: currentPage() === 1,
          onClick: handlePrev,
        }), ['上一页']));
      }

      if (props.layout.includes('pager') && !props.simple) {
        const pageRange = getPageRange();
        const pagerChildren: VNode[] = [];

        if (pageRange[0] > 1) {
          const firstProps = getButtonA11yProps({ ariaLabel: '第1页' });
          pagerChildren.push(createVNode('button', mergeA11yProps(firstProps, {
            class: 'lyt-pagination__btn',
            onClick: () => handlePageChange(1),
          }), ['1']));
          
          if (pageRange[0] > 2) {
            pagerChildren.push(createVNode('span', { class: 'lyt-pagination__ellipsis' }, ['...']));
          }
        }

        for (const page of pageRange) {
          const pageBtnProps = getButtonA11yProps({ ariaLabel: `第${page}页`, disabled: page === currentPage() });
          pagerChildren.push(createVNode('button', mergeA11yProps(pageBtnProps, {
            class: [
              'lyt-pagination__btn',
              page === currentPage() ? 'lyt-pagination__btn--active' : '',
            ].filter(Boolean).join(' '),
            'aria-current': page === currentPage() ? 'page' : undefined,
            onClick: () => handlePageChange(page),
          }), [String(page)]));
        }

        if (pageRange[pageRange.length - 1] < totalPages()) {
          if (pageRange[pageRange.length - 1] < totalPages() - 1) {
            pagerChildren.push(createVNode('span', { class: 'lyt-pagination__ellipsis' }, ['...']));
          }
          
          const lastProps = getButtonA11yProps({ ariaLabel: `第${totalPages()}页` });
          pagerChildren.push(createVNode('button', mergeA11yProps(lastProps, {
            class: 'lyt-pagination__btn',
            onClick: () => handlePageChange(totalPages()),
          }), [String(totalPages())]));
        }

        children.push(createVNode('div', { class: 'lyt-pagination__pager' }, [pagerChildren]));
      }

      if (props.layout.includes('next')) {
        const nextProps = getButtonA11yProps({ ariaLabel: '下一页', disabled: currentPage() === totalPages() });
        children.push(createVNode('button', mergeA11yProps(nextProps, {
          class: ['lyt-pagination__btn', 'lyt-pagination__next'],
          disabled: currentPage() === totalPages(),
          onClick: handleNext,
        }), ['下一页']));
      }

      if (props.layout.includes('sizes')) {
        const selectProps = getFormControlA11yProps({ ariaLabel: '每页条数' });
        children.push(createVNode('div', { class: 'lyt-pagination__sizes' }, [
          createVNode('select', mergeA11yProps(selectProps, {
            class: 'lyt-pagination__select',
            value: currentPageSize(),
            onChange: handlePageSizeChange,
          }), [
            props.pageSizes.map((size: number) => 
              createVNode('option', { value: size }, [`${size} 条/页`])
            ),
          ]),
        ]));
      }

      if (props.layout.includes('jumper')) {
        const inputProps = getFormControlA11yProps({ ariaLabel: '跳转到第几页' });
        children.push(createVNode('div', { class: 'lyt-pagination__jumper' }, [
          createVNode('span', {}, ['跳至']),
          createVNode('input', mergeA11yProps(inputProps, {
            type: 'number',
            class: 'lyt-pagination__input',
            min: 1,
            max: totalPages(),
            onChange: handleJumperChange,
          })),
          createVNode('span', {}, ['页']),
        ]));
      }

      if (slots.default) {
        children.push(slots.default());
      }

      return createVNode('div', mergeA11yProps(groupProps, a11yProps, { class: paginationClass }), [children]);
    };
  },
});

export type { PaginationProps, PaginationSlots } from './types';
