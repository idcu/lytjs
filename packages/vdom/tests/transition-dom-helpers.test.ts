// @vitest-environment jsdom
/**
 * 行为级判据：`vdom/transition` 的 **DOM 形态**辅助函数
 *
 * ## 为什么要有这条
 *
 * `packages/vdom/src/transition.ts`（769 行）是 `<Transition>` / `TransitionGroup` 的过渡机制真身，
 * 但覆盖率实测仅 ~9%（374 条语句未覆盖）—— 其中**面向 Element 的「DOM 回退」重载**
 * （`getTransitionInfoDOM` / `hasCSSTransition` / `addTransitionClass` …）几乎没有判据。
 * 静态审查已发现两处可疑，本电池用实测定性：
 *   ① `getStylePropAsArray` 用 `getPropertyValue('transitionDelay')`（**camelCase**），
 *      而该 API 只认 **kebab-case**（`transition-delay`）⇒ 可能恒返回空 ⇒ 永远报「无过渡」；
 *   ② `hasCSSTransition` 的 enter 分支用 `${name}-from`，而 `resolveTransitionClasses` 用
 *      `${name}-enter-from` ⇒ 两者对**同一个类名**的口径不一致。
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  getTransitionInfoDOM,
  getTransitionInfo,
  addTransitionClass,
  removeTransitionClass,
  hasCSSTransition,
  setTransitionPrefix,
  createTransitionState,
  cancelTransition,
} from '../src/transition';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

function mkEl(styles: Record<string, string> = {}, classes: string[] = []): HTMLElement {
  const el = document.createElement('div');
  for (const [k, v] of Object.entries(styles)) el.style.setProperty(k, v);
  for (const c of classes) el.classList.add(c);
  document.body.appendChild(el);
  hosts.push(el);
  return el;
}

describe('transition · getTransitionInfoDOM', () => {
  it('★ 读到 transition-duration（毫秒）', () => {
    const el = mkEl({ 'transition-duration': '0.3s' });
    const info = getTransitionInfoDOM(el, 'enter');
    expect(info.hasTransition).toBe(true);
    expect(info.duration).toBe(300);
  });

  it('★ 时长与延迟相加（取最大）', () => {
    const el = mkEl({ 'transition-duration': '0.3s, 0.4s', 'transition-delay': '0.1s, 0.2s' });
    const info = getTransitionInfoDOM(el, 'enter');
    expect(info.duration).toBe(600); // max(300+100, 400+200)
  });

  it('★ 只有 animation 时也能读到', () => {
    const el = mkEl({ 'animation-duration': '1s', 'animation-delay': '0.5s' });
    const info = getTransitionInfoDOM(el, 'enter');
    expect(info.hasAnimation).toBe(true);
    expect(info.duration).toBe(1500);
  });

  it('无过渡无动画 ⇒ 0 / false / false', () => {
    const el = mkEl();
    expect(getTransitionInfoDOM(el, 'enter')).toEqual({
      duration: 0,
      hasTransition: false,
      hasAnimation: false,
    });
  });

  it('transition 与 animation 同时存在时取更大者', () => {
    const el = mkEl({ 'transition-duration': '0.2s', 'animation-duration': '0.9s' });
    expect(getTransitionInfoDOM(el, 'leave').duration).toBe(900);
  });

  it('getTransitionInfo(el, type) 与 DOM 版一致', () => {
    const el = mkEl({ 'transition-duration': '0.25s' });
    expect(getTransitionInfo(el, 'enter')).toEqual(getTransitionInfoDOM(el, 'enter'));
    expect(getTransitionInfo(el, 'enter').duration).toBe(250);
  });
});

describe('transition · 类名增删', () => {
  it('addTransitionClass / removeTransitionClass（Element 形态）', () => {
    const el = mkEl();
    addTransitionClass(el, 'fade-enter-from');
    expect(el.classList.contains('fade-enter-from')).toBe(true);
    removeTransitionClass(el, 'fade-enter-from');
    expect(el.classList.contains('fade-enter-from')).toBe(false);
  });
});

describe('transition · hasCSSTransition', () => {
  it('未给 name ⇒ 按计算样式判定', () => {
    expect(hasCSSTransition(mkEl({ 'transition-duration': '0.3s' }), undefined, 'enter')).toBe(
      true,
    );
    expect(hasCSSTransition(mkEl(), undefined, 'enter')).toBe(false);
  });

  it('★ 给了 name：enter 阶段应认 `${name}-enter-from`', () => {
    const el = mkEl({}, ['v-enter-from']);
    expect(hasCSSTransition(el, 'v', 'enter')).toBe(true);
  });

  it('给了 name：leave 阶段认 `${name}-leave-from`', () => {
    const el = mkEl({}, ['v-leave-from']);
    expect(hasCSSTransition(el, 'v', 'leave')).toBe(true);
  });

  it('有 active 类时按计算样式判定', () => {
    const withStyle = mkEl({ 'transition-duration': '0.3s' }, ['v-enter-active']);
    expect(hasCSSTransition(withStyle, 'v', 'enter')).toBe(true);
    const withoutStyle = mkEl({}, ['v-enter-active']);
    expect(hasCSSTransition(withoutStyle, 'v', 'enter')).toBe(false);
  });

  it('自定义 name 生效', () => {
    expect(hasCSSTransition(mkEl({}, ['fade-enter-from']), 'fade', 'enter')).toBe(true);
  });
});

describe('transition · 状态与清理', () => {
  it('createTransitionState 返回可用的状态对象', () => {
    const s = createTransitionState();
    expect(s).toBeTypeOf('object');
    expect(s).not.toBeNull();
  });

  it('cancelTransition(el) 对未登记的元素是安全空操作', () => {
    const el = mkEl();
    expect(() => cancelTransition(el)).not.toThrow();
  });

  it('setTransitionPrefix 可调用且不抛', () => {
    expect(() => setTransitionPrefix('my')).not.toThrow();
    setTransitionPrefix('v'); // 还原，避免影响后续用例
  });
});
