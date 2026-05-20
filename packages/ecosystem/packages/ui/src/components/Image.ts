/**
 * @lytjs/ui - Image 组件
 *
 * 图片组件，支持懒加载、预览弹窗、错误兜底、自适应功能，适配主题样式
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { ImageSetupProps } from './types';

export const Image = defineComponent({
  name: 'LytImage',

  props: {
    src: { type: String, default: '' },
    alt: { type: String, default: '' },
    fit: { type: String, default: 'cover' },
    width: { type: [String, Number] as unknown as StringConstructor, default: '' },
    height: { type: [String, Number] as unknown as StringConstructor, default: '' },
    lazy: { type: Boolean, default: false },
    preview: { type: Boolean, default: true },
    errorSrc: { type: String, default: '' },
    placeholderSrc: { type: String, default: '' },
    round: { type: Boolean, default: false },
    radius: { type: [String, Number] as unknown as StringConstructor, default: '' },
    class: { type: String, default: '' },
    onLoad: { type: Function, default: undefined },
    onError: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>) {
    const p = props as ImageSetupProps;
    const isLoaded = signal(false);
    const isError = signal(false);
    const isPreviewVisible = signal(false);

    const handleLoad = () => {
      isLoaded.set(true);
      if (p.onLoad) {
        p.onLoad();
      }
    };

    const handleError = () => {
      isError.set(true);
      if (p.onError) {
        p.onError();
      }
    };

    const openPreview = () => {
      if (!p.preview || isError()) return;
      isPreviewVisible.set(true);
    };

    const closePreview = () => {
      isPreviewVisible.set(false);
    };

    return () => {
      const imageClass = ['lyt-image', p.class as string, p.round ? 'lyt-image-round' : '']
        .filter(Boolean)
        .join(' ');

      const imageStyle: Record<string, string> = {};
      if (p.width) {
        imageStyle.width = typeof p.width === 'number' ? `${p.width}px` : (p.width as string);
      }
      if (p.height) {
        imageStyle.height = typeof p.height === 'number' ? `${p.height}px` : (p.height as string);
      }
      if (p.radius) {
        imageStyle.borderRadius =
          typeof p.radius === 'number' ? `${p.radius}px` : (p.radius as string);
      }

      const children: VNode[] = [];

      if (!isLoaded() && !isError()) {
        if (p.placeholderSrc) {
          children.push(
            createVNode('img', {
              class: 'lyt-image-placeholder',
              src: p.placeholderSrc as string,
              alt: p.alt as string,
              style: { objectFit: p.fit as string },
            }),
          );
        } else {
          children.push(
            createVNode('div', { class: 'lyt-image-placeholder' }, [
              createVNode('svg', { viewBox: '0 0 100 100', fill: 'currentColor' }, [
                createVNode('path', {
                  d: 'M50 10a40 40 0 1 0 40 40A40 40 0 0 0 50 10zm0 70a30 30 0 1 1 30-30 30 30 0 0 1-30 30z',
                  opacity: '0.3',
                }),
                createVNode('path', {
                  d: 'M50 40a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm30 35a24.9 24.9 0 0 0-7.7-18.3l-11.2-9.4a10 10 0 0 0-12.8 0L34.3 54A25 25 0 0 0 25 75z',
                  opacity: '0.6',
                }),
              ]),
            ]),
          );
        }
      }

      children.push(
        createVNode('img', {
          class: 'lyt-image-inner',
          src: p.src as string,
          alt: p.alt as string,
          style: {
            objectFit: p.fit as string,
            display: isLoaded() || isError() ? 'block' : 'none',
          },
          loading: p.lazy ? 'lazy' : 'eager',
          onLoad: handleLoad,
          onError: handleError,
          onClick: openPreview,
        }),
      );

      if (isError()) {
        if (p.errorSrc) {
          children.push(
            createVNode('img', {
              class: 'lyt-image-error',
              src: p.errorSrc as string,
              alt: p.alt as string,
              style: { objectFit: p.fit as string },
            }),
          );
        } else {
          children.push(
            createVNode('div', { class: 'lyt-image-error' }, [
              createVNode('svg', { viewBox: '0 0 100 100', fill: 'currentColor' }, [
                createVNode('circle', { cx: '50', cy: '50', r: '40', opacity: '0.2' }),
                createVNode('line', {
                  x1: '30',
                  y1: '30',
                  x2: '70',
                  y2: '70',
                  stroke: 'currentColor',
                  strokeWidth: '6',
                  strokeLinecap: 'round',
                }),
                createVNode('line', {
                  x1: '70',
                  y1: '30',
                  x2: '30',
                  y2: '70',
                  stroke: 'currentColor',
                  strokeWidth: '6',
                  strokeLinecap: 'round',
                }),
              ]),
            ]),
          );
        }
      }

      if (p.preview && !isError() && isLoaded()) {
        children.push(
          createVNode('div', {
            class: 'lyt-image-preview-trigger',
            onClick: openPreview,
          }),
        );
      }

      if (isPreviewVisible()) {
        children.push(
          createVNode('div', { class: 'lyt-image-preview', onClick: closePreview }, [
            createVNode('div', { class: 'lyt-image-preview-mask' }, []),
            createVNode(
              'img',
              {
                class: 'lyt-image-preview-content',
                src: p.src as string,
                alt: p.alt as string,
                onClick: (e: Event) => e.stopPropagation(),
              },
              [],
            ),
            createVNode('button', { class: 'lyt-image-preview-close', onClick: closePreview }, [
              createVNode('span', {}, '×'),
            ]),
          ]),
        );
      }

      return createVNode('div', { class: imageClass, style: imageStyle }, children);
    };
  },
});

export default Image;
export type { ImageProps, ImageSlots, ImageSetupProps } from './types';
