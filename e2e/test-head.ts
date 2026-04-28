/**
 * E2E 测试运行脚本
 *
 * 使用 tsx 直接运行, 支持 TypeScript 和 workspace 包路径解析.
 * 通过 tsx 的 --tsconfig 选项加载项目根目录的 tsconfig.json,
 * 其中的 paths 配置会自动解析 @lytjs/* 到 packages/*/src.
 *
 * 用法: npx tsx --tsconfig tsconfig.json e2e/run-e2e.ts
 */

import * as path from 'path'
import * as fs from 'fs'

// ======================== 简易测试框架 ========================
