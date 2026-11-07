/**
 * @lytjs/ui - Pagination 分页组件
 *
 * 分页组件，支持多种分页模式、总数显示、每页条数选择
 *
 * 2026-11 已补受控/非受控行为用例（e2e-pagination / pagination-controlled），列入 Golden 20（stable）。
 *       成熟度表见 `src/component-status.ts`（单一真相源）。
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { getButtonA11yProps, getFormControlA11yProps, mergeA11yProps } from '@lytjs/common-a11y';
import { useControlledState } from '../composables';
import { t } from '../locale';

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

  setup(
    props: Record<string, unknown>,
    { emit }: { emit: (event: string, ...args: unknown[]) => void },
  ) {
    const p = props as unknown as PaginationSetupProps;

    // ⚠️ 2026-11-03 修（P1）：**受控组件的 prop 变化必须跟随**。
    //   此前只在创建时取一次值，父组件把 `current` 重置为 1（例如筛选条件变化）时，
    //   分页器仍停在第 5 页 —— 视图与状态不一致，而且没有任何报错。
    //   跟随逻辑（含 `pageSize`）已收敛到 `composables/useControlledState`。
    const currentPage = useControlledState({ get: () => p.current });
    const currentPageSize = useControlledState({ get: () => p.pageSize });

    const totalPages = (): number => {
      return Math.ceil(p.total / currentPageSize.value());
    };

    /**
     * 渲染用的「有效页码」：把越界的 `current` 夹到 `[1, totalPages]`。
     *
     * ⚠️ 2026-11-03 修（P1）：此前 `current=10 / total=30 / pageSize=10`（只有 3 页）时，
     *   页码区一个 `--active` 都没有 —— 用户看到「没有任何一页被选中」。
     */
    const effectiveCurrent = (): number => {
      const last = Math.max(1, totalPages());
      return Math.min(Math.max(1, currentPage.value()), last);
    };

    const getPageRange = (): number[] => {
      const pages: number[] = [];
      const total = totalPages();
      const current = effectiveCurrent();
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
      if (page < 1 || page > totalPages() || page === effectiveCurrent()) return;
      currentPage.set(page);
      // 受控用法：`v-model:current` 依赖这个事件（此前**从不 emit** ⇒ v-model 静默无效）
      emit('update:current', page);
      p.onChange?.(page, currentPageSize.value());
    };

    const handlePrev = () => {
      handlePageChange(effectiveCurrent() - 1);
    };

    const handleNext = () => {
      handlePageChange(effectiveCurrent() + 1);
    };

    const handlePageSizeChange = (e: Event) => {
      const size = Number((e.target as HTMLSelectElement).value);
      currentPageSize.set(size);
      currentPage.set(1);
      emit('update:pageSize', size);
      emit('update:current', 1);
      p.onSizeChange?.(size);
      p.onChange?.(1, size);
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
        p.background ? 'lyt-pagination--background' : '',
        p.simple ? 'lyt-pagination--simple' : '',
        p.class,
      ]
        .filter(Boolean)
        .join(' ');

      const a11yProps = {
        id: p.id,
        'aria-label': p.ariaLabel || t('pagination.label'),
        'aria-describedby': p.ariaDescribedBy,
      };

      const children: VNode[] = [];

      if (p.layout.includes('total')) {
        children.push(
          createVNode('span', { class: 'lyt-pagination__total' }, [
            createVNode('span', {}, t('pagination.total', { total: p.total })),
          ]),
        );
      }

      if (p.layout.includes('prev')) {
        const prevProps = getButtonA11yProps({
          ariaLabel: t('pagination.prev'),
          disabled: effectiveCurrent() === 1,
        });
        children.push(
          createVNode(
            'button',
            mergeA11yProps(prevProps, {
              class: ['lyt-pagination__btn', 'lyt-pagination__prev'],
              disabled: effectiveCurrent() === 1,
              onClick: handlePrev,
            }),
            [createVNode('span', {}, t('pagination.prev'))],
          ),
        );
      }

      if (p.layout.includes('pager') && !p.simple) {
        const pageRange = getPageRange();
        const pagerChildren: VNode[] = [];
        const firstPage = pageRange[0];

        if (firstPage !== undefined && firstPage > 1) {
          const firstProps = getButtonA11yProps({ ariaLabel: t('pagination.page', { page: 1 }) });
          pagerChildren.push(
            createVNode(
              'button',
              mergeA11yProps(firstProps, {
                class: 'lyt-pagination__btn',
                onClick: () => handlePageChange(1),
              }),
              [createVNode('span', {}, '1')],
            ),
          );

          if (firstPage > 2) {
            pagerChildren.push(
              createVNode('span', { class: 'lyt-pagination__ellipsis' }, [
                createVNode('span', {}, '...'),
              ]),
            );
          }
        }

        for (const page of pageRange) {
          const pageBtnProps = getButtonA11yProps({
            ariaLabel: t('pagination.page', { page }),
            disabled: page === effectiveCurrent(),
          });
          pagerChildren.push(
            createVNode(
              'button',
              mergeA11yProps(pageBtnProps, {
                class: [
                  'lyt-pagination__btn',
                  page === effectiveCurrent() ? 'lyt-pagination__btn--active' : '',
                ]
                  .filter(Boolean)
                  .join(' '),
                'aria-current': page === effectiveCurrent() ? 'page' : undefined,
                onClick: () => handlePageChange(page),
              }),
              [createVNode('span', {}, String(page))],
            ),
          );
        }

        const lastPage = pageRange[pageRange.length - 1] as number | undefined;
        if (lastPage !== undefined && lastPage < totalPages()) {
          if (lastPage < totalPages() - 1) {
            pagerChildren.push(
              createVNode('span', { class: 'lyt-pagination__ellipsis' }, [
                createVNode('span', {}, '...'),
              ]),
            );
          }

          const lastProps = getButtonA11yProps({
            ariaLabel: t('pagination.page', { page: totalPages() }),
          });
          pagerChildren.push(
            createVNode(
              'button',
              mergeA11yProps(lastProps, {
                class: 'lyt-pagination__btn',
                onClick: () => handlePageChange(totalPages()),
              }),
              [createVNode('span', {}, String(totalPages()))],
            ),
          );
        }

        children.push(createVNode('div', { class: 'lyt-pagination__pager' }, pagerChildren));
      }

      if (p.layout.includes('next')) {
        const nextProps = getButtonA11yProps({
          ariaLabel: t('pagination.next'),
          disabled: effectiveCurrent() >= totalPages(),
        });
        children.push(
          createVNode(
            'button',
            mergeA11yProps(nextProps, {
              class: ['lyt-pagination__btn', 'lyt-pagination__next'],
              disabled: effectiveCurrent() >= totalPages(),
              onClick: handleNext,
            }),
            [createVNode('span', {}, t('pagination.next'))],
          ),
        );
      }

      if (p.layout.includes('sizes')) {
        const selectProps = getFormControlA11yProps({ ariaLabel: t('pagination.pageSize') });
        const options = p.pageSizes.map((size: number) =>
          createVNode('option', { value: size }, t('pagination.pageSizeOption', { size })),
        );
        children.push(
          createVNode('div', { class: 'lyt-pagination__sizes' }, [
            createVNode(
              'select',
              mergeA11yProps(selectProps, {
                class: 'lyt-pagination__select',
                value: currentPageSize.value(),
                onChange: handlePageSizeChange,
              }),
              options,
            ),
          ]),
        );
      }

      if (p.layout.includes('jumper')) {
        const inputProps = getFormControlA11yProps({ ariaLabel: t('pagination.jumpTo') });
        children.push(
          createVNode('div', { class: 'lyt-pagination__jumper' }, [
            createVNode('span', {}, t('pagination.jump')),
            createVNode(
              'input',
              mergeA11yProps(inputProps, {
                type: 'number',
                class: 'lyt-pagination__input',
                min: 1,
                max: totalPages(),
                onChange: handleJumperChange,
              }),
            ),
            createVNode('span', {}, t('pagination.pageUnit')),
          ]),
        );
      }

      return createVNode(
        'div',
        {
          class: paginationClass,
          ...a11yProps,
        },
        children,
      );
    };
  },
});
