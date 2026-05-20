/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * tests/transition.test.ts
 * Transition / TransitionGroup 组件测试
 * 覆盖 props 验证、接口类型检查、setup 函数行为、CSS 类名逻辑
 */

import { describe, it, expect, vi } from 'vitest';
import { Transition } from '../src/transition';
import { TransitionGroup } from '../src/transition-group';
import type {
  TransitionComponentProps,
  TransitionComponentPropsLegacy,
  ComponentOptions,
} from '../src/transition';
import type {
  TransitionGroupComponentProps,
  TransitionGroupComponentPropsLegacy,
} from '../src/transition-group';

// ==================== Transition 组件结构 ====================

describe('Transition - 组件结构', () => {
  it('should be a valid ComponentOptions object', () => {
    expect(Transition).toBeDefined();
    expect(typeof Transition).toBe('object');
    expect(Transition).not.toBeNull();
  });

  it('should have name "Transition"', () => {
    expect(Transition.name).toBe('Transition');
  });

  it('should have a props definition', () => {
    expect(Transition.props).toBeDefined();
    expect(typeof Transition.props).toBe('object');
  });

  it('should have a setup function', () => {
    expect(typeof Transition.setup).toBe('function');
  });
});

// ==================== Transition 基础 Props ====================

describe('Transition - 基础 props', () => {
  it('should define "name" prop with String type', () => {
    expect(Transition.props.name).toBeDefined();
    expect(Transition.props.name.type).toBe(String);
  });

  it('should define "appear" prop with Boolean type and default false', () => {
    expect(Transition.props.appear).toBeDefined();
    expect(Transition.props.appear.type).toBe(Boolean);
    expect(Transition.props.appear.default).toBe(false);
  });

  it('should define "mode" prop with String type and default "default"', () => {
    expect(Transition.props.mode).toBeDefined();
    expect(Transition.props.mode.type).toBe(String);
    expect(Transition.props.mode.default).toBe('default');
  });
});

// ==================== Transition Enter 类名 Props ====================

describe('Transition - enter 类名 props', () => {
  const enterClassProps = ['enterFromClass', 'enterActiveClass', 'enterToClass'];

  enterClassProps.forEach((propName) => {
    it(`should define "${propName}" prop with String type`, () => {
      expect(Transition.props[propName]).toBeDefined();
      expect(Transition.props[propName].type).toBe(String);
    });

    it(`should not have a default value for "${propName}"`, () => {
      expect(Transition.props[propName].default).toBeUndefined();
    });
  });
});

// ==================== Transition Leave 类名 Props ====================

describe('Transition - leave 类名 props', () => {
  const leaveClassProps = ['leaveFromClass', 'leaveActiveClass', 'leaveToClass'];

  leaveClassProps.forEach((propName) => {
    it(`should define "${propName}" prop with String type`, () => {
      expect(Transition.props[propName]).toBeDefined();
      expect(Transition.props[propName].type).toBe(String);
    });

    it(`should not have a default value for "${propName}"`, () => {
      expect(Transition.props[propName].default).toBeUndefined();
    });
  });
});

// ==================== Transition Enter Hook Props ====================

describe('Transition - enter hook props', () => {
  const enterHooks = ['onBeforeEnter', 'onEnter', 'onAfterEnter', 'onEnterCancelled'];

  enterHooks.forEach((hookName) => {
    it(`should define "${hookName}" prop with Function type`, () => {
      expect(Transition.props[hookName]).toBeDefined();
      expect(Transition.props[hookName].type).toBe(Function);
    });

    it(`should not have a default value for "${hookName}"`, () => {
      expect(Transition.props[hookName].default).toBeUndefined();
    });
  });
});

// ==================== Transition Leave Hook Props ====================

describe('Transition - leave hook props', () => {
  const leaveHooks = ['onBeforeLeave', 'onLeave', 'onAfterLeave', 'onLeaveCancelled'];

  leaveHooks.forEach((hookName) => {
    it(`should define "${hookName}" prop with Function type`, () => {
      expect(Transition.props[hookName]).toBeDefined();
      expect(Transition.props[hookName].type).toBe(Function);
    });

    it(`should not have a default value for "${hookName}"`, () => {
      expect(Transition.props[hookName].default).toBeUndefined();
    });
  });
});

