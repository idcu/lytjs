/**
 * Pagination 分页
 * Props: total, pageSize, currentPage, showSizeChanger, showQuickJumper
 * Events: change, pageSizeChange
 */

import { defineComponent } from '@lytjs/component';
import { reactive, watch } from '@lytjs/reactivity';

export const Pagination = defineComponent({
  name: 'LytPagination',

  props: {
    total: {
      type: Number,
      default: 0,
    },
    pageSize: {
      type: Number,
      default: 10,
    },
    currentPage: {
      type: Number,
      default: 1,
    },
    showSizeChanger: {
      type: Boolean,
      default: false,
    },
    showQuickJumper: {
      type: Boolean,
      default: false,
    },
  },

  setup(props, { emit }) {
    const state = reactive({
      current: props.currentPage,
      size: props.pageSize,
      jumperValue: '',
    });

    const totalPages = () => Math.max(1, Math.ceil(props.total / state.size));

    const pages = () => {
      const total = totalPages();
      const current = state.current;
      const result: (number | string)[] = [];

      if (total <= 7) {
        for (let i = 1; i <= total; i++) result.push(i);
      } else {
        result.push(1);
        if (current > 4) result.push('...');
        const start = Math.max(2, current - 2);
        const end = Math.min(total - 1, current + 2);
        for (let i = start; i <= end; i++) result.push(i);
        if (current < total - 3) result.push('...');
        result.push(total);
      }

      return result;
    };

    const goTo = (page: number) => {
      const total = totalPages();
      if (page < 1) page = 1;
      if (page > total) page = total;
      state.current = page;
      emit('change', page);
      emit('update:currentPage', page);
    };

    const handlePrev = () => goTo(state.current - 1);
    const handleNext = () => goTo(state.current + 1);
    const handlePageClick = (page: number | string) => {
      if (typeof page === 'number') goTo(page);
    };

    const handleSizeChange = (e: Event) => {
      const target = e.target as HTMLSelectElement;
      state.size = Number(target.value);
      state.current = 1;
      emit('pageSizeChange', state.size);
      emit('update:pageSize', state.size);
      emit('change', 1);
    };

    const handleJumper = () => {
      const page = parseInt(state.jumperValue, 10);
      if (!isNaN(page)) {
        goTo(page);
        state.jumperValue = '';
      }
    };

    const handleJumperKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleJumper();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    watch(() => props.currentPage, (val: any) => {
      state.current = val;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    watch(() => props.pageSize, (val: any) => {
      state.size = val;
    });

    return {
      state, totalPages, pages,
      goTo, handlePrev, handleNext, handlePageClick,
      handleSizeChange, handleJumper, handleJumperKeydown,
    };
  },

  template: `
    <div class="lyt-pagination">
      <span
        class="lyt-pagination__item lyt-pagination__prev {state.current <= 1 ? 'lyt-pagination__item--disabled' : ''}"
        @click="handlePrev"
      >&laquo;</span>
      <span
        v-for="page in pages()"
        class="lyt-pagination__item {page === state.current ? 'lyt-pagination__item--active' : ''} {page === '...' ? 'lyt-pagination__item--ellipsis' : ''}"
        @click="handlePageClick(page)"
      >{{ page }}</span>
      <span
        class="lyt-pagination__item lyt-pagination__next {state.current >= totalPages() ? 'lyt-pagination__item--disabled' : ''}"
        @click="handleNext"
      >&raquo;</span>
      <span class="lyt-pagination__total" v-if="total > 0">共 {{ total }} 条</span>
      <select
        class="lyt-pagination__size-changer"
        v-if="showSizeChanger"
        :value="state.size"
        @change="handleSizeChange"
      >
        <option value="10">10 条/页</option>
        <option value="20">20 条/页</option>
        <option value="50">50 条/页</option>
        <option value="100">100 条/页</option>
      </select>
      <span class="lyt-pagination__jumper" v-if="showQuickJumper">
        跳至
        <input
          class="lyt-pagination__jumper-input"
          type="number"
          :value="state.jumperValue"
          @input="state.jumperValue = $event.target.value"
          @keydown="handleJumperKeydown"
          min="1"
          :max="totalPages()"
        />
        页
      </span>
    </div>
  `,

  styles: `
    .lyt-pagination {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
      flex-wrap: wrap;
    }
    .lyt-pagination__item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      height: 32px;
      padding: 0 6px;
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      background-color: var(--lyt-color-bg);
      cursor: pointer;
      transition: all 0.3s;
      user-select: none;
      font-size: var(--lyt-font-size-base);
    }
    .lyt-pagination__item:hover { color: var(--lyt-color-primary); border-color: var(--lyt-color-primary); }
    .lyt-pagination__item--active { background-color: var(--lyt-color-primary); border-color: var(--lyt-color-primary); color: #fff; }
    .lyt-pagination__item--active:hover { background-color: var(--lyt-color-primary); border-color: var(--lyt-color-primary); color: #fff; opacity: 0.85; }
    .lyt-pagination__item--disabled { color: var(--lyt-color-muted); cursor: not-allowed; pointer-events: none; opacity: 0.5; }
    .lyt-pagination__item--ellipsis { border: none; cursor: default; }
    .lyt-pagination__item--ellipsis:hover { color: var(--lyt-color-muted); }
    .lyt-pagination__total { margin: 0 8px; color: var(--lyt-color-muted); }
    .lyt-pagination__size-changer {
      height: 32px;
      padding: 0 8px;
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
      outline: none;
      cursor: pointer;
      margin-left: 8px;
    }
    .lyt-pagination__size-changer:focus { border-color: var(--lyt-color-primary); }
    .lyt-pagination__jumper {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: 8px;
    }
    .lyt-pagination__jumper-input {
      width: 50px;
      height: 32px;
      text-align: center;
      border: 1px solid var(--lyt-color-border);
      border-radius: var(--lyt-radius-sm);
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
      outline: none;
    }
    .lyt-pagination__jumper-input:focus { border-color: var(--lyt-color-primary); }
  `,
});
