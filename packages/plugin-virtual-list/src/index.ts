// Lyt.js 虚拟列表插件
//
// 用法：
//   import { createVirtualList } from '@lytjs/plugin-virtual-list'
//
//   const list = createVirtualList(document.getElementById('list'), {
//     items: Array.from({ length: 10000 }, (_, i) => ({
//       id: i,
//       text: `Item ${i}`,
//     })),
//     itemHeight: 40,
//     renderItem: (item) => `<div class="item">${item.text}</div>`,
//   })
//
//   // 更新数据
//   list.setItems(newItems)
//
//   // 滚动到指定索引
//   list.scrollToIndex(500)
//
//   // 销毁
//   list.destroy()

// ======================== 类型定义 ========================

/** 列表项数据 */
interface VirtualListItem {
  /** 唯一标识 */
  id: string | number;
  /** 其他数据 */
  [key: string]: unknown;
}

/** 渲染函数 */
type RenderItemFn<T extends VirtualListItem = VirtualListItem> = (
  item: T,
  index: number
) => string;

/** 虚拟列表配置选项 */
interface VirtualListOptions<T extends VirtualListItem = VirtualListItem> {
  /** 数据列表 */
  items: T[];
  /** 每项固定高度（像素），与 estimateHeight 二选一 */
  itemHeight?: number;
  /** 每项预估高度（像素），用于动态高度模式 */
  estimateHeight?: number;
  /** 渲染函数，返回 HTML 字符串 */
  renderItem: RenderItemFn<T>;
  /** 容器高度（像素），默认 400 */
  height?: number;
  /** 上下缓冲区项数，默认 5 */
  bufferSize?: number;
  /** 容器 CSS 类名 */
  containerClass?: string;
  /** 滚动事件回调 */
  onScroll?: (scrollOffset: number) => void;
  /** 滚动到底部回调 */
  onReachBottom?: () => void;
  /** 距底部多少像素触发 onReachBottom，默认 50 */
  reachBottomThreshold?: number;
  /** 每项是否唯一 key，默认使用 id 字段 */
  keyField?: string;
}

/** 虚拟列表实例 */
interface VirtualListInstance<T extends VirtualListItem = VirtualListItem> {
  /** 更新数据列表 */
  setItems(items: T[]): void;
  /** 滚动到指定索引 */
  scrollToIndex(index: number, align?: 'top' | 'center' | 'bottom'): void;
  /** 滚动到指定位置（像素） */
  scrollTo(scrollTop: number): void;
  /** 获取当前可见范围 */
  getVisibleRange(): { start: number; end: number };
  /** 获取当前滚动偏移 */
  getScrollTop(): number;
  /** 强制重新渲染 */
  forceUpdate(): void;
  /** 获取容器元素 */
  getContainer(): HTMLElement;
  /** 销毁虚拟列表 */
  destroy(): void;
}

// ======================== 内部工具 ========================

/** 默认缓冲区大小 */
const DEFAULT_BUFFER_SIZE = 5;
/** 默认容器高度 */
const DEFAULT_HEIGHT = 400;
/** 默认预估项高度 */
const DEFAULT_ESTIMATE_HEIGHT = 50;
/** 默认触底阈值 */
const DEFAULT_REACH_BOTTOM_THRESHOLD = 50;

/**
 * 二分查找：找到第一个累加高度 >= target 的索引
 */
