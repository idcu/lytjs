/**
 * @lytjs/ui - Progress 组件
 *
 * 进度条组件，用于显示操作进度
 */

import type { ProgressProps, ProgressSlots, ProgressSetupProps } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject, isArray } from '@lytjs/common-is';
import { computed } from '@lytjs/reactivity';
import { mergeA11yProps } from '@lytjs/common-a11y';

/**
 * Progress 组件
 */
export const Progress = defineComponent({
  name: 'LytProgress',

  props: {
    percentage: { type: Number, default: 0 },
    type: { type: String, default: 'line' },
    status: { type: String, default: '' },
    strokeWidth: { type: Number, default: 6 },
    textInside: { type: Boolean, default: false },
    showText: { type: Boolean, default: true },
    color: { type: [String, Array, Object], default: '' },
    width: { type: Number, default: 126 },
    strokeLinecap: { type: String, default: 'round' },
    format: { type: Function, default: undefined },
    class: { type: String, default: '' },
    style: { type: [String, Object], default: '' },
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
              style.backgroundColor = colorObj[key];
            }
          }
        }
      }
      
      return style;
    });

    const getProgressClass = () => {
      const classes = ['lyt-progress'];
      if (_props.type) classes.push(`lyt-progress--${_props.type}`);
      if (getStatus.value) classes.push(`lyt-progress--${getStatus.value}`);
      if (_props.class) classes.push(_props.class);
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
      
      children.push(createVNode('div', {
        class: 'lyt-progress__outer',
      }, [
        createVNode('div', {
          class: 'lyt-progress__inner',
          style: getBarStyle.value,
        }, [
          _props.textInside && _props.showText 
            ? createVNode('div', { class: 'lyt-progress__inner-text' }, [formatText()])
            : null,
        ]),
      ]));

      if (_props.showText && !_props.textInside) {
        children.push(createVNode('div', {
          class: 'lyt-progress__text',
        }, [formatText()]));
      }

      return children;
    };

    const renderCircle = () => {
      const radius = 50 - _props.strokeWidth / 2;
      const circumference = 2 * Math.PI * radius;
      const strokeDashoffset = circumference - (validPercentage.value / 100) * circumference;
      
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
        }),
        createVNode('path', {
          class: 'lyt-progress__circle-path',
          d: `M 50 50 m 0,-${radius} a ${radius},${radius} 0 1 1 0,${radius * 2} a ${radius},${radius} 0 1 1 0,-${radius * 2}`,
          stroke: getBarStyle.value.backgroundColor || '#409eff',
          strokeWidth: _props.strokeWidth,
          fill: 'none',
          strokeDasharray: `${circumference}px, ${circumference}px`,
          strokeDashoffset: `${strokeDashoffset}px`,
          strokeLinecap: _props.strokeLinecap,
        }),
      ]));

      if (_props.showText) {
        children.push(createVNode('div', {
          class: 'lyt-progress__text',
        }, [formatText()]));
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

      return createVNode('div', mergeA11yProps({
        id: _props.id,
        'aria-label': _props.ariaLabel,
        'aria-describedby': _props.ariaDescribedBy,
        role: 'progressbar',
        'aria-valuenow': String(validPercentage.value),
        'aria-valuemin': '0',
        'aria-valuemax': '100',
      }, {
        class: getProgressClass(),
        style: getProgressStyle(),
      }), content);
    };
  },
});

export type { ProgressProps, ProgressSlots };
