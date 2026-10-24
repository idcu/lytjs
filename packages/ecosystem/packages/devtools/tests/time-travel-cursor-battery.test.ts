/**
 * 时间旅行的**游标语义**。
 *
 * 背景：`getTimeTravelState()` 里 `currentIndex` 恒为 `length - 1`、`canRedo` 硬编码 `false`；
 * `timeTravelBack()` / `timeTravelForward()` 又都拿「最后一条」当当前位置
 * ⇒ `canGoForward` 永远为 false ⇒ **「重做」按钮永远不可用、「前进」永远没反应**。
 * 根因是整套 API 没有「我现在停在哪一帧」的概念。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerSignal,
  createSnapshot,
  getSnapshots,
  getTimeTravelState,
  restoreSnapshot,
  clearSnapshots,
  getTimeTravelNavigator,
  timeTravelBack,
  timeTravelForward,
} from '../src/signalsInspector';

beforeEach(() => {
  clearSnapshots();
});

/** 造 n 个快照，值依次为 0..n-1 */
function seed(n: number): void {
  for (let i = 0; i < n; i++) {
    registerSignal('s1', 'Count', 'signal', i);
    createSnapshot(`snap-${i}`);
  }
}

describe('getTimeTravelState 的游标', () => {
  it('没有快照时：currentIndex 0，两个方向都不可用', () => {
    const st = getTimeTravelState();
    expect(st.snapshots).toHaveLength(0);
    expect(st.currentIndex).toBe(0);
    expect(st.canUndo).toBe(false);
    expect(st.canRedo).toBe(false);
  });

  it('新建快照后停在最新：canUndo 有、canRedo 无', () => {
    seed(2);
    const st = getTimeTravelState();

    expect(st.currentIndex).toBe(1);
    expect(st.canUndo).toBe(true);
    expect(st.canRedo).toBe(false);
  });

  it('★ 恢复到旧快照后 canRedo 必须为 true（此前恒 false）', () => {
    seed(3);

    restoreSnapshot(0);
    const st = getTimeTravelState();

    expect(st.currentIndex).toBe(0);
    expect(st.canUndo).toBe(false);
    expect(st.canRedo).toBe(true);
  });

  it('恢复到中间帧：两个方向都可用', () => {
    seed(3);

    restoreSnapshot(1);
    const st = getTimeTravelState();

    expect(st.currentIndex).toBe(1);
    expect(st.canUndo).toBe(true);
    expect(st.canRedo).toBe(true);
  });

  it('新建快照会把游标拉回最新', () => {
    seed(2);
    restoreSnapshot(0);
    expect(getTimeTravelState().canRedo).toBe(true);

    createSnapshot('newest');

    const st = getTimeTravelState();
    expect(st.currentIndex).toBe(2);
    expect(st.canRedo).toBe(false);
  });

  it('clearSnapshots 重置游标', () => {
    seed(2);
    restoreSnapshot(0);
    clearSnapshots();

    const st = getTimeTravelState();
    expect(st.currentIndex).toBe(0);
    expect(st.canUndo).toBe(false);
    expect(st.canRedo).toBe(false);
  });

  it('超出容量上限后游标被钳制，不越界', () => {
    seed(105); // maxSnapshots = 100 ⇒ 只留最后 100 条

    const st = getTimeTravelState();
    expect(st.snapshots).toHaveLength(100);
    expect(st.currentIndex).toBe(99);
    expect(st.canRedo).toBe(false);
  });
});

describe('timeTravelBack / timeTravelForward', () => {
  it('back 回到上一帧并写回信号值', () => {
    seed(3); // 值依次 0,1,2；游标在 2

    const snapshot = timeTravelBack();

    expect(snapshot).not.toBeNull();
    expect(getTimeTravelState().currentIndex).toBe(1);
  });

  it('★ forward 在 back 之后必须能前进（此前恒为 null）', () => {
    seed(3);

    timeTravelBack(); // 2 → 1
    const forward = timeTravelForward(); // 1 → 2

    expect(forward).not.toBeNull();
    expect(getTimeTravelState().currentIndex).toBe(2);
  });

  it('在最新一帧时 forward 返回 null（无事可做）', () => {
    seed(2);
    expect(timeTravelForward()).toBeNull();
  });

  it('在第一帧时 back 返回 null', () => {
    seed(2);
    restoreSnapshot(0);

    expect(timeTravelBack()).toBeNull();
  });

  it('back/forward 的往返不改变快照列表本身', () => {
    seed(3);
    const before = getSnapshots().map((s) => s.label);

    timeTravelBack();
    timeTravelForward();

    expect(getSnapshots().map((s) => s.label)).toEqual(before);
  });

  it('连续 back 到底再连续 forward 到顶，游标与能力位逐步正确', () => {
    seed(3); // 游标 2

    timeTravelBack();
    expect(getTimeTravelState()).toMatchObject({ currentIndex: 1, canUndo: true, canRedo: true });

    timeTravelBack();
    expect(getTimeTravelState()).toMatchObject({ currentIndex: 0, canUndo: false, canRedo: true });

    expect(timeTravelBack()).toBeNull();

    timeTravelForward();
    expect(getTimeTravelState()).toMatchObject({ currentIndex: 1, canUndo: true, canRedo: true });

    timeTravelForward();
    expect(getTimeTravelState()).toMatchObject({ currentIndex: 2, canUndo: true, canRedo: false });

    expect(timeTravelForward()).toBeNull();
  });
});

describe('getTimeTravelNavigator', () => {
  it('★ 不传 index 时按游标算（此前恒取最后一条）', () => {
    seed(3);
    restoreSnapshot(1);

    const nav = getTimeTravelNavigator();

    expect(nav.currentIndex).toBe(1);
    expect(nav.canGoBack).toBe(true);
    expect(nav.canGoForward).toBe(true);
    expect(nav.previousSnapshot?.label).toBe('snap-0');
    expect(nav.nextSnapshot?.label).toBe('snap-2');
    expect(nav.diff).not.toBeNull();
  });

  it('显式 index 优先于游标（用于预览某一帧）', () => {
    seed(3);
    restoreSnapshot(2);

    const nav = getTimeTravelNavigator(0);

    expect(nav.currentIndex).toBe(0);
    expect(nav.canGoBack).toBe(false);
    expect(nav.canGoForward).toBe(true);
    expect(nav.previousSnapshot).toBeNull();
    expect(nav.diff).toBeNull();
  });

  it('空列表时给出安全的空导航', () => {
    const nav = getTimeTravelNavigator();

    expect(nav.total).toBe(0);
    expect(nav.currentIndex).toBe(0);
    expect(nav.canGoBack).toBe(false);
    expect(nav.canGoForward).toBe(false);
    expect(nav.currentSnapshot).toBeNull();
  });
});
