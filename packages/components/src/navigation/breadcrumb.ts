/**
 * Breadcrumb 面包屑
 * Props: items(数组 [{label, href}]), separator
 */

import { defineComponent } from '@lytjs/component';

export const Breadcrumb = defineComponent({
  name: 'LytBreadcrumb',

  props: {
    items: {
      type: Array as () => Array<{ label: string; href?: string }>,
      default: () => [],
    },
    separator: {
      type: String,
      default: '/',
    },
  },

  setup(props, { slots }) {
    const isLast = (index: number) => index === props.items.length - 1;

    return { props, isLast, slots };
  },

  template: `
    <nav class="lyt-breadcrumb" aria-label="Breadcrumb">
      <ol class="lyt-breadcrumb__list">
        <li
          v-for="(item, index) in items"
          class="lyt-breadcrumb__item {isLast(index) ? 'lyt-breadcrumb__item--last' : ''}"
        >
          <a
            v-if="item.href && !isLast(index)"
            class="lyt-breadcrumb__link"
            :href="item.href"
          >{{ item.label }}</a>
          <span v-else class="lyt-breadcrumb__text">{{ item.label }}</span>
          <span class="lyt-breadcrumb__separator" v-if="!isLast(index)">{{ separator }}</span>
        </li>
      </ol>
    </nav>
  `,

  styles: `
    .lyt-breadcrumb {
      font-size: var(--lyt-font-size-base);
      color: var(--lyt-color-muted);
    }
    .lyt-breadcrumb__list {
      display: flex;
      align-items: center;
      list-style: none;
      margin: 0;
      padding: 0;
      flex-wrap: wrap;
    }
    .lyt-breadcrumb__item {
      display: inline-flex;
      align-items: center;
    }
    .lyt-breadcrumb__link {
      color: var(--lyt-color-primary);
      text-decoration: none;
      transition: color 0.3s;
    }
    .lyt-breadcrumb__link:hover { color: var(--lyt-color-primary); text-decoration: underline; opacity: 0.8; }
    .lyt-breadcrumb__text { color: var(--lyt-color-muted); }
    .lyt-breadcrumb__item--last .lyt-breadcrumb__text { color: var(--lyt-color-info); }
    .lyt-breadcrumb__separator {
      margin: 0 8px;
      color: var(--lyt-color-muted);
      opacity: 0.5;
    }
  `,
});