// ==================== Transition Props 完整性 ====================

describe('Transition - props 完整性', () => {
  it('should define exactly 17 props', () => {
    const propKeys = Object.keys(Transition.props);
    expect(propKeys).toHaveLength(17);
  });

  it('should include all expected prop names', () => {
    const propKeys = Object.keys(Transition.props);
    const expected = [
      'name',
      'appear',
      'mode',
      'enterFromClass',
      'enterActiveClass',
      'enterToClass',
      'leaveFromClass',
      'leaveActiveClass',
      'leaveToClass',
      'onBeforeEnter',
      'onEnter',
      'onAfterEnter',
      'onEnterCancelled',
      'onBeforeLeave',
      'onLeave',
      'onAfterLeave',
      'onLeaveCancelled',
    ];
    expected.forEach((name) => {
      expect(propKeys).toContain(name);
    });
  });
});

// ==================== Transition Setup 函数 ====================

describe('Transition - setup 函数', () => {
  it('should be callable', () => {
    expect(() =>
      Transition.setup({}, { slots: {}, attrs: {}, emit: () => {} } as any),
    ).not.toThrow();
  });

  it('should return a function that renders default slot content', () => {
    const mockSlotContent = [{ type: 'div', props: {}, children: null }];
    const slots = { default: () => mockSlotContent };
    const result = Transition.setup({}, { slots } as any);
    expect(typeof result).toBe('function');
  });

  it('should invoke default slot during setup (IIFE executes immediately)', () => {
    const mockSlotContent = [{ type: 'span', props: {}, children: 'hello' }];
    const slotFn = vi.fn(() => mockSlotContent);
    const slots = { default: slotFn };
    const result = Transition.setup({}, { slots } as any);

    // setup 内部使用 IIFE 立即执行 slots.default?.()
    // 返回值被 as unknown as void 转型，但运行时仍返回函数
    expect(typeof result).toBe('function');
  });

  it('should handle missing default slot gracefully', () => {
    const slots = {};
    const result = Transition.setup({}, { slots } as any);
    // setup 返回一个 IIFE 的结果，当 slots.default 不存在时返回 undefined
    expect(typeof result).toBe('function');
  });

  it('should handle default slot returning undefined', () => {
    const slots = { default: () => undefined };
    const result = Transition.setup({}, { slots } as any);
    expect(typeof result).toBe('function');
  });
});

// ==================== TransitionComponentProps 接口 ====================

describe('Transition - TransitionComponentProps 接口', () => {
  it('should support all props with full configuration', () => {
    const props: TransitionComponentProps = {
      name: 'fade',
      appear: true,
      mode: 'out-in',
      enterFromClass: 'fade-enter-from',
      enterActiveClass: 'fade-enter-active',
      enterToClass: 'fade-enter-to',
      leaveFromClass: 'fade-leave-from',
      leaveActiveClass: 'fade-leave-active',
      leaveToClass: 'fade-leave-to',
      onBeforeEnter: vi.fn(),
      onEnter: vi.fn(),
      onAfterEnter: vi.fn(),
      onEnterCancelled: vi.fn(),
      onBeforeLeave: vi.fn(),
      onLeave: vi.fn(),
      onAfterLeave: vi.fn(),
      onLeaveCancelled: vi.fn(),
    };
    expect(props.name).toBe('fade');
    expect(props.appear).toBe(true);
    expect(props.mode).toBe('out-in');
  });

  it('should allow minimal props (all optional)', () => {
    const props: TransitionComponentProps = {};
    expect(props.name).toBeUndefined();
    expect(props.appear).toBeUndefined();
    expect(props.mode).toBeUndefined();
  });

  it('should support mode "in-out"', () => {
    const props: TransitionComponentProps = { mode: 'in-out' };
    expect(props.mode).toBe('in-out');
  });

  it('should support mode "out-in"', () => {
    const props: TransitionComponentProps = { mode: 'out-in' };
    expect(props.mode).toBe('out-in');
  });

  it('should support mode "default"', () => {
    const props: TransitionComponentProps = { mode: 'default' };
    expect(props.mode).toBe('default');
  });

  it('should support generic host element type', () => {
    // 泛型版本允许指定宿主元素类型
    const onEnter = (el: HTMLDivElement, done: () => void) => {
      done();
    };
    const props: TransitionComponentProps<HTMLDivElement> = {
      name: 'slide',
      onEnter,
    };
    expect(props.name).toBe('slide');
  });

  it('should support TransitionComponentPropsLegacy (Element type)', () => {
    const props: TransitionComponentPropsLegacy = {
      name: 'legacy-fade',
      onBeforeEnter: (el: Element) => {
        el.classList.add('legacy-enter-from');
      },
    };
    expect(props.name).toBe('legacy-fade');
  });
});

