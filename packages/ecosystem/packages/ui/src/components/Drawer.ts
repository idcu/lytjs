/**
 * @lytjs/ui - Drawer 组件
 *
 * 抽屉组件，支持上下左右弹出、遮罩控制、宽度自适应、嵌套弹窗功能
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * Drawer 组件
 */
export const Drawer = defineComponent({
  name: 'LytDrawer',

  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    size: { type: [String, Number], default: '30%' },
    direction: { type: String, default: 'rtl', validator: (v: string) => ['ltr', 'rtl', 'ttb', 'btt'].includes(v) },
    showClose: { type: Boolean, default: true },
    closeOnClickModal: { type: Boolean, default: true },
    closeOnPressEscape: { type: Boolean, default: true },
    lockScroll: { type: Boolean, default: true },
    appendToBody: { type: Boolean, default: false },
    withHeader: { type: Boolean, default: true },
    customClass: { type: String, default: '' },
    class: { type: String, default: '' },
    onBeforeOpen: { type: Function, default: undefined },
    onBeforeClose: { type: Function, default: undefined },
    onOpen: { type: Function, default: undefined },
    onClose: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    const isClosing = signal(false);

    const close = async () => {
      if (isClosing()) return;
      if (props.onBeforeClose) {
        const result = await props.onBeforeClose();
        if (result === false) return;
      }
      isClosing.set(true);
      emit('update:modelValue', false);
      props.onClose?.();
      setTimeout(() => { isClosing.set(false); }, 300);
    };

    const handleModalClick = () => {
      if (props.closeOnClickModal) close();
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && props.closeOnPressEscape && props.modelValue) {
        close();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown);
    }

    const getDrawerClass = () => {
      const classes = ['lyt-drawer'];
      classes.push(`lyt-drawer--${props.direction}`);
      if (props.modelValue) classes.push('lyt-drawer--visible');
      if (isClosing()) classes.push('lyt-drawer--closing');
      if (props.class) classes.push(props.class);
      if (props.customClass) classes.push(props.customClass);
      return classes.join(' ');
    };

    const getSizeStyle = () => {
      const size = typeof props.size === 'number' ? `${props.size}px` : props.size;
      const style: any = {};
      
      switch (props.direction) {
        case 'ltr':
        case 'rtl':
          style.width = size;
          break;
        case 'ttb':
        case 'btt':
          style.height = size;
          break;
      }
      
      return style;
    };

    const formatStyle = (style: any) => {
      if (!style) return '';
      if (typeof style === 'string') return style;
      return Object.entries(style)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');
    };

    return () => {
      if (!props.modelValue && !isClosing()) {
        return createVNode('div', { style: 'display: none;' }, []);
      }

      const children: any[] = [];

      children.push(createVNode('div', { class: 'lyt-drawer__overlay', onClick: handleModalClick }));

      const drawerChildren: any[] = [];

      if (props.withHeader) {
        const headerChildren: any[] = [];
        
        if (slots.header) {
          headerChildren.push(...slots.header());
        } else if (props.title) {
          headerChildren.push(createVNode('span', { class: 'lyt-drawer__title' }, props.title));
        }

        if (props.showClose) {
          headerChildren.push(
            createVNode('button', { class: 'lyt-drawer__close', type: 'button', onClick: close }, [
              createVNode('svg', { viewBox: '0 0 1024 1024', width: '1em', height: '1em' }, [
                createVNode('path', {
                  d: 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9c-4.4 5.2-.7 13.1 6.1 13.1h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z',
                  fill: 'currentColor',
                }),
              ]),
            ])
          );
        }

        if (headerChildren.length > 0) {
          drawerChildren.push(createVNode('div', { class: 'lyt-drawer__header' }, headerChildren));
        }
      }

      if (slots.default) {
        drawerChildren.push(createVNode('div', { class: 'lyt-drawer__body' }, slots.default()));
      }

      if (slots.footer) {
        drawerChildren.push(createVNode('div', { class: 'lyt-drawer__footer' }, slots.footer()));
      }

      children.push(
        createVNode('div', { 
          class: 'lyt-drawer__container', 
          style: formatStyle(getSizeStyle()) 
        }, drawerChildren)
      );

      return createVNode('div', { class: getDrawerClass() }, children);
    };
  },
});

export default Drawer;
