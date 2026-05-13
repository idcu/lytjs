/**
 * @lytjs/ui - Image 组件
 *
 * 图片组件，支持懒加载、预览弹窗、错误兜底、自适应功能，适配主题样式
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * Image 组件
 */
export const Image = defineComponent({
  name: 'LytImage',

  props: {
    src: { type: String, default: '' },
    alt: { type: String, default: '' },
    fit: { 
      type: String, 
      default: 'cover',
      validator: (v: string) => ['fill', 'contain', 'cover', 'none', 'scale-down'].includes(v)
    },
    width: { type: [String, Number], default: '' },
    height: { type: [String, Number], default: '' },
    lazy: { type: Boolean, default: false },
    preview: { type: Boolean, default: true },
    errorSrc: { type: String, default: '' },
    placeholderSrc: { type: String, default: '' },
    round: { type: Boolean, default: false },
    radius: { type: [String, Number], default: '' },
    class: { type: String, default: '' },
    onLoad: { type: Function, default: undefined },
    onError: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    const isLoaded = signal(false);
    const isError = signal(false);
    const isPreviewVisible = signal(false);

    // 处理图片加载成功
    const handleLoad = () => {
      isLoaded.set(true);
      if (props.onLoad) {
        props.onLoad();
      }
    };

    // 处理图片加载失败
    const handleError = () => {
      isError.set(true);
      if (props.onError) {
        props.onError();
      }
    };

    // 打开预览
    const openPreview = () => {
      if (!props.preview || isError.value) return;
      isPreviewVisible.set(true);
    };

    // 关闭预览
    const closePreview = () => {
      isPreviewVisible.set(false);
    };

    // 生成类名
    const getImageClass = () => {
      const classes = ['lyt-image'];
      if (props.class) classes.push(props.class);
      if (props.round) classes.push('lyt-image-round');
      return classes.join(' ');
    };

    // 获取样式对象
    const getImageStyle = () => {
      const style: any = {};
      if (props.width) {
        style.width = typeof props.width === 'number' ? `${props.width}px` : props.width;
      }
      if (props.height) {
        style.height = typeof props.height === 'number' ? `${props.height}px` : props.height;
      }
      if (props.radius) {
        style.borderRadius = typeof props.radius === 'number' ? `${props.radius}px` : props.radius;
      }
      return style;
    };

    return () => {
      // 占位符内容
      let placeholder;
      if (props.placeholderSrc) {
        placeholder = createVNode('img', {
          class: 'lyt-image-placeholder',
          src: props.placeholderSrc,
          alt: props.alt,
          style: { objectFit: props.fit }
        });
      } else {
        placeholder = createVNode('div', { class: 'lyt-image-placeholder' }, [
          createVNode('svg', { viewBox: '0 0 100 100', fill: 'currentColor' }, [
            createVNode('path', {
              d: 'M50 10a40 40 0 1 0 40 40A40 40 0 0 0 50 10zm0 70a30 30 0 1 1 30-30 30 30 0 0 1-30 30z',
              opacity: '0.3'
            }),
            createVNode('path', {
              d: 'M50 40a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm30 35a24.9 24.9 0 0 0-7.7-18.3l-11.2-9.4a10 10 0 0 0-12.8 0L34.3 54A25 25 0 0 0 25 75z',
              opacity: '0.6'
            })
          ])
        ]);
      }

      // 错误状态
      let errorContent;
      if (isError.value) {
        if (props.errorSrc) {
          errorContent = createVNode('img', {
            class: 'lyt-image-error',
            src: props.errorSrc,
            alt: props.alt,
            style: { objectFit: props.fit }
          });
        } else {
          errorContent = createVNode('div', { class: 'lyt-image-error' }, [
            createVNode('svg', { viewBox: '0 0 100 100', fill: 'currentColor' }, [
              createVNode('circle', { cx: '50', cy: '50', r: '40', opacity: '0.2' }),
              createVNode('line', { x1: '30', y1: '30', x2: '70', y2: '70', stroke: 'currentColor', strokeWidth: '6', strokeLinecap: 'round' }),
              createVNode('line', { x1: '70', y1: '30', x2: '30', y2: '70', stroke: 'currentColor', strokeWidth: '6', strokeLinecap: 'round' })
            ])
          ]);
        }
      }

      // 预览层
      let previewLayer;
      if (isPreviewVisible.value) {
        previewLayer = createVNode('div', { class: 'lyt-image-preview', onClick: closePreview }, [
          createVNode('div', { class: 'lyt-image-preview-mask' }),
          createVNode('img', {
            class: 'lyt-image-preview-content',
            src: props.src,
            alt: props.alt,
            onClick: (e: Event) => e.stopPropagation()
          }),
          createVNode('button', { class: 'lyt-image-preview-close', onClick: closePreview }, '×')
        ]);
      }

      // 图片容器
      return createVNode('div', { class: getImageClass(), style: getImageStyle() }, [
        // 占位符
        (!isLoaded.value && !isError.value) && placeholder,
        // 图片
        createVNode('img', {
          class: 'lyt-image-inner',
          src: props.src,
          alt: props.alt,
          style: {
            objectFit: props.fit,
            display: (isLoaded.value || isError.value) ? 'block' : 'none'
          },
          loading: props.lazy ? 'lazy' : 'eager',
          onLoad: handleLoad,
          onError: handleError,
          onClick: openPreview
        }),
        // 错误状态
        isError.value && errorContent,
        // 预览遮罩层
        props.preview && !isError.value && isLoaded.value && createVNode('div', {
          class: 'lyt-image-preview-trigger',
          onClick: openPreview
        }),
        // 预览层
        previewLayer
      ]);
    };
  },
});

export default Image;
