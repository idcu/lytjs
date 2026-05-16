/**
 * @lytjs/ui - Spin 组件
 *
 * 加载中组件，用于展示加载状态
 */

import type { SpinProps, SpinSlots, SpinSetupProps } from './types';
import { defineComponent, onUnmounted } from '@lytjs/component';
import { createVNode, createTextVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { reactive, watch } from '@lytjs/reactivity';
import { mergeA11yProps } from '@lytjs/common-a11y';

export const Spin = defineComponent({
  name: 'LytSpin',

  props: {
    spinning: { type: Boolean, default: true },
    size: { type: String, default: 'default' },
    tip: { type: String, default: '' },
    delay: { type: Number, default: 0 },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: SpinSlots }) {
    const p = props as unknown as SpinSetupProps;
    const state = reactive({
      visible: props.spinning as boolean,
    });

    let delayTimer: ReturnType<typeof setTimeout> | null = null;

    watch(() => props.spinning, (val: boolean) => {
      if (delayTimer) clearTimeout(delayTimer);
      if (val) {
        if (p.delay && p.delay > 0) {
          delayTimer = setTimeout(() => {
            state.visible = true;
          }, p.delay);
        } else {
          state.visible = true;
        }
      } else {
        state.visible = false;
      }
    });

    onUnmounted(() => {
      if (delayTimer) clearTimeout(delayTimer);
    });

    const getSpinClass = () => {
      const classes = ['lyt-spin'];
      if (state.visible) classes.push('lyt-spin--spinning');
      if (p.class) classes.push(p.class);
      return classes.join(' ');
    };

    const getSpinStyle = () => {
      if (!p.style) return undefined;
      if (isString(p.style)) return p.style;
      if (isObject(p.style)) {
        return Object.entries(p.style)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
      }
      return undefined;
    };

    return () => {
      const children: VNode[] = [];
      
      if (state.visible) {
        const loadingChildren: VNode[] = [];
        
        loadingChildren.push(createVNode('div', { class: `lyt-spin__icon lyt-spin__icon--${p.size}` }, [
          createVNode('svg', { viewBox: '0 0 1024 1024', class: 'lyt-spin__svg' }, [
            createVNode('path', {
              d: 'M512 64a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V96a32 32 0 0 1 32-32zm0 640a32 32 0 0 1 32 32v192a32 32 0 0 1-64 0V736a32 32 0 0 1 32-32zm-448-192a32 32 0 0 1 32-32h192a32 32 0 0 1 0 64H96a32 32 0 0 1-32-32zm640 0a32 32 0 0 1 32-32h192a32 32 0 0 1 0 64H736a32 32 0 0 1-32-32z',
            }),
          ]),
        ]));
        
        if (p.tip || slots.tip) {
          loadingChildren.push(createVNode('div', { class: 'lyt-spin__tip' }, slots.tip ? slots.tip() : [createTextVNode(p.tip)]));
        }

        children.push(createVNode('div', { class: 'lyt-spin__loading' }, loadingChildren));
      }

      if (slots.default) {
        children.push(createVNode('div', {
          class: state.visible ? 'lyt-spin__content lyt-spin__content--hidden' : 'lyt-spin__content',
        }, slots.default()));
      }

      return createVNode('div', mergeA11yProps({
        id: p.id,
        'aria-label': p.ariaLabel,
        'aria-describedby': p.ariaDescribedBy,
        role: 'alert',
        'aria-live': 'polite',
      }, {
        class: getSpinClass(),
        style: getSpinStyle(),
      }), children);
    };
  },
});

export type { SpinProps, SpinSlots };
