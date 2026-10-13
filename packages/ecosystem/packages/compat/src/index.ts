/**
 * @lytjs/compat
 *
 * Vue 2 / Vue 3 迁移辅助（migration helpers）。
 *
 * @packageDocumentation
 *
 * @status Partial - 已实现「生命周期钩子名迁移」；其余能力见下方「未实现」清单
 * @since 6.x
 *
 * ⚠️ 2026-10-10 订正（P1-8）：本包此前是**纯占位包**（源码只有 `export {}`），
 * 但 `package.json` 的 `description` 与 README 却宣称它是「Vue 2/3 兼容层」，
 * 且**已按 6.9.6 发布到 npm** —— 使用者装上后 `import` 到的是空对象。
 * 这属于「包名 / 描述与功能不符」。
 *
 * 现补上**唯一一块可以零风险做对的真实能力**：Vue 2 → Vue 3 的生命周期钩子名迁移
 * （纯数据 + 纯函数，不依赖任何框架运行时、不需要猜测 API 设计）。
 * 其余规划能力（Vuex 兼容层、响应式 API 桥接）**仍未实现**，已在 README 中
 * 显式标注为「规划中」，不再以「计划提供」的口吻暗示已可用。
 */

// ============================================================
// 生命周期钩子
// ============================================================

/**
 * Vue 2 中被重命名、在 Vue 3 里已废弃的生命周期钩子。
 *
 * | Vue 2 | Vue 3 |
 * |---|---|
 * | `beforeDestroy` | `beforeUnmount` |
 * | `destroyed` | `unmounted` |
 *
 * 其余钩子名在 Vue 2 → 3 之间**保持不变**（`beforeCreate` / `created` /
 * `beforeMount` / `mounted` / `beforeUpdate` / `updated` / `activated` /
 * `deactivated` / `errorCaptured`）。
 */
export const DEPRECATED_LIFECYCLE_HOOKS: Readonly<Record<string, string>> = Object.freeze({
  beforeDestroy: 'beforeUnmount',
  destroyed: 'unmounted',
});

/** Vue 3 的完整生命周期钩子名（含新增的调试与 SSR 钩子） */
export const VUE3_LIFECYCLE_HOOKS: readonly string[] = Object.freeze([
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeUnmount',
  'unmounted',
  'activated',
  'deactivated',
  'errorCaptured',
  'renderTracked',
  'renderTriggered',
  'serverPrefetch',
]);

/** Vue 2 的完整生命周期钩子名 */
export const VUE2_LIFECYCLE_HOOKS: readonly string[] = Object.freeze([
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'activated',
  'deactivated',
  'errorCaptured',
]);

/**
 * 判断某个钩子名是否是 Vue 2 遗留（在 Vue 3 中已废弃）。
 *
 * @param name - 钩子名
 */
export function isDeprecatedLifecycleHook(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(DEPRECATED_LIFECYCLE_HOOKS, name);
}

/**
 * 把单个钩子名归一化为 Vue 3 名称。
 *
 * 非废弃名称原样返回（包括未知名称 —— 本函数不做白名单过滤）。
 *
 * @param name - 钩子名
 * @returns Vue 3 中的等价钩子名
 */
export function normalizeLifecycleHook(name: string): string {
  return isDeprecatedLifecycleHook(name) ? DEPRECATED_LIFECYCLE_HOOKS[name]! : name;
}

/** 一次钩子迁移的结果报告 */
export interface LifecycleMigrationReport {
  /** 迁移后的新对象（不修改入参） */
  options: Record<string, unknown>;
  /** 实际发生的重命名 */
  renamed: Array<{ from: string; to: string }>;
  /**
   * 冲突：新旧名同时存在。
   * 处理策略是**保留新名、丢弃旧名**（新名是本轮迁移的目标语义），
   * 并把冲突的旧名记在这里供调用方提示用户。
   */
  conflicts: string[];
  /** 命中的废弃钩子名总数（含冲突的） */
  deprecatedCount: number;
  /** 入参是否是普通对象（`null` / 数组 / 非对象一律为 `false`，且 `options` 为空对象） */
  ok: boolean;
}

/**
 * 把 Vue 2 风格的组件选项对象迁移为 Vue 3 风格。
 *
 * 语义（全部确定性、可测）：
 * - `beforeDestroy` → `beforeUnmount`、`destroyed` → `unmounted`
 * - 若目标名已存在 ⇒ **保留新名**，旧名被丢弃并记入 `conflicts`
 * - 其余键**原样保留**（包括未知键），键顺序保持「首次出现」的顺序
 * - **不修改入参**，返回新对象
 * - 入参不是普通对象时返回 `ok: false` 与空 `options`（不抛错）
 *
 * @param options - Vue 2 风格的组件选项对象
 * @returns 迁移结果报告
 */
export function migrateVue2LifecycleHooks<T extends object>(options: T): LifecycleMigrationReport {
  const report: LifecycleMigrationReport = {
    options: {},
    renamed: [],
    conflicts: [],
    deprecatedCount: 0,
    ok: false,
  };

  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    return report;
  }
  report.ok = true;

  const source = options as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  // 第一遍：先落「非废弃」键，以便判断冲突时能知道目标名是否已存在
  for (const key of Object.keys(source)) {
    if (isDeprecatedLifecycleHook(key)) continue;
    out[key] = source[key];
  }

  // 第二遍：处理废弃键
  for (const key of Object.keys(source)) {
    if (!isDeprecatedLifecycleHook(key)) continue;
    report.deprecatedCount++;
    const target = DEPRECATED_LIFECYCLE_HOOKS[key]!;

    if (Object.prototype.hasOwnProperty.call(out, target)) {
      // 新旧同时存在 ⇒ 保留新名（已在上一步落盘），丢弃旧名
      report.conflicts.push(key);
      continue;
    }

    out[target] = source[key];
    report.renamed.push({ from: key, to: target });
  }

  report.options = out;
  return report;
}
