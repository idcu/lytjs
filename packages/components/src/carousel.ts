/**
 * Carousel 轮播图组件
 * Props: autoplay, interval, showDots, showArrows
 * Events: change
 * Slots: default, prev, next
 */

import { defineComponent, onMounted, onUnmounted } from '@lytjs/component'
import { ref, watch } from '@lytjs/reactivity'

export const Carousel = defineComponent({
  name: 'LytCarousel',

  props: {
    autoplay: {
      type: Boolean,
      default: true,
    },
    interval: {
      type: Number,
      default: 3000,
    },
    showDots: {
      type: Boolean,
      default: true,
    },
    showArrows: {
      type: Boolean,
      default: true,
    },
  },

  setup(props, { emit, slots }) {
    const currentIndex = ref(0)
    const slideCount = ref(0)
    let timer: any = null

    const goTo = (index: number) => {
      if (slideCount.value === 0) return
      let newIndex = index
      if (newIndex < 0) newIndex = slideCount.value - 1
      if (newIndex >= slideCount.value) newIndex = 0
      currentIndex.value = newIndex
      emit('change', newIndex)
    }

    const next = () => goTo(currentIndex.value + 1)
    const prev = () => goTo(currentIndex.value - 1)

    const startAutoplay = () => {
      if (!props.autoplay) return
      stopAutoplay()
      timer = setInterval(next, props.interval)
    }

    const stopAutoplay = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }

    onMounted(() => {
      const wrapper = document.querySelector('.lyt-carousel__wrapper')
      if (wrapper) {
        slideCount.value = wrapper.children.length
      }
      startAutoplay()
    })

    onUnmounted(() => stopAutoplay())

    watch(() => props.autoplay, () => {
      if (props.autoplay) startAutoplay()
      else stopAutoplay()
    })

    return { props, currentIndex, goTo, next, prev, slots }
  },

  template: `
    <div class="lyt-carousel">
      <div class="lyt-carousel__wrapper" style="transform: translateX(-{{ currentIndex * 100 }}%)">
        <slot></slot>
      </div>
      <div v-if="props.showArrows" class="lyt-carousel__arrows">
        <slot name="prev">
          <button class="lyt-carousel__arrow lyt-carousel__arrow--prev" @click="prev">
            <svg viewBox="0 0 1024 1024" width="1em" height="1em">
              <path d="M724 218.3L512 430.3 300 218.3 188 330.3l212 212 212 212 112-112-200-212z" />
            </svg>
          </button>
        </slot>
        <slot name="next">
          <button class="lyt-carousel__arrow lyt-carousel__arrow--next" @click="next">
            <svg viewBox="0 0 1024 1024" width="1em" height="1em">
              <path d="M300 805.7l212-212 212-212-112-112-212 212-212-212L188 473.7l212 212 212 212 112-112-200-212z" />
            </svg>
          </button>
        </slot>
      </div>
      <div v-if="props.showDots" class="lyt-carousel__dots">
        <span
          v-for="i in Array(slideCount).keys()"
          key="i"
          class="lyt-carousel__dot {{ currentIndex === i ? 'lyt-carousel__dot--active' : '' }}"
          @click="goTo(i)"
        ></span>
      </div>
    </div>
  `,

  styles: `
    .lyt-carousel {
      position: relative;
      overflow: hidden;
      width: 100%;
    }
    .lyt-carousel__wrapper {
      display: flex;
      transition: transform 0.3s ease-in-out;
    }
    .lyt-carousel__wrapper > * {
      flex-shrink: 0;
      width: 100%;
    }
    .lyt-carousel__arrows {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      transform: translateY(-50%);
      display: flex;
      justify-content: space-between;
      padding: 0 12px;
      pointer-events: none;
    }
    .lyt-carousel__arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: rgba(0, 0, 0, 0.5);
      color: white;
      border: none;
      cursor: pointer;
      pointer-events: auto;
      transition: background-color 0.2s;
    }
    .lyt-carousel__arrow:hover {
      background-color: rgba(0, 0, 0, 0.7);
    }
    .lyt-carousel__dots {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
    }
    .lyt-carousel__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      transition: background-color 0.2s, transform 0.2s;
    }
    .lyt-carousel__dot:hover {
      background-color: rgba(255, 255, 255, 0.8);
    }
    .lyt-carousel__dot--active {
      background-color: white;
      transform: scale(1.25);
    }
  `,
})
