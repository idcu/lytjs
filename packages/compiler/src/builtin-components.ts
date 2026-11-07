// src/builtin-components.ts
// 编译器侧的内置组件静态清单（**单一真相**，供 vnode codegen 使用）
//
// 与 `@lytjs/component` 的 `BUILTIN_COMPONENTS` 对应：这五个标签由框架内置，
// 用户无需在 `components` 里注册。编译器在 `mode: 'module'`（AOT）下检测到它们时，
// 直接产出 `import { X } from '@lytjs/component'` + 裸标识符，做到零配置可用
// 且只带入实际用到的实现（ADR 0022 / 方案 B2）。
//
// signal codegen 有自己的子集（Teleport/Suspense 走 `@lytjs/vdom`，其余走
// `@lytjs/component`），不能直接复用本清单，否则会产生重复 import 绑定。

/** 内置组件标签名（大小写敏感，与模板写法逐字一致） */
export const BUILTIN_COMPONENT_NAMES: ReadonlySet<string> = new Set([
  'Teleport',
  'Suspense',
  'Transition',
  'TransitionGroup',
  'KeepAlive',
]);

/** 内置组件实现的导出源（`@lytjs/component` 是唯一权威） */
export const BUILTIN_COMPONENT_MODULE = '@lytjs/component';