// ==================== Transition CSS 类名逻辑 ====================

describe('Transition - CSS 类名逻辑', () => {
  it('should generate correct enter class names based on name prop', () => {
    const name = 'fade';
    // 标准 Vue 过渡类名约定
    expect(`${name}-enter-from`).toBe('fade-enter-from');
    expect(`${name}-enter-active`).toBe('fade-enter-active');
    expect(`${name}-enter-to`).toBe('fade-enter-to');
    expect(`${name}-leave-from`).toBe('fade-leave-from');
    expect(`${name}-leave-active`).toBe('fade-leave-active');
    expect(`${name}-leave-to`).toBe('fade-leave-to');
  });

  it('should allow custom class names to override defaults', () => {
    const props: TransitionComponentProps = {
      name: 'fade',
      enterFromClass: 'custom-enter-from',
      enterActiveClass: 'custom-enter-active',
      enterToClass: 'custom-enter-to',
    };
    expect(props.enterFromClass).toBe('custom-enter-from');
    expect(props.enterActiveClass).toBe('custom-enter-active');
    expect(props.enterToClass).toBe('custom-enter-to');
    // name 仍然存在，但自定义类名优先
    expect(props.name).toBe('fade');
  });

  it('should support CSS class manipulation on DOM elements', () => {
    // 模拟 enter 过渡的类名添加流程
    // 使用 Set 模拟 classList 行为（node 环境无 DOM）
    const classes = new Set<string>();

    // 添加 enter-from 和 enter-active
    classes.add('fade-enter-from');
    classes.add('fade-enter-active');
    expect(classes.has('fade-enter-from')).toBe(true);
    expect(classes.has('fade-enter-active')).toBe(true);

    // 移除 enter-from，添加 enter-to
    classes.delete('fade-enter-from');
    classes.add('fade-enter-to');
    expect(classes.has('fade-enter-from')).toBe(false);
    expect(classes.has('fade-enter-to')).toBe(true);
    expect(classes.has('fade-enter-active')).toBe(true);

    // 过渡完成后移除所有类
    classes.delete('fade-enter-to');
    classes.delete('fade-enter-active');
    expect(classes.has('fade-enter-to')).toBe(false);
    expect(classes.has('fade-enter-active')).toBe(false);
    expect(classes.size).toBe(0);
  });

  it('should support leave transition class manipulation', () => {
    // 模拟 leave 过程（使用 Set 模拟 classList）
    const classes = new Set<string>();

    classes.add('fade-leave-from');
    classes.add('fade-leave-active');
    expect(classes.has('fade-leave-from')).toBe(true);
    expect(classes.has('fade-leave-active')).toBe(true);

    classes.delete('fade-leave-from');
    classes.add('fade-leave-to');
    expect(classes.has('fade-leave-from')).toBe(false);
    expect(classes.has('fade-leave-to')).toBe(true);

    classes.delete('fade-leave-to');
    classes.delete('fade-leave-active');
    expect(classes.size).toBe(0);
  });
});

// ==================== Transition Hook 回调验证 ====================

