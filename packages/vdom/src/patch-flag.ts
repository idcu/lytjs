/**
 * Lyt.js 虚拟 DOM 引擎 — PatchFlag 位标记系统
 *
 * PatchFlag 用于在编译时标记 VNode 的哪些部分是动态的，
 * 从而在运行时进行精确更新，避免全量 diff。
 *
 * 每个标记是一个独立的位，可以组合使用（位或运算）。
 * 特殊值 HOISTED 和 BAIL 使用负数表示特殊语义。
 */

/**
 * 动态文本内容 —— 文本节点内容发生变化
 * 例：<span>{{ msg }}</span> 中的 msg 变化
 */
export const enum PatchFlags {
  /** 动态文本 */
  TEXT = 1,

  /** 动态 class */
  CLASS = 2,

  /** 动态 style */
  STYLE = 4,

  /** 动态 props（排除 class 和 style） */
  PROPS = 8,

  /** 动态 props，且 props 的键名可能变化，需要完整遍历对比 */
  FULL_PROPS = 16,

  /** 稳定的 Fragment —— 子节点顺序不会变化，只有内容可能变化 */
  STABLE_FRAGMENT = 32,

  /** 带 key 的 Fragment —— 子节点有 key，可进行 keyed diff */
  KEYED_FRAGMENT = 64,

  /** 不带 key 的 Fragment —— 子节点无 key，只能做简单的增删 */
  UNKEYED_FRAGMENT = 128,

  /** 需要 patch —— 即使引用未变也需要执行 patch（如 ref 变化） */
  NEED_PATCH = 256,

  /** 动态插槽 */
  DYNAMIC_SLOTS = 512,

  /**
   * 静态提升标记 —— VNode 已被静态提升，不会变化
   * 特殊值，不参与位运算
   */
  HOISTED = -1,

  /**
   * 退出优化标记 —— 告知 diff 算法此节点不适合优化，应回退到全量 diff
   * 特殊值，不参与位运算
   */
  BAIL = -2,
}

/**
 * 判断 patchFlag 是否包含指定标记
 * @param flag    当前 patchFlag 值
 * @param target  要检测的目标标记
 * @returns 是否包含
 */
export function hasPatchFlag(flag: number | undefined, target: PatchFlags): boolean {
  if (flag === null || flag === undefined || flag < 0) return false
  return (flag & target) !== 0
}

/**
 * 获取 patchFlag 的可读描述（调试用）
 * @param flag patchFlag 值
 * @returns 描述字符串数组
 */
export function describePatchFlag(flag: number | undefined): string[] {
  if (flag === null || flag === undefined) return ['NONE']
  if (flag === PatchFlags.HOISTED) return ['HOISTED']
  if (flag === PatchFlags.BAIL) return ['BAIL']

  const names: string[] = []
  const mapping: Record<number, string> = {
    [PatchFlags.TEXT]: 'TEXT',
    [PatchFlags.CLASS]: 'CLASS',
    [PatchFlags.STYLE]: 'STYLE',
    [PatchFlags.PROPS]: 'PROPS',
    [PatchFlags.FULL_PROPS]: 'FULL_PROPS',
    [PatchFlags.STABLE_FRAGMENT]: 'STABLE_FRAGMENT',
    [PatchFlags.KEYED_FRAGMENT]: 'KEYED_FRAGMENT',
    [PatchFlags.UNKEYED_FRAGMENT]: 'UNKEYED_FRAGMENT',
    [PatchFlags.NEED_PATCH]: 'NEED_PATCH',
    [PatchFlags.DYNAMIC_SLOTS]: 'DYNAMIC_SLOTS',
  }

  for (const [value, name] of Object.entries(mapping)) {
    if (flag & Number(value)) {
      names.push(name)
    }
  }

  return names.length > 0 ? names : ['NONE']
}
