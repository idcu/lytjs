/**
 * Lyt.js 模板编译器 — 补丁标记 (Patch Flags)
 *
 * 为动态节点生成精确的补丁标记，使运行时 diff 算法可以跳过
 * 未变化的属性，只更新标记为动态的部分。
 *
 * 类似于 Vue 3 的 patchFlag 机制，每个标记对应一种动态特征。
 * 多个标记可以通过位运算组合（|）。
 */

// ============================================================
// 补丁标记枚举
// ============================================================

/**
 * 编译器补丁标记
 *
 * 使用位掩码表示节点的动态特征，运行时根据标记进行精准更新。
 * 多个标记可通过 | 运算组合。
 */
export enum CompilerPatchFlags {
  /** 动态文本内容 */
  TEXT = 1,
  /** 动态 class 绑定 */
  CLASS = 2,
  /** 动态 style 绑定 */
  STYLE = 4,
  /** 动态 props（非 class/style） */
  PROPS = 8,
  /** 动态 keys + props（需要完整 diff） */
  FULL_PROPS = 16,
  /** 动态事件处理器 */
  EVENT = 32,
  /** 动态插槽 */
  SLOTS = 64,
  /** 稳定片段（子节点顺序不变） */
  STABLE_FRAGMENT = 128,
  /** 带有 key 的片段 */
  KEYED_FRAGMENT = 256,
  /** 不带 key 的片段 */
  UNKEYED_FRAGMENT = 512,
  /** 强制补丁（devtools 等） */
  NEED_PATCH = 1024,
  /** 动态插槽 */
  DYNAMIC_SLOTS = 2048,
  /** 静态节点，已提升 */
  HOISTED = -1,
  /** 退出优化，使用完整 diff 算法 */
  BAIL = -2,
}

// ============================================================
// 补丁标记分析
// ============================================================

/**
 * 为 AST 节点计算补丁标记
 *
 * 根据节点的动态特征（绑定、事件、指令等）计算精确的补丁标记。
 *
 * @param node AST 节点（ElementNode 或 TextNode）
 * @returns 补丁标记值
 */
export function getPatchFlag(node: any): number {
  // 文本节点：有插值表达式
  if (node.type === 'Text') {
    if (node.isExpression) {
      return CompilerPatchFlags.TEXT;
    }
    return CompilerPatchFlags.HOISTED;
  }

  // 元素节点
  if (node.type !== 'Element') {
    return 0;
  }

  let flag = 0;

  // 检查条件渲染（v-if）→ 需要完整 diff
  if (node.ifCondition) {
    return CompilerPatchFlags.BAIL;
  }

  // 检查循环渲染（v-each）→ 需要 NEED_PATCH
  if (node.eachInfo) {
    return CompilerPatchFlags.NEED_PATCH;
  }

  // 检查动态绑定
  if (node.bindings && node.bindings.length > 0) {
    for (const binding of node.bindings) {
      if (binding.arg === 'class') {
        flag |= CompilerPatchFlags.CLASS;
      } else if (binding.arg === 'style') {
        flag |= CompilerPatchFlags.STYLE;
      } else if (binding.isModel) {
        // 双向绑定涉及 value + callback，标记为 PROPS
        flag |= CompilerPatchFlags.PROPS;
      } else {
        flag |= CompilerPatchFlags.PROPS;
      }
    }
  }

  // 检查事件绑定
  if (node.events && node.events.length > 0) {
    flag |= CompilerPatchFlags.EVENT;
  }

  // 检查插槽
  if (node.slotInfo) {
    flag |= CompilerPatchFlags.SLOTS;
  }

  // 检查引用
  if (node.refInfo) {
    flag |= CompilerPatchFlags.NEED_PATCH;
  }

  // 检查子节点中是否有动态内容
  if (node.children && node.children.length > 0) {
    const hasDynamicChild = node.children.some((child: any) => {
      if (child.type === 'Text' && child.isExpression) return true;
      if (child.type === 'Element') {
        // 子元素有指令、绑定或事件
        if (child.directives && child.directives.length > 0) return true;
        if (child.ifCondition) return true;
        if (child.eachInfo) return true;
        if (child.bindings && child.bindings.length > 0) return true;
        if (child.events && child.events.length > 0) return true;
      }
      return false;
    });

    if (hasDynamicChild) {
      // 检查是否有 keyed 的子节点
      const hasKeyed = node.children.some((child: any) => {
        return child.type === 'Element' && child.props?.some(
          (p: any) => p.name === 'key' && p.isDynamic
        );
      });

      if (hasKeyed) {
        flag |= CompilerPatchFlags.KEYED_FRAGMENT;
      } else {
        flag |= CompilerPatchFlags.UNKEYED_FRAGMENT;
      }
    }
  }

  // 如果没有动态特征，标记为已提升
  if (flag === 0 && node.staticFlag === 1) {
    return CompilerPatchFlags.HOISTED;
  }

  return flag;
}

/**
 * 检查补丁标记是否包含指定特征
 *
 * @param flag 当前补丁标记
 * @param check 要检查的特征标记
 * @returns 是否包含
 */
export function hasPatchFlag(flag: number, check: number): boolean {
  return (flag & check) === check;
}

/**
 * 获取补丁标记的描述字符串（用于调试）
 *
 * @param flag 补丁标记值
 * @returns 标记描述
 */
export function describePatchFlag(flag: number): string {
  if (flag === CompilerPatchFlags.HOISTED) return 'HOISTED';
  if (flag === CompilerPatchFlags.BAIL) return 'BAIL';

  const parts: string[] = [];
  if (flag & CompilerPatchFlags.TEXT) parts.push('TEXT');
  if (flag & CompilerPatchFlags.CLASS) parts.push('CLASS');
  if (flag & CompilerPatchFlags.STYLE) parts.push('STYLE');
  if (flag & CompilerPatchFlags.PROPS) parts.push('PROPS');
  if (flag & CompilerPatchFlags.FULL_PROPS) parts.push('FULL_PROPS');
  if (flag & CompilerPatchFlags.EVENT) parts.push('EVENT');
  if (flag & CompilerPatchFlags.SLOTS) parts.push('SLOTS');
  if (flag & CompilerPatchFlags.STABLE_FRAGMENT) parts.push('STABLE_FRAGMENT');
  if (flag & CompilerPatchFlags.KEYED_FRAGMENT) parts.push('KEYED_FRAGMENT');
  if (flag & CompilerPatchFlags.UNKEYED_FRAGMENT) parts.push('UNKEYED_FRAGMENT');
  if (flag & CompilerPatchFlags.NEED_PATCH) parts.push('NEED_PATCH');
  if (flag & CompilerPatchFlags.DYNAMIC_SLOTS) parts.push('DYNAMIC_SLOTS');

  return parts.length > 0 ? parts.join(' | ') : 'NONE';
}
