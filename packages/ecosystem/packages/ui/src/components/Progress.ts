/**
 * @lytjs/ui - Progress 组件
 *
 * 进度条组件，用于显示操作进度
 */

import type { ProgressProps, ProgressSlots, ProgressSetupProps } from './types';
import { defineComponent, type PropType } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject, isArray } from '@lytjs/common-is';
import { computed } from '@lytjs/reactivity';

export const Progress = defineComponent({
  name: 'LytProgress',

  props: {
    percentage: { type: Number, default: 0 },
    type: { type: String, default: 'line' },
    status: { type: String, default: '' },
    strokeWidth: { type: Number, default: 6 },
    textInside: { type: Boolean, default: false },
    showText: { type: Boolean, default: true },
    color: { type: [String, Array, Object] as unknown as PropType<string | string[] | Record<string, string>>, default: '' },
    width: { type: Number, default: 126 },
    strokeLinecap: { type: String, default: 'round' },
    format: { type: Function, default: undefined },
    class: { type: String, default: '' },
    style: { type: [String, Object] as unknown as PropType<string | Record<string, string>>, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>) {
    const _props = props as ProgressSetupProps;

    const validPercentage = computed(() => {
      let p = _props.percentage;
      if (p < 0) p = 0;
      if (p > 100) p = 100;
      return p;
    });

    const getStatus = computed(() => {
      if (_props.status) return _props.status;
      if (validPercentage.value === 100) return 'success';
      return '';
    });

    const getBarStyle = computed(() => {
      const style: Record<string, string> = {
        width: `${validPercentage.value}%`,
      };

      if (_props.color) {
        if (isString(_props.color)) {
          style.backgroundColor = _props.color;
        } else if (isObject(_props.color) && !isArray(_props.color)) {
          const colorObj = _props.color as Record<string, string>;
          for (const key in colorObj) {
            const percentage = parseInt(key);
            if (validPercentage.value >= percentage) {
              const colorValue = colorObj[key];
              if (colorValue) {
                style.backgroundColor = colorValue;
              }
            }
          }
        }
      }

      return style;
    });

    const getProgressClass = () => {
      const classes = ['lyt-progress'];
      if (_props.type) classes.push(`lyt-progress--${_props.type}`);
      const status = getStatus.value;
      if (status) classes.push(`lyt-progress--${status}`);
      if (_props.class) classes.push(_props.class as string);
      return classes.join(' ');
    };

    const getProgressStyle = () => {
      const style: Record<string, string> = {};
      if (_props.style) {
        if (isString(_props.style)) {
          return _props.style;
        }
        if (isObject(_props.style)) {
          Object.assign(style, _props.style);
        }
      }
      return style;
    };

    const formatText = () => {
      if (_props.format) {
        return _props.format(validPercentage.value);
      }
      return `${validPercentage.value}%`;
    };

    const renderLine = () => {
      const children: VNode[] = [];

      const barStyle = getBarStyle.value;
      const innerContent: VNode[] = [];
      if (_props.textInside && _props.showText) {
        innerContent.push(createVNode('div', { class: 'lyt-progress__inner-text' }, [createVNode('span', {}, formatText())]));
      }

      children.push(createVNode('div', {
        class: 'lyt-progress__outer',
      }, [
        createVNode('div', {
          class: 'lyt-progress__inner',
          style: barStyle,
        }, innerContent),
      ]));

      if (_props.showText && !_props.textInside) {
        children.push(createVNode('div', {
          class: 'lyt-progress__text',
        }, [createVNode('span', {}, formatText())]));
      }

      return children;
    };

    const renderCircle = () => {
      const radius = 50 - _props.strokeWidth / 2;
      const circumference = 2 * Math.PI * radius;
      const strokeDashoffset = circumference - (validPercentage.value / 100) * circumference;
      const barStyle = getBarStyle.value;

      const children: VNode[] = [];

      children.push(createVNode('svg', {
        class: 'lyt-progress__circle',
        viewBox: '0 0 100 100',
        width: _props.width,
        height: _props.width,
      }, [
        createVNode('path', {
          class: 'lyt-progress__circle-trail',
          d: `M 50 50 m 0,-${radius} a ${radius},${radius} 0 1 1 0,${radius * 2} a ${radius},${radius} 0 1 1 0,-${radius * 2}`,
          stroke: '#e5e9f2',
          strokeWidth: _props.strokeWidth,
          fill: 'none',
        }, []),
        createVNode('path', {
          class: 'lyt-progress__circle-path',
          d: `M 50 50 m 0,-${radius} a ${radius},${radius} 0 1 1 0,${radius * 2} a ${radius},${radius} 0 1 1 0,-${radius * 2}`,
          stroke: barStyle.backgroundColor || '#409eff',
          strokeWidth: _props.strokeWidth,
          fill: 'none',
          strokeDasharray: `${circumference}px, ${circumference}px`,
          strokeDashoffset: `${strokeDashoffset}px`,
          strokeLinecap: _props.strokeLinecap,
        }, []),
      ]));

      if (_props.showText) {
        children.push(createVNode('div', {
          class: 'lyt-progress__text',
        }, [createVNode('span', {}, formatText())]));
      }

      return children;
    };

    return () => {
      let content: VNode[];

      if (_props.type === 'circle' || _props.type === 'dashboard') {
        content = renderCircle();
      } else {
        content = renderLine();
      }

      return createVNode('div', {
        id: _props.id as string,
        'aria-label': _props.ariaLabel as string || 'Progress',
        'aria-describedby': _props.ariaDescribedBy as string,
        role: 'progressbar',
        'aria-valuenow': String(validPercentage.value),
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        class: getProgressClass(),
        style: getProgressStyle(),
      }, content);
    };
  },
});

export type { ProgressProps, ProgressSlots };
