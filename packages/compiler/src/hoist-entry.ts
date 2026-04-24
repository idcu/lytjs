/**
 * Lyt.js 模板编译器 — 静态提升 (Static Hoisting) 子路径入口
 *
 * import { analyzeStatic, isHoistableNode, generateHoistedDecls } from '@lytjs/compiler/hoist'
 */

export { analyzeStatic, isHoistableNode, generateHoistedDecls } from './transform-static-hoist';
export type { HoistResult as StaticHoistResult } from './transform-static-hoist';
