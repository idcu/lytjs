/**
 * @lytjs/compat unit tests
 */

import { describe, it, expect } from 'vitest';
import {
  DEPRECATED_LIFECYCLE_HOOKS,
  VUE2_LIFECYCLE_HOOKS,
  VUE3_LIFECYCLE_HOOKS,
  isDeprecatedLifecycleHook,
  normalizeLifecycleHook,
  migrateVue2LifecycleHooks,
} from '../src';

describe('@lytjs/compat — 生命周期钩子名映射', () => {
  describe('DEPRECATED_LIFECYCLE_HOOKS', () => {
    it('应只包含 Vue 2 被重命名的那两个钩子', () => {
      expect(DEPRECATED_LIFECYCLE_HOOKS).toEqual({
        beforeDestroy: 'beforeUnmount',
        destroyed: 'unmounted',
      });
    });

    it('必须是冻结的（调用方无法篡改全局映射）', () => {
      expect(Object.isFrozen(DEPRECATED_LIFECYCLE_HOOKS)).toBe(true);
    });
  });

  describe('isDeprecatedLifecycleHook', () => {
    it('应识别两个废弃名', () => {
      expect(isDeprecatedLifecycleHook('beforeDestroy')).toBe(true);
      expect(isDeprecatedLifecycleHook('destroyed')).toBe(true);
    });

    it('不应误判 Vue 3 名与未知名', () => {
      expect(isDeprecatedLifecycleHook('beforeUnmount')).toBe(false);
      expect(isDeprecatedLifecycleHook('unmounted')).toBe(false);
      expect(isDeprecatedLifecycleHook('created')).toBe(false);
      expect(isDeprecatedLifecycleHook('nope')).toBe(false);
    });

    it('不得被原型链上的键误判（hasOwnProperty 语义）', () => {
      // 若用 `name in MAP` 或 `MAP[name]` 判定，`toString` / `constructor`
      // 会因原型链命中而返回 true
      expect(isDeprecatedLifecycleHook('toString')).toBe(false);
      expect(isDeprecatedLifecycleHook('constructor')).toBe(false);
    });
  });

  describe('normalizeLifecycleHook', () => {
    it('应把废弃名映射为 Vue 3 名', () => {
      expect(normalizeLifecycleHook('beforeDestroy')).toBe('beforeUnmount');
      expect(normalizeLifecycleHook('destroyed')).toBe('unmounted');
    });

    it('未改名/未知的钩子必须原样返回', () => {
      for (const name of ['created', 'mounted', 'beforeUnmount', 'unmounted', 'nope']) {
        expect(normalizeLifecycleHook(name)).toBe(name);
      }
    });
  });

  describe('钩子名清单', () => {
    it('VUE3 清单必须含 beforeUnmount / unmounted 且不含废弃名', () => {
      expect(VUE3_LIFECYCLE_HOOKS).toContain('beforeUnmount');
      expect(VUE3_LIFECYCLE_HOOKS).toContain('unmounted');
      expect(VUE3_LIFECYCLE_HOOKS).not.toContain('beforeDestroy');
      expect(VUE3_LIFECYCLE_HOOKS).not.toContain('destroyed');
    });

    it('VUE2 清单必须含废弃名且不含 Vue 3 新名', () => {
      expect(VUE2_LIFECYCLE_HOOKS).toContain('beforeDestroy');
      expect(VUE2_LIFECYCLE_HOOKS).toContain('destroyed');
      expect(VUE2_LIFECYCLE_HOOKS).not.toContain('beforeUnmount');
      expect(VUE2_LIFECYCLE_HOOKS).not.toContain('unmounted');
    });

    it('两个清单的差集必须正好是「2 个废弃名」与「2 个改名 + 3 个 Vue 3 新增」', () => {
      const onlyVue2 = VUE2_LIFECYCLE_HOOKS.filter((h) => !VUE3_LIFECYCLE_HOOKS.includes(h));
      const onlyVue3 = VUE3_LIFECYCLE_HOOKS.filter((h) => !VUE2_LIFECYCLE_HOOKS.includes(h));

      // Vue 2 独有：正好是那两个被重命名的
      expect(onlyVue2.sort()).toEqual(['beforeDestroy', 'destroyed']);
      // Vue 3 独有：2 个改名目标 + 3 个 Vue 3 新增钩子
      expect(onlyVue3.sort()).toEqual([
        'beforeUnmount',
        'renderTracked',
        'renderTriggered',
        'serverPrefetch',
        'unmounted',
      ]);
      // 两者的交集必须非空（大多数钩子名不变），否则说明清单被写坏了
      const common = VUE2_LIFECYCLE_HOOKS.filter((h) => VUE3_LIFECYCLE_HOOKS.includes(h));
      expect(common.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('migrateVue2LifecycleHooks', () => {
    it('应重命名废弃钩子并保留其余键', () => {
      const fn = () => 1;
      const report = migrateVue2LifecycleHooks({
        name: 'MyComp',
        created() {},
        beforeDestroy: fn,
        destroyed() {},
        methods: { a: 1 },
      });

      expect(report.ok).toBe(true);
      expect(report.deprecatedCount).toBe(2);
      expect(report.renamed).toEqual([
        { from: 'beforeDestroy', to: 'beforeUnmount' },
        { from: 'destroyed', to: 'unmounted' },
      ]);
      expect(report.conflicts).toEqual([]);

      // 新名承载原函数（同一引用）
      expect(report.options.beforeUnmount).toBe(fn);
      expect(typeof report.options.unmounted).toBe('function');
      // 旧名必须消失
      expect(report.options).not.toHaveProperty('beforeDestroy');
      expect(report.options).not.toHaveProperty('destroyed');
      // 其余键原样保留
      expect(report.options.name).toBe('MyComp');
      expect(report.options.methods).toEqual({ a: 1 });
    });

    it('不得修改入参对象', () => {
      const input: Record<string, unknown> = { beforeDestroy: 1 };
      migrateVue2LifecycleHooks(input);
      expect(input).toEqual({ beforeDestroy: 1 });
      expect(input).not.toHaveProperty('beforeUnmount');
    });

    it('新旧名同时存在时必须保留新名、丢弃旧名并记入 conflicts', () => {
      const report = migrateVue2LifecycleHooks({
        beforeDestroy: 'old',
        beforeUnmount: 'new',
      });

      expect(report.options.beforeUnmount).toBe('new');
      expect(report.options).not.toHaveProperty('beforeDestroy');
      expect(report.conflicts).toEqual(['beforeDestroy']);
      expect(report.renamed).toEqual([]);
      expect(report.deprecatedCount).toBe(1);
    });

    it('无废弃钩子时 renamed/conflicts 应为空且键序不变', () => {
      const report = migrateVue2LifecycleHooks({ a: 1, b: 2, created: 3 });
      expect(report.renamed).toEqual([]);
      expect(report.conflicts).toEqual([]);
      expect(report.deprecatedCount).toBe(0);
      expect(Object.keys(report.options)).toEqual(['a', 'b', 'created']);
    });

    it('非普通对象入参必须 ok:false 且返回空 options（不抛错）', () => {
      for (const bad of [null, undefined, 42, 'str', [], true]) {
        const report = migrateVue2LifecycleHooks(bad as unknown as object);
        expect(report.ok).toBe(false);
        expect(report.options).toEqual({});
        expect(report.deprecatedCount).toBe(0);
      }
    });

    it('迁移结果必须是「迁移到不动点」（二次迁移无变化）', () => {
      const once = migrateVue2LifecycleHooks({ beforeDestroy: 1, destroyed: 2 });
      const twice = migrateVue2LifecycleHooks(once.options);
      expect(twice.renamed).toEqual([]);
      expect(twice.options).toEqual(once.options);
    });
  });
});