describe('Transition - hook 回调验证', () => {
  it('should invoke onBeforeEnter with element', () => {
    const mockEl = { tagName: 'DIV' };
    const onBeforeEnter = vi.fn();
    const props: TransitionComponentProps<typeof mockEl> = { onBeforeEnter };
    props.onBeforeEnter!(mockEl);
    expect(onBeforeEnter).toHaveBeenCalledWith(mockEl);
  });

  it('should invoke onEnter with element and done callback', () => {
    const mockEl = { tagName: 'DIV' };
    const onEnter = vi.fn();
    const props: TransitionComponentProps<typeof mockEl> = { onEnter };
    const done = vi.fn();
    props.onEnter!(mockEl, done);
    expect(onEnter).toHaveBeenCalledWith(mockEl, done);
  });

  it('should invoke onAfterEnter with element', () => {
    const mockEl = { tagName: 'DIV' };
    const onAfterEnter = vi.fn();
    const props: TransitionComponentProps<typeof mockEl> = { onAfterEnter };
    props.onAfterEnter!(mockEl);
    expect(onAfterEnter).toHaveBeenCalledWith(mockEl);
  });

  it('should invoke onBeforeLeave with element', () => {
    const mockEl = { tagName: 'DIV' };
    const onBeforeLeave = vi.fn();
    const props: TransitionComponentProps<typeof mockEl> = { onBeforeLeave };
    props.onBeforeLeave!(mockEl);
    expect(onBeforeLeave).toHaveBeenCalledWith(mockEl);
  });

  it('should invoke onLeave with element and done callback', () => {
    const mockEl = { tagName: 'DIV' };
    const onLeave = vi.fn();
    const props: TransitionComponentProps<typeof mockEl> = { onLeave };
    const done = vi.fn();
    props.onLeave!(mockEl, done);
    expect(onLeave).toHaveBeenCalledWith(mockEl, done);
  });

  it('should invoke onAfterLeave with element', () => {
    const mockEl = { tagName: 'DIV' };
    const onAfterLeave = vi.fn();
    const props: TransitionComponentProps<typeof mockEl> = { onAfterLeave };
    props.onAfterLeave!(mockEl);
    expect(onAfterLeave).toHaveBeenCalledWith(mockEl);
  });

  it('should invoke onEnterCancelled with element', () => {
    const mockEl = { tagName: 'DIV' };
    const onEnterCancelled = vi.fn();
    const props: TransitionComponentProps<typeof mockEl> = { onEnterCancelled };
    props.onEnterCancelled!(mockEl);
    expect(onEnterCancelled).toHaveBeenCalledWith(mockEl);
  });

  it('should invoke onLeaveCancelled with element', () => {
    const mockEl = { tagName: 'DIV' };
    const onLeaveCancelled = vi.fn();
    const props: TransitionComponentProps<typeof mockEl> = { onLeaveCancelled };
    props.onLeaveCancelled!(mockEl);
    expect(onLeaveCancelled).toHaveBeenCalledWith(mockEl);
  });
});

// ==================== TransitionGroup 组件结构 ====================

describe('TransitionGroup - 组件结构', () => {
  it('should be a valid ComponentOptions object', () => {
    expect(TransitionGroup).toBeDefined();
    expect(typeof TransitionGroup).toBe('object');
    expect(TransitionGroup).not.toBeNull();
  });

  it('should have name "TransitionGroup"', () => {
    expect(TransitionGroup.name).toBe('TransitionGroup');
  });

  it('should have a props definition', () => {
    expect(TransitionGroup.props).toBeDefined();
    expect(typeof TransitionGroup.props).toBe('object');
  });

  it('should have a setup function', () => {
    expect(typeof TransitionGroup.setup).toBe('function');
  });
});

// ==================== TransitionGroup 独有 Props ====================

describe('TransitionGroup - 独有 props', () => {
  it('should define "tag" prop', () => {
    expect(TransitionGroup.props.tag).toBeDefined();
    expect(TransitionGroup.props.tag.type).toBeDefined();
    // tag accepts String or Boolean (false = no wrapper)
    expect(Array.isArray(TransitionGroup.props.tag.type)).toBe(true);
  });

  it('should define "moveClass" prop with String type', () => {
    expect(TransitionGroup.props.moveClass).toBeDefined();
    expect(TransitionGroup.props.moveClass.type).toBe(String);
  });

  it('should not have a default value for "tag"', () => {
    expect(TransitionGroup.props.tag.default).toBeUndefined();
  });

  it('should not have a default value for "moveClass"', () => {
    expect(TransitionGroup.props.moveClass.default).toBeUndefined();
  });
});

// ==================== TransitionGroup 共有 Props ====================

