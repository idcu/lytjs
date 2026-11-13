// @vitest-environment jsdom
/**
 * 全组件冒烟电池：**每一个对外导出都真的能挂上**
 *
 * ## 为什么要有这条
 *
 * 2026-10-26 审计说 24 个组件是「半成品」，但那只回答了「功能全不全」，
 * 没回答一个更基本的问题：**它们能不能挂载**。
 *
 * 2026-10-27 写这条电池时立刻抓到两个 P0：`<Empty />` 与 `<Spin />` **挂载即崩**
 * —— 两者都渲染 svg 图标，而底层 `patchClass` 用了 `el.className = …`，
 * 在 `SVGElement` 上 `className` 是**只读**的 `SVGAnimatedString`
 * ⇒ `TypeError`，并中断整棵树的挂载。修复见 `@lytjs/common-dom` 的 `patchClass`。
 *
 * 这类缺陷**任何单元测试都发现不了**（每个包的测试都在自己的抽象层上），
 * 只有「真的把一个组件挂进 DOM」才会暴露。所以它必须是一条**常驻**电池。
 *
 * ## 断言（四条，都是「真坏」而不是「形状不对」）
 *
 * 1. **不抛错** —— 挂载不 reject（崩了就一定有问题）；
 * 2. **不出现 `[object Object]`** —— 这是「把对象当字符串塞进 DOM」的经典症状；
 * 3. **不残留占位注释** —— `<!--lyt-…-->` 没被替换说明渲染链没走完；
 * 4. **渲染出内容** —— 空 DOM 意味着用户什么都看不到。
 *
 * ## 为什么 `Message` 在白名单里
 *
 * `Message` 是**命令式 API**（`Message.success('x')`），不是组件；它被 `index.ts`
 * 一起导出，但挂载它没有语义。白名单要求写清理由 —— 不是「跳过失败的那个」。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import * as UI from '../src/index';
import { COMPONENT_STATUS } from '../src/component-status';

/** 命令式 API：不是组件，不参与挂载（新增项必须写理由） */
const IMPERATIVE_EXPORTS: Record<string, string> = {
  Message: '命令式 API：Message.success(...) 直接操作全局容器，没有组件形态',
};

/**
 * 按组件的**声明 props** 自动造样本值。
 *
 * 为什么不是手写 61 组 props：手写只能覆盖「我想到的用法」，
 * 而这里要回答的是「**每一个声明出来的 prop 被赋值时会不会崩**」。
 * 从 `component.props` 的 `type` 推导样本值，新增 prop 会自动被覆盖 ——
 * 这是它比手写清单更值钱的地方。
 *
 * 只造「安全」样本：String → 'x'、Number → 1、Boolean → true、Array → []、Object → {}。
 * 不造边界值（空串、负数、非法日期）—— 那是各组件自己的用例该管的事。
 */
function samplePropValue(type: unknown): unknown {
  if (Array.isArray(type)) return samplePropValue(type[0]);
  if (type === String) return 'x';
  if (type === Number) return 1;
  if (type === Boolean) return true;
  if (type === Array) return [];
  if (type === Object) return {};
  if (type === Function) return () => {};
  return undefined;
}

/** 从组件定义里取出「该给哪些 prop 赋样本值」 */
function sampleProps(comp: unknown): Record<string, unknown> {
  const def = comp as { props?: Record<string, unknown> } | undefined;
  const propsDef = def?.props ?? {};
  const out: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(propsDef)) {
    // 事件/类名/无障碍属性不参与（它们不是「数据」，赋样本值没有意义）
    if (key.startsWith('on') || key === 'class' || key === 'id' || key.startsWith('aria')) continue;
    const type = (raw as { type?: unknown })?.type ?? raw;
    const value = samplePropValue(type);
    if (value !== undefined) out[key] = value;
  }

  return out;
}

/** 挂载一个组件，返回 { html, error } */
async function mountOne(
  comp: unknown,
  props: Record<string, unknown> = {},
): Promise<{ html: string; error: string }> {
  const host = document.createElement('div');
  document.body.appendChild(host);

  let error = '';
  try {
    await createApp({
      setup() {
        return () => h(comp as never, props, { default: () => [h('span', null, 'slot')] });
      },
    } as never).mount(host);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return { html: host.innerHTML, error };
}

beforeEach(() => {
  // 组件在挂载期会打不少日志，冒烟电池不关心
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('全组件冒烟电池', () => {
  const names = Object.keys(COMPONENT_STATUS).sort();

  it('登记表非空（防止正则/导入失效导致空跑）', () => {
    expect(names.length).toBeGreaterThan(50);
  });

  for (const name of names) {
    if (IMPERATIVE_EXPORTS[name]) {
      it(`${name}：命令式 API 存在且可调用`, () => {
        const api = (UI as Record<string, unknown>)[name];
        expect(api).toBeDefined();
        expect(typeof api === 'function' || typeof api === 'object').toBe(true);
      });
      continue;
    }

    it(`${name}：能挂载且渲染出内容`, async () => {
      const comp = (UI as Record<string, unknown>)[name];
      expect(comp, `index.ts 导出了 ${name}，但运行时取不到`).toBeDefined();

      const { html, error } = await mountOne(comp);

      expect(error, `${name} 挂载抛错：${error}`).toBe('');
      expect(html, `${name} 把对象当字符串写进了 DOM`).not.toContain('[object Object]');
      expect(html, `${name} 残留未替换的占位注释`).not.toMatch(/<!--\s*lyt-/);
      expect(html.trim(), `${name} 渲染为空（用户什么都看不到）`).not.toBe('');
    });
  }
});

/**
 * 第二遍：把**每一个声明出来的 prop** 都赋一个样本值再挂一次。
 *
 * 第一遍（`{}`）只证明「组件能在默认状态下挂上」；这一遍证明「prop 被赋值时不会崩」。
 * 实测两遍都过 —— 说明 props 路径是健康的（第一遍抓到的 Empty/Spin 是 svg class 的锅，
 * 与 props 无关）。留着它是因为：**新增 prop 时没人会记得补测试**，而这条会自动覆盖。
 */
describe('全组件冒烟电池 · 带声明 props', () => {
  const names = Object.keys(COMPONENT_STATUS).sort();

  for (const name of names) {
    if (IMPERATIVE_EXPORTS[name]) continue;

    it(`${name}：所有声明 prop 赋值后仍能挂载`, async () => {
      const comp = (UI as Record<string, unknown>)[name];
      const props = sampleProps(comp);

      const { html, error } = await mountOne(comp, props);

      expect(error, `${name} 在 props=${JSON.stringify(Object.keys(props))} 下抛错：${error}`).toBe(
        '',
      );
      expect(html).not.toContain('[object Object]');
      expect(html).not.toMatch(/<!--\s*lyt-/);
    });
  }
});
