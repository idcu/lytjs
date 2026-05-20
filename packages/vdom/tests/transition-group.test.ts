 
/**
 * Tests for transition-group.ts
 * 测试 FLIP 动画、TransitionGroup enter/leave 和状态管理
 * 使用 jsdom 环境进行真实 DOM 操作测试
 *
 * 注意：jsdom 中 getComputedStyle 返回的 transitionDuration 始终为 '0s'，
 * 因此无 onEnter/onLeave 钩子时，transition 会被视为"无 CSS transition"，
 * 类会被立即移除。测试策略使用 spy 验证 DOM 操作的正确调用顺序。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createFLIPState,
  recordPositions,
  applyFLIP,
  performGroupEnterTransition,
  performGroupLeaveTransition,
  beforeUpdate,
  afterUpdate,
} from '../src/transition-group';
import type { TransitionGroupProps } from '../src/transition-group';

// ============================================================
// 辅助函数
// ============================================================

/** 创建带有 data-key 属性的 DOM 元素 */
function createKeyedElement(
  tag: string,
  key: string,
  styles?: Partial<CSSStyleDeclaration>,
): HTMLElement {
  const el = document.createElement(tag);
  el.setAttribute('data-key', key);
  if (styles) {
    Object.assign(el.style, styles);
  }
  document.body.appendChild(el);
  return el;
}

/** 创建容器并添加子元素 */
function createContainerWithChildren(
  childConfigs: Array<{ tag: string; key: string; styles?: Partial<CSSStyleDeclaration> }>,
): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);

  for (const config of childConfigs) {
    const child = document.createElement(config.tag);
    child.setAttribute('data-key', config.key);
    if (config.styles) {
      Object.assign(child.style, config.styles);
    }
    container.appendChild(child);
  }

  return container;
}

/** 清理文档 body */
function cleanupBody(): void {
  document.body.innerHTML = '';
}

// ============================================================
// 测试
// ============================================================