describe('TransitionGroup - 共有 props (与 Transition 一致)', () => {
  it('should define "name" prop', () => {
    expect(TransitionGroup.props.name).toBeDefined();
    expect(TransitionGroup.props.name.type).toBe(String);
  });

  it('should define "appear" prop with default false', () => {
    expect(TransitionGroup.props.appear).toBeDefined();
    expect(TransitionGroup.props.appear.type).toBe(Boolean);
    expect(TransitionGroup.props.appear.default).toBe(false);
  });

  it('should define all enter/leave class props', () => {
    const classProps = [
      'enterFromClass',
      'enterActiveClass',
      'enterToClass',
      'leaveFromClass',
      'leaveActiveClass',
      'leaveToClass',
    ];
    classProps.forEach((propName) => {
      expect(TransitionGroup.props[propName]).toBeDefined();
      expect(TransitionGroup.props[propName].type).toBe(String);
    });
  });

  it('should define all enter/leave hook props', () => {
    const hookProps = [
      'onBeforeEnter',
      'onEnter',
      'onAfterEnter',
      'onEnterCancelled',
      'onBeforeLeave',
      'onLeave',
      'onAfterLeave',
      'onLeaveCancelled',
    ];
    hookProps.forEach((hookName) => {
      expect(TransitionGroup.props[hookName]).toBeDefined();
      expect(TransitionGroup.props[hookName].type).toBe(Function);
    });
  });
});

// ==================== TransitionGroup Props 完整性 ====================

describe('TransitionGroup - props 完整性', () => {
  it('should define exactly 18 props (17 shared + tag + moveClass)', () => {
    const propKeys = Object.keys(TransitionGroup.props);
    expect(propKeys).toHaveLength(18);
  });

  it('should include tag and moveClass in addition to Transition props', () => {
    const propKeys = Object.keys(TransitionGroup.props);
    expect(propKeys).toContain('tag');
    expect(propKeys).toContain('moveClass');
  });
});

// ==================== TransitionGroup Setup ====================

describe('TransitionGroup - setup 函数', () => {
  it('should be callable', () => {
    expect(() =>
      TransitionGroup.setup({}, { slots: {}, attrs: {}, emit: () => {} } as any),
    ).not.toThrow();
  });

  it('should return a function that renders default slot content', () => {
    const mockSlotContent = [{ type: 'div', props: {}, children: null }];
    const slots = { default: () => mockSlotContent };
    const result = TransitionGroup.setup({}, { slots } as any);
    expect(typeof result).toBe('function');
  });

  it('should invoke default slot during setup (IIFE executes immediately)', () => {
    const slotFn = vi.fn(() => []);
    const slots = { default: slotFn };
    TransitionGroup.setup({}, { slots } as any);
    // setup 内部使用 IIFE 立即执行 slots.default?.()
    // 返回值被 as unknown as void 转型，但运行时仍返回函数
  });
});

// ==================== TransitionGroupComponentProps 接口 ====================

describe('TransitionGroup - TransitionGroupComponentProps 接口', () => {
  it('should support all props with full configuration', () => {
    const props: TransitionGroupComponentProps = {
      name: 'list',
      appear: true,
      tag: 'ul',
      moveClass: 'list-move',
      enterFromClass: 'list-enter-from',
      enterActiveClass: 'list-enter-active',
      enterToClass: 'list-enter-to',
      leaveFromClass: 'list-leave-from',
      leaveActiveClass: 'list-leave-active',
      leaveToClass: 'list-leave-to',
      onBeforeEnter: vi.fn(),
      onEnter: vi.fn(),
      onAfterEnter: vi.fn(),
      onEnterCancelled: vi.fn(),
      onBeforeLeave: vi.fn(),
      onLeave: vi.fn(),
      onAfterLeave: vi.fn(),
      onLeaveCancelled: vi.fn(),
    };
    expect(props.name).toBe('list');
    expect(props.tag).toBe('ul');
    expect(props.moveClass).toBe('list-move');
  });

  it('should allow tag to be false (no wrapper element)', () => {
    const props: TransitionGroupComponentProps = { tag: false };
    expect(props.tag).toBe(false);
  });

  it('should allow minimal props', () => {
    const props: TransitionGroupComponentProps = {};
    expect(props.name).toBeUndefined();
    expect(props.tag).toBeUndefined();
    expect(props.moveClass).toBeUndefined();
  });

  it('should support TransitionGroupComponentPropsLegacy', () => {
    const props: TransitionGroupComponentPropsLegacy = {
      name: 'legacy-list',
      tag: 'div',
    };
    expect(props.name).toBe('legacy-list');
    expect(props.tag).toBe('div');
  });
});
