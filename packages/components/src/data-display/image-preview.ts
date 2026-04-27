/**
 * ImagePreview 图片预览
 * Props: src, alt, fit(cover/contain/fill/none/scale-down), preview, previewList, lazy, fallback
 * Events: load, error, previewOpen, previewClose
 */

import { defineComponent, onMounted, onUnmounted } from '@lytjs/component';
import { reactive } from '@lytjs/reactivity';

export const ImagePreview = defineComponent({
  name: 'LytImagePreview',

  props: {
    src: {
      type: String,
      default: '',
    },
    alt: {
      type: String,
      default: '',
    },
    fit: {
      type: String,
      default: 'cover',
      validator: (v: string) => ['cover', 'contain', 'fill', 'none', 'scale-down'].includes(v),
    },
    preview: {
      type: Boolean,
      default: true,
    },
    previewList: {
      type: Array as () => string[],
      default: () => [],
    },
    lazy: {
      type: Boolean,
      default: false,
    },
    fallback: {
      type: String,
      default: '',
    },
    width: {
      type: String,
      default: '',
    },
    height: {
      type: String,
      default: '',
    },
  },

  setup(props, { emit }) {
    const state = reactive({
      isLoaded: false,
      isError: false,
      isPreviewVisible: false,
      currentPreviewIndex: 0,
    });

    const handleLoad = (e: Event) => {
      state.isLoaded = true;
      state.isError = false;
      emit('load', e);
    };

    const handleError = (e: Event) => {
      state.isError = true;
      state.isLoaded = false;
      emit('error', e);
    };

    const handleImageClick = () => {
      if (!props.preview) return;
      const list = props.previewList.length > 0 ? props.previewList : [props.src];
      state.currentPreviewIndex = list.indexOf(props.src);
      if (state.currentPreviewIndex < 0) state.currentPreviewIndex = 0;
      state.isPreviewVisible = true;
      document.body.style.overflow = 'hidden';
      emit('previewOpen');
    };

    const closePreview = () => {
      state.isPreviewVisible = false;
      document.body.style.overflow = '';
      emit('previewClose');
    };

    const handleMaskClick = () => {
      closePreview();
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (!state.isPreviewVisible) return;
      if (e.key === 'Escape') {
        closePreview();
      }
      const list = props.previewList.length > 0 ? props.previewList : [props.src];
      if (e.key === 'ArrowLeft' && state.currentPreviewIndex > 0) {
        state.currentPreviewIndex--;
      }
      if (e.key === 'ArrowRight' && state.currentPreviewIndex < list.length - 1) {
        state.currentPreviewIndex++;
      }
    };

    const currentPreviewSrc = () => {
      const list = props.previewList.length > 0 ? props.previewList : [props.src];
      return list[state.currentPreviewIndex] || props.src;
    };

    const imageStyle = () => {
      const style: Record<string, string> = {
        objectFit: props.fit,
      };
      if (props.width) style.width = props.width;
      if (props.height) style.height = props.height;
      return style;
    };

    onMounted(() => {
      document.addEventListener('keydown', handleKeydown);
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    });

    return {
      state, handleLoad, handleError, handleImageClick,
      closePreview, handleMaskClick, currentPreviewSrc, imageStyle,
    };
  },

  template: `
    <div class="lyt-image {preview ? 'lyt-image--preview' : ''} {state.isError ? 'lyt-image--error' : ''}">
      <img
        class="lyt-image__inner"
        :src="state.isError && fallback ? fallback : src"
        :alt="alt"
        :style="imageStyle()"
        :loading="lazy ? 'lazy' : 'eager'"
        @load="handleLoad"
        @error="handleError"
        @click="handleImageClick"
      />
      <div class="lyt-image__placeholder" v-if="!state.isLoaded && !state.isError">
        <svg viewBox="0 0 1024 1024" width="32" height="32" fill="currentColor">
          <path d="M864 260H728l-32.4-90.8a32.07 32.07 0 0 0-30.2-21.2H358.6a32.07 32.07 0 0 0-30.2 21.2L296 260H160c-44.2 0-80 35.8-80 80v456c0 44.2 35.8 80 80 80h704c44.2 0 80-35.8 80-80V340c0-44.2-35.8-80-80-80zM512 716c-118.6 0-216-96.4-216-216 0-118.6 96.4-216 216-216 118.6 0 216 96.4 216 216 0 118.6-96.4 216-216 216zm0-368c-83.8 0-152 68.2-152 152s68.2 152 152 152 152-68.2 152-152-68.2-152-152-152z"/>
        </svg>
      </div>
      <div class="lyt-image-viewer" v-if="state.isPreviewVisible">
        <div class="lyt-image-viewer__mask" @click="handleMaskClick"></div>
        <div class="lyt-image-viewer__content">
          <img class="lyt-image-viewer__img" :src="currentPreviewSrc()" :alt="alt" />
          <span class="lyt-image-viewer__close" @click="closePreview">&times;</span>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-image {
      display: inline-block;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }
    .lyt-image__inner {
      display: block;
      width: 100%;
      height: 100%;
      transition: opacity 0.3s;
    }
    .lyt-image--preview {
      cursor: pointer;
    }
    .lyt-image--preview:hover .lyt-image__inner {
      opacity: 0.85;
    }
    .lyt-image--error .lyt-image__inner {
      opacity: 0.5;
    }
    .lyt-image__placeholder {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--lyt-color-bg);
      color: var(--lyt-color-info);
    }
    .lyt-image-viewer {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 3000;
    }
    .lyt-image-viewer__mask {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      animation: lyt-viewer-fade-in 0.3s;
    }
    @keyframes lyt-viewer-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .lyt-image-viewer__content {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lyt-image-viewer__img {
      max-width: 90vw;
      max-height: 90vh;
      object-fit: contain;
      border-radius: var(--lyt-radius-sm);
      animation: lyt-viewer-zoom-in 0.3s;
    }
    @keyframes lyt-viewer-zoom-in {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .lyt-image-viewer__close {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: #fff;
      cursor: pointer;
      border-radius: 50%;
      background-color: rgba(0, 0, 0, 0.5);
      transition: background-color 0.3s;
    }
    .lyt-image-viewer__close:hover {
      background-color: rgba(0, 0, 0, 0.7);
    }
  `,
});