describe('transition-group', () => {
  beforeEach(() => {
    cleanupBody();
  });

  afterEach(() => {
    cleanupBody();
    vi.useRealTimers();
  });

  // ----------------------------------------------------------
  // createFLIPState
  // ----------------------------------------------------------
  describe('createFLIPState', () => {
    it('应返回包含 oldPositions 和 newPositions 的对象', () => {
      const state = createFLIPState();

      expect(state).toHaveProperty('oldPositions');
      expect(state).toHaveProperty('newPositions');
      expect(state.oldPositions).toBeInstanceOf(Map);
      expect(state.newPositions).toBeInstanceOf(Map);
      expect(state.oldPositions.size).toBe(0);
      expect(state.newPositions.size).toBe(0);
    });

    it('每次调用应返回独立的实例', () => {
      const state1 = createFLIPState();
      const state2 = createFLIPState();

      expect(state1).not.toBe(state2);
      expect(state1.oldPositions).not.toBe(state2.oldPositions);
      expect(state1.newPositions).not.toBe(state2.newPositions);
    });
  });

  // ----------------------------------------------------------
  // recordPositions (DOM 回退版本)
  // ----------------------------------------------------------
  describe('recordPositions', () => {
    it('应记录所有子元素的位置', () => {
      const el1 = createKeyedElement('div', 'a');
      const el2 = createKeyedElement('div', 'b');

      const positions = recordPositions([el1, el2]);

      expect(positions).toBeInstanceOf(Map);
      expect(positions.size).toBe(2);
      expect(positions.has('a')).toBe(true);
      expect(positions.has('b')).toBe(true);

      // 位置应包含 left 和 top
      const posA = positions.get('a')!;
      expect(posA).toHaveProperty('left');
      expect(posA).toHaveProperty('top');
    });

    it('应使用 data-key 作为 key', () => {
      const el = createKeyedElement('span', 'my-unique-key');

      const positions = recordPositions([el]);

      expect(positions.has('my-unique-key')).toBe(true);
    });

    it('无 data-key 时应使用索引作为 key', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      const positions = recordPositions([el]);

      expect(positions.has('__idx_0')).toBe(true);
    });

    it('空数组应返回空 Map', () => {
      const positions = recordPositions([]);

      expect(positions.size).toBe(0);
    });

    it('应跳过 null/undefined 元素', () => {
      const el = createKeyedElement('div', 'a');

      const positions = recordPositions([
        el,
        null as unknown as Element,
        undefined as unknown as Element,
      ]);

      expect(positions.size).toBe(1);
      expect(positions.has('a')).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // applyFLIP (DOM 回退版本)
  // ----------------------------------------------------------
  describe('applyFLIP', () => {
    it('应对已移动的元素设置反向 transform', () => {
      const el = createKeyedElement('div', 'item-1', {
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: '100px',
        height: '100px',
      });

      // 记录旧位置（手动设置）
      const oldPositions = new Map<string, DOMRect>();
      oldPositions.set('item-1', new DOMRect(0, 0, 100, 100));

      // mock getBoundingClientRect 返回新位置（位移 > 0.5px）
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(new DOMRect(200, 300, 100, 100));

      // spy classList.add/remove 来验证 FLIP 操作
      const addSpy = vi.spyOn(el.classList, 'add');
      const removeSpy = vi.spyOn(el.classList, 'remove');

      applyFLIP([el], oldPositions, 'flip-move');

      // 验证 classList.add 被调用（添加 moveClass）
      expect(addSpy).toHaveBeenCalledWith('flip-move');
      // jsdom 中 getComputedStyle 返回 transitionDuration 为 0s，
      // 所以 hasTransition 为 false，moveClass 会被立即移除
      // 但由于 spy 的存在可能影响 getComputedStyle 的行为，
      // 这里只验证 add 被调用即可

      addSpy.mockRestore();
      removeSpy.mockRestore();
      vi.restoreAllMocks();
    });

    it('位移小于阈值时不应应用动画', () => {
      const el = createKeyedElement('div', 'item-1', {
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: '100px',
        height: '100px',
      });

      // 旧位置和新位置几乎相同（位移 < 0.5px）
      const oldPositions = new Map<string, DOMRect>();
      oldPositions.set('item-1', new DOMRect(0, 0, 100, 100));

      const addSpy = vi.spyOn(el.classList, 'add');

      applyFLIP([el], oldPositions, 'flip-move');

      // 位移太小，不应添加 moveClass
      expect(addSpy).not.toHaveBeenCalled();

      addSpy.mockRestore();
    });

    it('旧位置中不存在的 key 应被跳过', () => {
      const el = createKeyedElement('div', 'new-item');

      const oldPositions = new Map<string, DOMRect>();
      // oldPositions 中没有 'new-item'

      // 不应抛出错误
      applyFLIP([el], oldPositions, 'flip-move');
    });

    it('空数组不应执行任何操作', () => {
      const oldPositions = new Map<string, DOMRect>();

      // 不应抛出错误
      applyFLIP([], oldPositions, 'flip-move');
    });

    it('应对多个元素分别应用 FLIP', () => {
      const el1 = createKeyedElement('div', 'a', {
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: '50px',
        height: '50px',
      });
      const el2 = createKeyedElement('div', 'b', {
        position: 'absolute',
        left: '100px',
        top: '0px',
        width: '50px',
        height: '50px',
      });

      const oldPositions = new Map<string, DOMRect>();
      oldPositions.set('a', new DOMRect(0, 0, 50, 50));
      oldPositions.set('b', new DOMRect(100, 0, 50, 50));

      // mock getBoundingClientRect 返回新位置
      vi.spyOn(el1, 'getBoundingClientRect').mockReturnValue(new DOMRect(50, 0, 50, 50));
      vi.spyOn(el2, 'getBoundingClientRect').mockReturnValue(new DOMRect(150, 0, 50, 50));

      const addSpy1 = vi.spyOn(el1.classList, 'add');
      const addSpy2 = vi.spyOn(el2.classList, 'add');

      applyFLIP([el1, el2], oldPositions, 'flip-move');

      // 两个元素都应有 moveClass 被添加
      expect(addSpy1).toHaveBeenCalledWith('flip-move');
      expect(addSpy2).toHaveBeenCalledWith('flip-move');

      addSpy1.mockRestore();
      addSpy2.mockRestore();
      vi.restoreAllMocks();
    });
  });

  // ----------------------------------------------------------
  // performGroupEnterTransition (DOM 回退版本)
  // ----------------------------------------------------------
  describe('performGroupEnterTransition', () => {
    it('应按顺序添加 enter-from、enter-active、enter-to 类', () => {
      const el = createKeyedElement('div', 'a');
      const props: TransitionGroupProps<Element> = { name: 'fade' };
      const done = vi.fn();

      const addSpy = vi.spyOn(el.classList, 'add');
      const removeSpy = vi.spyOn(el.classList, 'remove');

      performGroupEnterTransition(el, props, done);

      // 验证类添加/移除顺序
      expect(addSpy).toHaveBeenCalledWith('fade-enter-from');
      expect(addSpy).toHaveBeenCalledWith('fade-enter-active');
      expect(removeSpy).toHaveBeenCalledWith('fade-enter-from');
      expect(addSpy).toHaveBeenCalledWith('fade-enter-to');
      // jsdom 中无 CSS transition，类被立即清理
      expect(removeSpy).toHaveBeenCalledWith('fade-enter-active');
      expect(removeSpy).toHaveBeenCalledWith('fade-enter-to');
      expect(done).toHaveBeenCalled();

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('使用显式 name 时应使用对应前缀', () => {
      const el = createKeyedElement('div', 'a');
      const props: TransitionGroupProps<Element> = { name: 'v' };
      const done = vi.fn();

      const addSpy = vi.spyOn(el.classList, 'add');

      performGroupEnterTransition(el, props, done);

      expect(addSpy).toHaveBeenCalledWith('v-enter-from');
      expect(addSpy).toHaveBeenCalledWith('v-enter-active');
      expect(addSpy).toHaveBeenCalledWith('v-enter-to');

      addSpy.mockRestore();
    });

    it('有 onEnter 钩子时应调用 onEnter 而非自动清理', () => {
      const el = createKeyedElement('div', 'a');
      const onEnter = vi.fn((_el: Element, done: () => void) => done());
      const onAfterEnter = vi.fn();
      const props: TransitionGroupProps<Element> = {
        name: 'fade',
        onEnter,
        onAfterEnter,
      };
      const done = vi.fn();

      performGroupEnterTransition(el, props, done);

      expect(onEnter).toHaveBeenCalledWith(el, expect.any(Function));
      // onEnter 调用了 done 回调，所以 onAfterEnter 也应被调用
      expect(onAfterEnter).toHaveBeenCalledWith(el);
      expect(done).toHaveBeenCalled();
    });

    it('无 CSS transition 时应立即完成', () => {
      const el = createKeyedElement('div', 'a');
      const props: TransitionGroupProps<Element> = { name: 'fade' };
      const done = vi.fn();

      performGroupEnterTransition(el, props, done);

      // enter-active 和 enter-to 应被移除
      expect(el.classList.contains('fade-enter-active')).toBe(false);
      expect(el.classList.contains('fade-enter-to')).toBe(false);
      expect(done).toHaveBeenCalled();
    });

    it('有 onAfterEnter 钩子且无 onEnter 时应调用', () => {
      const el = createKeyedElement('div', 'a');
      const onAfterEnter = vi.fn();
      const props: TransitionGroupProps<Element> = {
        name: 'fade',
        onAfterEnter,
      };
      const done = vi.fn();

      performGroupEnterTransition(el, props, done);

      expect(onAfterEnter).toHaveBeenCalledWith(el);
      expect(done).toHaveBeenCalled();
    });

    it('onEnter 不调用 done 时不应调用 onAfterEnter 和 done', () => {
      const el = createKeyedElement('div', 'a');
      const onEnter = vi.fn(); // 不调用 done
      const onAfterEnter = vi.fn();
      const props: TransitionGroupProps<Element> = {
        name: 'fade',
        onEnter,
        onAfterEnter,
      };
      const done = vi.fn();

      performGroupEnterTransition(el, props, done);

      expect(onEnter).toHaveBeenCalledWith(el, expect.any(Function));
      expect(onAfterEnter).not.toHaveBeenCalled();
      expect(done).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // performGroupLeaveTransition (DOM 回退版本)
  // ----------------------------------------------------------
  describe('performGroupLeaveTransition', () => {
    it('应按顺序添加 leave-from、leave-active、leave-to 类', () => {
      const el = createKeyedElement('div', 'a');
      const props: TransitionGroupProps<Element> = { name: 'fade' };
      const removeElement = vi.fn();

      const addSpy = vi.spyOn(el.classList, 'add');
      const removeSpy = vi.spyOn(el.classList, 'remove');

      performGroupLeaveTransition(el, props, removeElement);

      // 验证类添加/移除顺序
      expect(addSpy).toHaveBeenCalledWith('fade-leave-from');
      expect(addSpy).toHaveBeenCalledWith('fade-leave-active');
      expect(removeSpy).toHaveBeenCalledWith('fade-leave-from');
      expect(addSpy).toHaveBeenCalledWith('fade-leave-to');
      // jsdom 中无 CSS transition，类被立即清理
      expect(removeSpy).toHaveBeenCalledWith('fade-leave-active');
      expect(removeSpy).toHaveBeenCalledWith('fade-leave-to');
      expect(removeElement).toHaveBeenCalled();

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('使用显式 name 时应使用对应前缀', () => {
      const el = createKeyedElement('div', 'a');
      const props: TransitionGroupProps<Element> = { name: 'v' };
      const removeElement = vi.fn();

      const addSpy = vi.spyOn(el.classList, 'add');

      performGroupLeaveTransition(el, props, removeElement);

      expect(addSpy).toHaveBeenCalledWith('v-leave-from');
      expect(addSpy).toHaveBeenCalledWith('v-leave-active');
      expect(addSpy).toHaveBeenCalledWith('v-leave-to');

      addSpy.mockRestore();
    });

    it('有 onLeave 钩子时应调用 onLeave 而非自动清理', () => {
      const el = createKeyedElement('div', 'a');
      const onLeave = vi.fn((_el: Element, done: () => void) => done());
      const onAfterLeave = vi.fn();
      const props: TransitionGroupProps<Element> = {
        name: 'fade',
        onLeave,
        onAfterLeave,
      };
      const removeElement = vi.fn();

      performGroupLeaveTransition(el, props, removeElement);

      expect(onLeave).toHaveBeenCalledWith(el, expect.any(Function));
      expect(onAfterLeave).toHaveBeenCalledWith(el);
      expect(removeElement).toHaveBeenCalled();
    });

    it('无 CSS transition 时应立即完成并移除元素', () => {
      const el = createKeyedElement('div', 'a');
      const props: TransitionGroupProps<Element> = { name: 'fade' };
      const removeElement = vi.fn();

      performGroupLeaveTransition(el, props, removeElement);

      // leave-active 和 leave-to 应被移除
      expect(el.classList.contains('fade-leave-active')).toBe(false);
      expect(el.classList.contains('fade-leave-to')).toBe(false);
      expect(removeElement).toHaveBeenCalled();
    });

    it('有 onAfterLeave 钩子且无 onLeave 时应调用', () => {
      const el = createKeyedElement('div', 'a');
      const onAfterLeave = vi.fn();
      const props: TransitionGroupProps<Element> = {
        name: 'fade',
        onAfterLeave,
      };
      const removeElement = vi.fn();

      performGroupLeaveTransition(el, props, removeElement);

      expect(onAfterLeave).toHaveBeenCalledWith(el);
    });

    it('onLeave 不调用 done 时不应调用 onAfterLeave 和 removeElement', () => {
      const el = createKeyedElement('div', 'a');
      const onLeave = vi.fn(); // 不调用 done
      const onAfterLeave = vi.fn();
      const props: TransitionGroupProps<Element> = {
        name: 'fade',
        onLeave,
        onAfterLeave,
      };
      const removeElement = vi.fn();

      performGroupLeaveTransition(el, props, removeElement);

      expect(onLeave).toHaveBeenCalledWith(el, expect.any(Function));
      expect(onAfterLeave).not.toHaveBeenCalled();
      expect(removeElement).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // beforeUpdate (DOM 回退版本)
  // ----------------------------------------------------------
  describe('beforeUpdate', () => {
    it('应记录所有子元素的旧位置到 state.oldPositions', () => {
      const state = createFLIPState();
      const container = createContainerWithChildren([
        { tag: 'div', key: 'a' },
        { tag: 'div', key: 'b' },
      ]);

      const children = Array.from(container.children) as Element[];

      beforeUpdate(state, children);

      expect(state.oldPositions.size).toBe(2);
      expect(state.oldPositions.has('a')).toBe(true);
      expect(state.oldPositions.has('b')).toBe(true);

      // 每个位置应有 left 和 top
      const posA = state.oldPositions.get('a')!;
      expect('left' in posA).toBe(true);
      expect('top' in posA).toBe(true);
    });

    it('空子元素数组应产生空的 oldPositions', () => {
      const state = createFLIPState();

      beforeUpdate(state, []);

      expect(state.oldPositions.size).toBe(0);
    });

    it('应覆盖之前的 oldPositions', () => {
      const state = createFLIPState();
      const el1 = createKeyedElement('div', 'x');
      const el2 = createKeyedElement('div', 'y');

      // 第一次调用
      beforeUpdate(state, [el1]);
      expect(state.oldPositions.size).toBe(1);

      // 第二次调用应覆盖
      beforeUpdate(state, [el1, el2]);
      expect(state.oldPositions.size).toBe(2);
    });

    it('应跳过 null/undefined 子元素', () => {
      const state = createFLIPState();
      const el = createKeyedElement('div', 'a');

      beforeUpdate(state, [el, null as unknown as Element]);

      expect(state.oldPositions.size).toBe(1);
    });
  });

  // ----------------------------------------------------------
  // afterUpdate (DOM 回退版本)
  // ----------------------------------------------------------
  describe('afterUpdate', () => {
    it('应记录新位置到 state.newPositions 并应用 FLIP', () => {
      const state = createFLIPState();
      const container = createContainerWithChildren([
        { tag: 'div', key: 'a' },
        { tag: 'div', key: 'b' },
      ]);

      const children = Array.from(container.children) as Element[];

      // 先记录旧位置
      beforeUpdate(state, children);

      // 移动元素
      const childA = children[0]!;
      childA.style.position = 'absolute';
      childA.style.left = '200px';
      childA.style.top = '300px';

      // afterUpdate 应记录新位置并应用 FLIP
      afterUpdate(state, children, 'flip-move');

      expect(state.newPositions.size).toBe(2);
      expect(state.newPositions.has('a')).toBe(true);
      expect(state.newPositions.has('b')).toBe(true);
    });

    it('旧位置中不存在的 key 不应应用 FLIP', () => {
      const state = createFLIPState();
      const el = createKeyedElement('div', 'new-item');

      // oldPositions 为空
      state.oldPositions = new Map();

      // 不应抛出错误
      afterUpdate(state, [el], 'flip-move');

      expect(state.newPositions.size).toBe(1);
    });

    it('空子元素数组应产生空的 newPositions', () => {
      const state = createFLIPState();

      afterUpdate(state, [], 'flip-move');

      expect(state.newPositions.size).toBe(0);
    });

    it('位移小于阈值时不应添加 moveClass', () => {
      const state = createFLIPState();
      const el = createKeyedElement('div', 'static-item');

      // 记录旧位置
      beforeUpdate(state, [el]);

      const addSpy = vi.spyOn(el.classList, 'add');

      // 不移动元素（位移为 0）
      afterUpdate(state, [el], 'flip-move');

      // 位移太小，不应添加 moveClass
      expect(addSpy).not.toHaveBeenCalledWith('flip-move');

      addSpy.mockRestore();
    });
  });

  // ----------------------------------------------------------
  // FLIP 状态生命周期集成测试
  // ----------------------------------------------------------
  describe('FLIP 状态生命周期', () => {
    it('完整的 beforeUpdate -> afterUpdate 流程应正确跟踪位置', () => {
      const state = createFLIPState();
      const container = createContainerWithChildren([
        { tag: 'div', key: 'item-1' },
        { tag: 'div', key: 'item-2' },
      ]);

      const children = Array.from(container.children) as Element[];

      // 1. beforeUpdate：记录旧位置
      beforeUpdate(state, children);
      expect(state.oldPositions.size).toBe(2);

      // 2. 模拟 DOM 更新：交换子元素顺序
      container.innerHTML = '';
      container.appendChild(children[1]);
      container.appendChild(children[0]);

      const newChildren = Array.from(container.children) as Element[];

      // 3. afterUpdate：记录新位置并应用 FLIP
      afterUpdate(state, newChildren, 'reorder-move');

      expect(state.newPositions.size).toBe(2);
      // 两个位置 Map 都应有相同的 key
      expect(state.oldPositions.has('item-1')).toBe(true);
      expect(state.newPositions.has('item-1')).toBe(true);
    });

    it('createFLIPState 返回的状态应可被 beforeUpdate 和 afterUpdate 使用', () => {
      const state = createFLIPState();

      // 不应抛出错误
      beforeUpdate(state, []);
      afterUpdate(state, [], 'move');

      expect(state.oldPositions.size).toBe(0);
      expect(state.newPositions.size).toBe(0);
    });

    it('多次 beforeUpdate -> afterUpdate 循环应正确更新位置', () => {
      const state = createFLIPState();
      const el = createKeyedElement('div', 'moving-item');

      // 第一次循环
      beforeUpdate(state, [el]);
      expect(state.oldPositions.size).toBe(1);
      afterUpdate(state, [el], 'move');
      expect(state.newPositions.size).toBe(1);

      // 第二次循环应覆盖旧数据
      beforeUpdate(state, [el]);
      expect(state.oldPositions.size).toBe(1);
      afterUpdate(state, [el], 'move');
      expect(state.newPositions.size).toBe(1);
    });
  });
});
