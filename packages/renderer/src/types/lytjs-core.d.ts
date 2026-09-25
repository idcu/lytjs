/**
 * `@lytjs/core` 的最小模块声明（仅供本包的**类型检查**使用）
 *
 * 为什么要这个文件：
 *   renderer 与 core 是**双向**关系 —— core 运行时依赖 renderer，而 renderer 内部会
 *   **动态 import** core（见 `src/hydration/enhanced-hydration.ts`）。
 *   renderer 的 tsconfig 的 `paths` 未映射 `@lytjs/core`，于是：
 *     · `tsc`（走 tsconfig + paths）解析到 `core/dist/index.mjs`（无声明）⇒ TS7016
 *     · `tsup` 的 DTS 构建用另一套模块解析、能找到类型 ⇒ 没有该错误
 *   ⇒ 同一处代码，`@ts-expect-error` 在 tsc 下「有用」、在 DTS 下「多余」（TS2578），
 *     删也错、留也错（两套检查结论相反）。
 *
 * 因此这里声明**最小可用类型**，让两套检查看到同一份签名，从根上消除该矛盾。
 *
 * ⚠️ 注意：不要把它写成 `Parameters<typeof import('@lytjs/core').createApp>[0]` 之类的
 *    **类型查询**并用于本包导出的签名 —— 那会让 renderer 的 .d.ts 依赖 core，
 *    而 core 在构建顺序上后于 renderer ⇒ core 构建时**循环失败**（实测过）。
 * 若将来 renderer 真的需要 core 的完整类型，应改为在 tsconfig 的 `paths` 中映射，
 * 并确认构建顺序不会形成环。
 */
declare module '@lytjs/core' {
  /** 最小签名：本包只用到 createApp(component).mount(el) */
  export function createApp(component: unknown): {
    mount(element: unknown): Promise<void>;
  };
}