function bisect(
  positions: number[],
  target: number,
  count: number
): number {
  let low = 0;
  let high = count;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (positions[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

// ======================== 核心实现 ========================

/**
 * 创建虚拟列表实例
 *
 * @param container - 容器元素
 * @param options - 虚拟列表配置
 * @returns 虚拟列表实例
 */
function createVirtualList<T extends VirtualListItem = VirtualListItem>(
  container: HTMLElement,
  options: VirtualListOptions<T>
): VirtualListInstance<T> {
  // 配置
  const {
    itemHeight: fixedHeight,
    estimateHeight = DEFAULT_ESTIMATE_HEIGHT,
    renderItem,
    height = DEFAULT_HEIGHT,
    bufferSize = DEFAULT_BUFFER_SIZE,
    containerClass = '',
    onScroll,
    onReachBottom,
    reachBottomThreshold = DEFAULT_REACH_BOTTOM_THRESHOLD,
    keyField = 'id',
  } = options;

  // 状态
  let items: T[] = [...options.items];
  const isFixedHeight = fixedHeight !== undefined && fixedHeight > 0;
  const itemH = isFixedHeight ? fixedHeight! : estimateHeight;

  // 动态高度缓存
  const measuredHeights: Map<number, number> = new Map();
  const cachedPositions: number[] = [0]; // cachedPositions[i] = 第 i 项的 top 偏移

  // DOM 元素
  let scrollContainer: HTMLElement;
  let phantom: HTMLElement;
  let content: HTMLElement;

  let destroyed = false;
  let lastScrollTop = -1;
  let rafId: number | null = null;

  // ---- 初始化 DOM ----

  function initDOM(): void {
    // 滚动容器
    scrollContainer = document.createElement('div');
    scrollContainer.style.cssText = `
      position: relative;
      overflow-y: auto;
      overflow-x: hidden;
      height: ${height}px;
      -webkit-overflow-scrolling: touch;
    `;
    if (containerClass) {
      scrollContainer.className = containerClass;
    }

    // 占位元素（撑开总高度）
    phantom = document.createElement('div');
    phantom.style.cssText = 'position: absolute; left: 0; top: 0; right: 0; z-index: -1;';

    // 内容容器
    content = document.createElement('div');
    content.style.cssText = 'position: absolute; left: 0; right: 0; top: 0;';

    scrollContainer.appendChild(phantom);
    scrollContainer.appendChild(content);
    container.appendChild(scrollContainer);

    // 绑定滚动事件
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
  }

  // ---- 位置计算 ----

  function getTotalHeight(): number {
    if (isFixedHeight) {
      return items.length * itemH;
    }
    return getCachedPosition(items.length);
  }

  function getCachedPosition(index: number): number {
    if (isFixedHeight) {
      return index * itemH;
    }

    // 确保缓存足够长
    while (cachedPositions.length <= index) {
      const i = cachedPositions.length - 1;
      const h = measuredHeights.get(i) || itemH;
      cachedPositions.push(cachedPositions[i] + h);
    }

    return cachedPositions[index];
  }

  function getItemTop(index: number): number {
    return getCachedPosition(index);
  }

  function getItemHeight(index: number): number {
    if (isFixedHeight) return itemH;
    return measuredHeights.get(index) || itemH;
  }

  // ---- 渲染 ----

  function render(): void {
    if (destroyed) return;

    const scrollTop = scrollContainer.scrollTop;
    const viewHeight = scrollContainer.clientHeight;

    // 计算可见范围
    let startIdx: number;
    let endIdx: number;

    if (isFixedHeight) {
      startIdx = Math.floor(scrollTop / itemH);
      endIdx = Math.ceil((scrollTop + viewHeight) / itemH);
    } else {
      startIdx = bisect(cachedPositions, scrollTop, items.length);
      // 从 startIdx 向后查找 endIdx
      endIdx = startIdx;
      while (endIdx < items.length && getCachedPosition(endIdx) < scrollTop + viewHeight) {
        endIdx++;
      }
    }

    // 应用缓冲区
    startIdx = Math.max(0, startIdx - bufferSize);
    endIdx = Math.min(items.length, endIdx + bufferSize);

    // 更新占位元素高度
    const totalHeight = getTotalHeight();
    phantom.style.height = totalHeight + 'px';

    // 计算内容偏移
    const contentTop = getItemTop(startIdx);
    content.style.transform = `translateY(${contentTop}px)`;

    // 渲染可见项
    let html = '';
    for (let i = startIdx; i < endIdx; i++) {
      const item = items[i];
      if (!item) continue;
      const h = getItemHeight(i);
      html += `<div data-index="${i}" style="height:${h}px;overflow:hidden;">${renderItem(item, i)}</div>`;
    }
    content.innerHTML = html;

    // 测量动态高度
    if (!isFixedHeight) {
      measureItems(startIdx, endIdx);
    }

    // 检查是否触底
    if (onReachBottom && scrollTop + viewHeight >= totalHeight - reachBottomThreshold) {
      onReachBottom();
    }
  }

  function measureItems(startIdx: number, endIdx: number): void {
    const children = content.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      const idx = parseInt(child.dataset.index || '0', 10);
      if (idx < startIdx || idx >= endIdx) continue;

      const measured = child.offsetHeight;
      const cached = measuredHeights.get(idx);

      if (cached !== measured) {
        measuredHeights.set(idx, measured);
        // 更新位置缓存
        if (cachedPositions[idx + 1] !== undefined) {
          const diff = measured - (cached || itemH);
          for (let j = idx + 1; j < cachedPositions.length; j++) {
            cachedPositions[j] += diff;
          }
        }
      }
    }
  }

  // ---- 滚动处理 ----

  function handleScroll(): void {
    if (destroyed) return;

    const scrollTop = scrollContainer.scrollTop;

    if (onScroll) {
      onScroll(scrollTop);
    }

    // 使用 RAF 节流
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (lastScrollTop !== scrollTop) {
        lastScrollTop = scrollTop;
        render();
      }
    });
  }

  // ---- 公共 API ----

  function setItems(newItems: T[]): void {
    items = [...newItems];
    // 清除高度缓存
    measuredHeights.clear();
    cachedPositions.length = 1;
    lastScrollTop = -1;
    render();
  }

  function scrollToIndex(index: number, align: 'top' | 'center' | 'bottom' = 'top'): void {
    if (index < 0 || index >= items.length) return;

    let top: number;
    if (align === 'top') {
      top = getItemTop(index);
    } else if (align === 'center') {
      top = getItemTop(index) - scrollContainer.clientHeight / 2 + getItemHeight(index) / 2;
    } else {
      top = getItemTop(index) - scrollContainer.clientHeight + getItemHeight(index);
    }

    scrollContainer.scrollTop = Math.max(0, top);
    lastScrollTop = -1;
    render();
  }

  function scrollTo(scrollTop: number): void {
    scrollContainer.scrollTop = Math.max(0, scrollTop);
    lastScrollTop = -1;
    render();
  }

  function getVisibleRange(): { start: number; end: number } {
    const scrollTop = scrollContainer.scrollTop;
    const viewHeight = scrollContainer.clientHeight;

    let startIdx: number;
    let endIdx: number;

    if (isFixedHeight) {
      startIdx = Math.floor(scrollTop / itemH);
      endIdx = Math.ceil((scrollTop + viewHeight) / itemH);
    } else {
      startIdx = bisect(cachedPositions, scrollTop, items.length);
      endIdx = startIdx;
      while (endIdx < items.length && getCachedPosition(endIdx) < scrollTop + viewHeight) {
        endIdx++;
      }
    }

    return {
      start: Math.max(0, startIdx - bufferSize),
      end: Math.min(items.length, endIdx + bufferSize),
    };
  }

  function getScrollTop(): number {
    return scrollContainer.scrollTop;
  }

  function forceUpdate(): void {
    measuredHeights.clear();
    cachedPositions.length = 1;
    lastScrollTop = -1;
    render();
  }

  function getContainer(): HTMLElement {
    return scrollContainer;
  }

  function destroy(): void {
    destroyed = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    scrollContainer.removeEventListener('scroll', handleScroll);
    if (container.contains(scrollContainer)) {
      container.removeChild(scrollContainer);
    }
    measuredHeights.clear();
    cachedPositions.length = 0;
  }

  // ---- 初始化 ----
  initDOM();
  render();

  return {
    setItems,
    scrollToIndex,
    scrollTo,
    getVisibleRange,
    getScrollTop,
    forceUpdate,
    getContainer,
    destroy,
  };
}

export { createVirtualList };
export type {
  VirtualListItem,
  RenderItemFn,
  VirtualListOptions,
  VirtualListInstance,
};
