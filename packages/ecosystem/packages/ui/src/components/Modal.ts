/**
 * @lytjs/ui - Modal 组件
 *
 * 对话框组件，支持拖拽移动、全屏显示、自定义页脚、层级管理、动画优化
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * Modal 组件
 */
export const Modal = defineComponent({
  name: 'LytModal',

  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    width: { type: [String, Number], default: '50%' },
    top: { type: String, default: '15vh' },
    showClose: { type: Boolean, default: true },
    closeOnClickModal: { type: Boolean, default: true },
    closeOnPressEscape: { type: Boolean, default: true },
    lockScroll: { type: Boolean, default: true },
    draggable: { type: Boolean, default: false },
    fullscreen: { type: Boolean, default: false },
    appendToBody: { type: Boolean, default: false },
    customClass: { type: String, default: '' },
    class: { type: String, default: '' },
    onBeforeOpen: { type: Function, default: undefined },
    onBeforeClose: { type: Function, default: undefined },
    onOpen: { type: Function, default: undefined },
    onClose: { type: Function, default: undefined },
    onConfirm: { type: Function, default: undefined },
    onCancel: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    const isClosing = signal(false);
    const isFullscreen = signal(props.fullscreen);
    const dragState = signal({
      dragging: false,
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
    });
    const modalPosition = signal({ left: '50%', top: props.top });

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

    const toggleFullscreen = () => {
      isFullscreen.set(!isFullscreen());
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!props.draggable || isFullscreen()) return;
      
      const drag = dragState();
      drag.dragging = true;
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      
      const position = modalPosition();
      drag.startLeft = parseInt(position.left) || 0;
      drag.startTop = parseInt(position.top) || 0;
      
      dragState.set({ ...drag });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragState();
      if (!drag.dragging) return;
      
      const deltaX = e.clientX - drag.startX;
      const deltaY = e.clientY - drag.startY;
      
      modalPosition.set({
        left: `${drag.startLeft + deltaX}px`,
        top: `${drag.startTop + deltaY}px`,
      });
    };

    const handleMouseUp = () => {
      const drag = dragState();
      if (drag.dragging) {
        drag.dragging = false;
        dragState.set({ ...drag });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    const getModalClass = () => {
      const classes = ['lyt-modal'];
      if (props.modelValue) classes.push('lyt-modal--visible');
      if (isClosing()) classes.push('lyt-modal--closing');
      if (isFullscreen()) classes.push('lyt-modal--fullscreen');
      if (props.class) classes.push(props.class);
      if (props.customClass) classes.push(props.customClass);
      return classes.join(' ');
    };

    return () => {
      if (!props.modelValue && !isClosing()) {
        return createVNode('div', { style: 'display: none;' }, []);
      }

      const width = typeof props.width === 'number' ? `${props.width}px` : props.width;
      const children: any[] = [];

      children.push(createVNode('div', { class: 'lyt-modal__overlay', onClick: handleModalClick }));

      const modalChildren: any[] = [];

      const headerChildren: any[] = [];
      if (slots.header) {
        headerChildren.push(...slots.header());
      } else if (props.title) {
        headerChildren.push(createVNode('span', { class: 'lyt-modal__title' }, props.title));
      }

      const headerActions: any[] = [];
      
      headerActions.push(
        createVNode('button', { 
          class: 'lyt-modal__fullscreen', 
          type: 'button', 
          onClick: toggleFullscreen 
        }, [
          createVNode('svg', { viewBox: '0 0 1024 1024', width: '1em', height: '1em' }, [
            createVNode('path', {
              d: 'M420.57 406.76h182.86v182.86H420.57zM117.14 293.62H209.5V201.26h405.26v92.36h92.36v518.25H614.76v92.36H209.5v-92.36H117.14zM299.26 729.31h425.48V473.37H299.26z',
              fill: 'currentColor',
            }),
          ]),
        ])
      );

      if (props.showClose) {
        headerActions.push(
          createVNode('button', { class: 'lyt-modal__close', type: 'button', onClick: close }, [
            createVNode('svg', { viewBox: '0 0 1024 1024', width: '1em', height: '1em' }, [
              createVNode('path', {
                d: 'M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9c-4.4 5.2-.7 13.1 6.1 13.1h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z',
                fill: 'currentColor',
              }),
            ]),
          ])
        );
      }

      if (headerChildren.length > 0 || headerActions.length > 0) {
        modalChildren.push(
          createVNode('div', { 
            class: 'lyt-modal__header', 
            onMousedown: handleMouseDown 
          }, [
            ...headerChildren,
            ...headerActions,
          ])
        );
      }

      if (slots.default) {
        modalChildren.push(createVNode('div', { class: 'lyt-modal__body' }, slots.default()));
      }

      if (slots.footer) {
        modalChildren.push(createVNode('div', { class: 'lyt-modal__footer' }, slots.footer()));
      }

      children.push(
        createVNode('div', { class: 'lyt-modal__wrapper' }, [
          createVNode(
            'div', 
            { 
              class: 'lyt-modal__content', 
              style: isFullscreen() 
                ? 'width: 100%; height: 100%; margin: 0; top: 0; left: 0;'
                : `width: ${width}; margin-left: auto; margin-right: auto; left: ${modalPosition().left}; top: ${modalPosition().top};` 
            }, 
            modalChildren
          ),
        ])
      );

      return createVNode('div', { class: getModalClass() }, children);
    };
  },
});

export default Modal;
