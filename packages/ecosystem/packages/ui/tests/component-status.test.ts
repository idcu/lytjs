/**
 * 组件成熟度守卫（A14 / D2，2026-11-05）
 *
 * ## 决策
 *
 * Golden 20 冻结：`stable` **必须且只能**是 `GOLDEN_COMPONENTS` 里的 20 个；
 * 其余导出保留但标注 `experimental`，不移出默认导出。
 * `mislabeled_stable = 0` 是硬门禁（同 `scripts/check-component-status.mjs`）。
 *
 * ## 这条守卫锁五件事
 *
 * 1. `src/index.ts` 里每个导出都在 `COMPONENT_STATUS` 登记（新增组件不能默认按成熟混入）；
 * 2. `COMPONENT_STATUS` 里不能有已删除组件；
 * 3. `stable` 集合 == `GOLDEN_COMPONENTS`（20 个，多一个少一个都红）；
 * 4. `GOLDEN_COMPONENTS` 成员必须是真实导出；
 * 5. `experimental` 必须写 note，且数量 = 导出总数 - 20。
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  COMPONENT_STATUS,
  GOLDEN_COMPONENTS,
  listExperimentalComponents,
} from '../src/component-status';

const UI_SRC = join(__dirname, '..', 'src');
const INDEX = join(UI_SRC, 'index.ts');
const UI_TESTS = join(__dirname);

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

describe('组件成熟度（Golden 20 单一真相源守卫）', () => {
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

  it('Golden 名单冻结为 20 个且都是真实导出', () => {
    expect(GOLDEN_COMPONENTS).toHaveLength(20);
    expect(new Set(GOLDEN_COMPONENTS).size).toBe(20);
    const notExported = GOLDEN_COMPONENTS.filter((name) => !exported.includes(name));
    expect(notExported).toEqual([]);
  });

  it('stable 集合必须且只能等于 Golden 20（mislabeled_stable = 0）', () => {
    const stable = Object.keys(COMPONENT_STATUS).filter(
      (name) => COMPONENT_STATUS[name]!.status === 'stable',
    );
    expect(stable.sort()).toEqual([...GOLDEN_COMPONENTS].sort());
  });

  it('experimental 全部带 note，数量 = 导出总数 - 20', () => {
    const experimental = listExperimentalComponents();
    expect(experimental).toHaveLength(exported.length - 20);
    const withoutNote = experimental.filter((name) => !COMPONENT_STATUS[name]!.note);
    expect(withoutNote).toEqual([]);
  });

  it('Golden 20 的判定证据文件必须存在（防止名单凭空长出来）', () => {
    const evidence = [
      'all-components-smoke.test.ts',
      'dialog-a11y.test.ts',
      'e2e-dialog.test.ts',
      'e2e-pagination.test.ts',
      'pagination-controlled.test.ts',
      'e2e-interaction-p0.test.ts',
      'e2e-input-number.test.ts',
    ];
    const missing = evidence.filter((f) => !existsSync(join(UI_TESTS, f)));
    expect(missing).toEqual([]);
  });
});
