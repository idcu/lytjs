/**
 * 循环安全的 `JSON.stringify` —— **内部工具，不从包入口导出**
 *
 * ## 为什么需要
 *
 * devtools 要序列化的对象（组件 props、状态快照）**常带 parent / instance 回指**，
 * 直接 `JSON.stringify` 会抛 `TypeError: Converting circular structure to JSON`。
 * 本工具把重复出现的对象替换为 `'[Circular]'`，保证序列化**永不抛**。
 *
 * ## 为什么放在独立文件
 *
 * `debugEnhancer`（检查点比较）与 `componentTree`（props 展示）都需要它。
 * 按 ADR 0011 的口径「同名能力只留一份实现」，不各写一份。
 */

export function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, val: unknown) => {
      if (val !== null && typeof val === 'object') {
        if (seen.has(val as object)) return '[Circular]';
        seen.add(val as object);
      }
      return val;
    });
  } catch {
    // BigInt / toJSON 抛错等兜底：至少给出可读文本，不把调用方炸掉
    return String(value);
  }
}
