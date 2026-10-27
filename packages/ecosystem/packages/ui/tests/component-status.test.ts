/**
 * 组件成熟度守卫（报告 §8.2 第 13 条）
 *
 * ## 为什么需要这条
 *
 * `@lytjs/ui` 对外说「56 个组件」，而 2026-10-26 的全维度审计实测：
 * **24 个是半成品**（主要路径能渲染，边界/交互/无障碍未系统覆盖）。
 *
 * 把两者混在同一个数字里，代价是**用户的信任**：他按文档抄一个 `<Table />`，
 * 跑起来发现排序点了没反应 —— 问题不在他。
 *
 * ## 这条守卫锁四件事
 *
 * 1. `src/index.ts` 里**每一个**导出都必须在 `COMPONENT_STATUS` 里有登记
 *    （新增组件不能「默认按成熟」混进去）；
 * 2. `COMPONENT_STATUS` 里不能有**已删除**的组件（避免表变成垃圾场）；
 * 3. `beta` 组件的源文件头必须有 `@beta` 标签（IDE 悬停就能看到，
 *    而不是只有翻这个表才知道）；
 * 4. `stable` 组件**不得**有 `@beta` 标签（防止降级后忘了改表，或反过来）。
 *
 * 外加一条**棘轮**：beta 数量只能降不能升 —— 修好一个就从表里改成 stable，
 * 想新增 beta 必须显式改这里的上限并在提交里说明。
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { COMPONENT_STATUS, listBetaComponents } from '../src/component-status';

const UI_SRC = join(__dirname, '..', 'src');
const INDEX = join(UI_SRC, 'index.ts');
const COMPONENTS = join(UI_SRC, 'components');

/** 从 index.ts 里抽出实际导出的组件名（`export { A, B as C } from './components/...'`） */
function exportedComponentNames(): string[] {
  const src = readFileSync(INDEX, 'utf8');
  const names = new Set<string>();

  for (const m of src.matchAll(/^export \{ ([^}]+) \} from '\.\/components\//gm)) {
    for (const raw of m[1]!.split(',')) {
      const item = raw.trim();
      if (!item || item.startsWith('type ')) continue;
      const alias = item.match(/^default as (\w+)$/);
      names.add(alias ? alias[1]! : item);
    }
  }

  return [...names].sort();
}

/** 读组件文件头部的块注释（没有则空串） */
function headerComment(componentName: string): string {
  const file = join(COMPONENTS, `${componentName}.ts`);
  if (!existsSync(file)) return '';
  const src = readFileSync(file, 'utf8');
  const m = src.match(/^\/\*\*[\s\S]*?\*\//);
  return m ? m[0] : '';
}

describe('组件成熟度（单一真相源守卫）', () => {
  const exported = exportedComponentNames();

  it('index.ts 里必须能解析出组件导出（防止正则失效导致空跑）', () => {
    expect(exported.length).toBeGreaterThan(40);
  });

  it('每一个对外导出都必须在 COMPONENT_STATUS 里登记', () => {
    const missing = exported.filter((name) => !COMPONENT_STATUS[name]);
    expect(missing).toEqual([]);
  });

  it('COMPONENT_STATUS 里不得有已删除的组件', () => {
    const stale = Object.keys(COMPONENT_STATUS).filter((name) => !exported.includes(name));
    expect(stale).toEqual([]);
  });

  it('beta 组件的源文件头必须有 @beta 标签', () => {
    const missing: string[] = [];

    for (const name of listBetaComponents()) {
      const header = headerComment(name);
      if (!header.includes('@beta')) missing.push(name);
    }

    expect(missing).toEqual([]);
  });

  it('stable 组件不得残留 @beta 标签', () => {
    const offenders = exported.filter(
      (name) =>
        COMPONENT_STATUS[name]?.status === 'stable' && headerComment(name).includes('@beta'),
    );

    expect(offenders).toEqual([]);
  });

  it('beta 数量是棘轮：只能降，不能升（当前上限 24）', () => {
    // 想上调必须同时改这里，并在提交信息里写清「为什么这个组件从 stable 变 beta」。
    const BETA_CEILING = 24;
    const actual = listBetaComponents();

    expect(actual.length).toBeLessThanOrEqual(BETA_CEILING);
    // 失败时把清单打出来，方便直接看到是哪个组件把数字顶上去了
    if (actual.length > BETA_CEILING) {
      throw new Error(
        `beta 组件数 ${actual.length} 超过上限 ${BETA_CEILING}：${actual.join(', ')}`,
      );
    }
  });
});
