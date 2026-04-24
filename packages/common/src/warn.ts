/**
 * Lyt.js 警告与错误输出工具
 *
 * 提供 warn、warnOnce、error 等工具函数。
 * 开发模式下输出详细信息，生产模式下静默。
 * 纯原生零依赖 TypeScript 实现。
 */

// ============================================================
// 开发模式状态
// ============================================================

let isDevMode = true;

/**
 * 设置开发/生产模式
 */
export function setDevMode(mode: boolean): void {
  isDevMode = mode;
}

/**
 * 获取当前是否为开发模式
 */
export function getDevMode(): boolean {
  return isDevMode;
}

// ============================================================
// 警告系统
// ============================================================

/** 已警告过的消息集合（warnOnce 去重） */
const warnedMessages: Set<string> = new Set();

/**
 * 仅开发模式输出警告
 */
export function warn(msg: string): void {
  if (!isDevMode) return;
  console.warn(`[Lyt warn] ${msg}`);
}

/**
 * 每条消息只警告一次
 */
export function warnOnce(msg: string): void {
  if (!isDevMode) return;
  if (warnedMessages.has(msg)) return;
  warnedMessages.add(msg);
  console.warn(`[Lyt warn] ${msg}`);
}

/**
 * 始终输出错误信息（不受开发/生产模式限制）
 */
export function error(msg: string): void {
  console.error(`[Lyt error] ${msg}`);
}

/**
 * 重置已警告消息集合（仅用于测试）
 */
export function resetWarnedMessages(): void {
  warnedMessages.clear();
}
