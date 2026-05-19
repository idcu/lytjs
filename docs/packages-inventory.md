# LytJS v6.5.0 完整包清单

> 生成时间: 2026/5/19 18:54:13

## 目录

- [📊 发布统计](#发布统计)
- [📦 完整包列表](#完整包列表)
  - [L0: 基础工具层](#l0-基础工具层)
  - [L1: 核心原语层](#l1-核心原语层)
  - [L2: 渲染引擎层](#l2-渲染引擎层)
  - [L3: 核心框架层](#l3-核心框架层)
  - [L4: 生态系统](#l4-生态系统)
  - [L5: UI 组件](#l5-ui-组件)
  - [L6: 插件系统](#l6-插件系统)
  - [L7: 工具包](#l7-工具包)

---

## 发布统计

| 统计项 | 数量 |
|-------|------|
| 总包数 | 75 |
| ✅ 已发布 | 75 |
| ⚠️ 版本不匹配 | 0 |
| ❌ 未发布 | 0 |

---

## 完整包列表

### L0: 基础工具层

#### ✅ @lytjs/shared-types

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/shared-types`
- **描述**: LytJS 共享类型定义
- **关键词**: lytjs, shared-types, types

#### ✅ @lytjs/common-constants

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/constants`
- **描述**: LytJS common constants - Global shared constants for the framework
- **关键词**: lytjs, constants, shared

#### ✅ @lytjs/common-is

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/is`
- **描述**: Type checking utilities for LytJS

#### ✅ @lytjs/common-object

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/object`
- **描述**: Object manipulation utilities for LytJS
- **依赖**: `@lytjs/common-constants`, `@lytjs/common-is`

#### ✅ @lytjs/common-string

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/string`
- **描述**: String manipulation utilities for LytJS
- **依赖**: `@lytjs/common-constants`, `@lytjs/common-security`

#### ✅ @lytjs/common-path

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/path`
- **描述**: Path manipulation utilities for LytJS

#### ✅ @lytjs/common-error

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/error`
- **描述**: Error handling utilities for LytJS
- **依赖**: `@lytjs/common-constants`

#### ✅ @lytjs/common-warn

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/warn`
- **描述**: Framework-level warning system for Lyt.js

#### ✅ @lytjs/common-events

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/events`
- **描述**: Event emitter and subscription utilities for LytJS
- **依赖**: `@lytjs/common-is`

#### ✅ @lytjs/common-cache

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/cache`
- **描述**: Caching strategies for LytJS

#### ✅ @lytjs/common-timing

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/timing`
- **描述**: Timing and scheduling utilities for LytJS

#### ✅ @lytjs/common-scheduler

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/scheduler`
- **描述**: Task scheduler for LytJS
- **依赖**: `@lytjs/common-env`

#### ✅ @lytjs/common-algorithm

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/algorithm`
- **描述**: Algorithm utilities for LytJS

#### ✅ @lytjs/common-vnode

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/vnode`
- **描述**: VNode types and constants for LytJS

#### ✅ @lytjs/common-env

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/env`
- **描述**: Environment detection utilities for LytJS

#### ✅ @lytjs/common-dom

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/dom`
- **描述**: Shared DOM utilities for Lyt.js - SVG tags, patchClass, patchStyle, patchAttr, patchProp
- **关键词**: lytjs, dom, svg, patch
- **依赖**: `@lytjs/common-is`, `@lytjs/common-string`, `@lytjs/common-events`, `@lytjs/common-error`

#### ✅ @lytjs/common-dom-helpers

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/dom-helpers`
- **描述**: Lightweight DOM manipulation helpers for LytJS

#### ✅ @lytjs/common-query

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/query`
- **描述**: URL query string parsing and building utilities for LytJS

#### ✅ @lytjs/common-raf

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/raf`
- **描述**: Cross-platform requestAnimationFrame utilities for LytJS

#### ✅ @lytjs/common-security

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/security`
- **依赖**: `@lytjs/common-is`

#### ✅ @lytjs/common-storage

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/storage`
- **描述**: Lightweight type-safe storage utilities for LytJS

#### ✅ @lytjs/common-validate

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/validate`
- **描述**: Lightweight validation utilities for LytJS

#### ✅ @lytjs/common-http

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/http`
- **描述**: Lightweight HTTP client for LytJS based on native fetch API

#### ✅ @lytjs/common-keyboard

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/keyboard`
- **描述**: Lightweight keyboard shortcut utilities for LytJS

#### ✅ @lytjs/common-a11y

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/a11y`
- **描述**: Lightweight accessibility utilities for LytJS

#### ✅ @lytjs/common-performance

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/performance`
- **描述**: Performance monitoring API for component render timing in LytJS
- **依赖**: `@lytjs/common-error`

#### ✅ @lytjs/common-assertions

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/assertions`
- **描述**: Type assertion utilities for LytJS
- **依赖**: `@lytjs/common-is`

#### ✅ @lytjs/common-async-scheduler

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/async-scheduler`
- **描述**: Async scheduler for unified timing operations with priority support in LytJS
- **依赖**: `@lytjs/host-contract`

#### ✅ @lytjs/common-event-normalizer

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/event-normalizer`
- **描述**: Event normalization utilities for parsing event names and managing invoker cache in LytJS
- **依赖**: `@lytjs/host-contract`, `@lytjs/common-events`

#### ✅ @lytjs/common-node-cache

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/node-cache`
- **描述**: Node cache for managing container-VNode mappings and component resource registries in LytJS
- **依赖**: `@lytjs/host-contract`

#### ✅ @lytjs/common-render-queue

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/render-queue`
- **描述**: Render queue for batching and merging render operations in LytJS
- **依赖**: `@lytjs/host-contract`

#### ✅ @lytjs/common-transition-engine

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/transition-engine`
- **描述**: Platform-agnostic transition engine with FLIP animation support for LytJS
- **依赖**: `@lytjs/host-contract`

#### ✅ @lytjs/common-memory

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/memory`
- **描述**: Memory optimization utilities for LytJS
- **关键词**: lytjs, memory, object-pool, leak-detection

### L1: 核心原语层

#### ✅ @lytjs/common

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/common/packages/common`
- **描述**: LytJS common utilities aggregate package
- **依赖**: `@lytjs/common-env`, `@lytjs/common-is`, `@lytjs/common-string`, `@lytjs/common-path`, `@lytjs/common-events`, `@lytjs/common-cache`, `@lytjs/common-timing`, `@lytjs/common-algorithm`, `@lytjs/common-vnode`, `@lytjs/common-error`, `@lytjs/common-object`, `@lytjs/common-scheduler`, `@lytjs/common-dom`, `@lytjs/common-query`, `@lytjs/common-dom-helpers`, `@lytjs/common-a11y`, `@lytjs/common-keyboard`, `@lytjs/common-storage`, `@lytjs/common-validate`, `@lytjs/common-http`, `@lytjs/common-raf`, `@lytjs/common-warn`, `@lytjs/common-render-queue`, `@lytjs/common-event-normalizer`, `@lytjs/common-node-cache`, `@lytjs/common-async-scheduler`, `@lytjs/common-transition-engine`, `@lytjs/common-performance`

#### ✅ @lytjs/host-contract

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/host-contract`
- **描述**: LytJS 统一渲染宿主契约 - 跨平台渲染接口定义
- **关键词**: lytjs, host-contract, renderer-host, cross-platform, adapter

#### ✅ @lytjs/reactivity

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/reactivity`
- **描述**: LytJS reactive system - signals, refs, computed, watch, and effects
- **关键词**: lytjs, reactivity, signal, vue, reactive, computed, watch
- **依赖**: `@lytjs/shared-types`, `@lytjs/common-is`, `@lytjs/common-scheduler`, `@lytjs/common-error`, `@lytjs/common-constants`, `@lytjs/common-assertions`

#### ✅ @lytjs/vdom

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/vdom`
- **描述**: LytJS virtual DOM - vnode creation, diffing algorithm, and patch flags
- **依赖**: `@lytjs/shared-types`, `@lytjs/common-is`, `@lytjs/common-vnode`, `@lytjs/common-algorithm`, `@lytjs/common-string`, `@lytjs/common-events`, `@lytjs/common-dom`, `@lytjs/common-transition-engine`, `@lytjs/common-assertions`, `@lytjs/common-error`, `@lytjs/common-object`, `@lytjs/common-constants`, `@lytjs/host-contract`

### L2: 渲染引擎层

#### ✅ @lytjs/dom-runtime

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/dom-runtime`
- **描述**: LytJS Signal 模式 DOM 运行时 - 细粒度 DOM 操作
- **依赖**: `@lytjs/reactivity`

#### ✅ @lytjs/compiler

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/compiler`
- **描述**: LytJS template compiler - parse, transform, optimize and codegen
- **依赖**: `@lytjs/common-is`, `@lytjs/common-error`, `@lytjs/common-vnode`, `@lytjs/common-string`, `@lytjs/common-constants`

#### ✅ @lytjs/component

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/component`
- **描述**: LytJS component system - component instances, props, emits, slots, and lifecycle
- **依赖**: `@lytjs/shared-types`, `@lytjs/reactivity`, `@lytjs/vdom`, `@lytjs/common-vnode`, `@lytjs/common-is`, `@lytjs/common-scheduler`, `@lytjs/common-error`, `@lytjs/common-string`

#### ✅ @lytjs/renderer

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/renderer`
- **描述**: LytJS renderer - DOM, SSR, and Vapor rendering backends
- **依赖**: `@lytjs/reactivity`, `@lytjs/vdom`, `@lytjs/common-is`, `@lytjs/common-string`, `@lytjs/common-events`, `@lytjs/common-dom`, `@lytjs/common-error`, `@lytjs/dom-runtime`, `@lytjs/compiler`, `@lytjs/host-contract`, `@lytjs/adapter-web`

#### ✅ @lytjs/adapter-web

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/adapter-web`
- **描述**: LytJS Web 平台适配器 - 浏览器 DOM 的 RendererHost 实现
- **关键词**: lytjs, adapter-web, dom, renderer
- **依赖**: `@lytjs/host-contract`, `@lytjs/common-dom`, `@lytjs/common-events`, `@lytjs/common-is`, `@lytjs/common-string`, `@lytjs/common-error`, `@lytjs/shared-types`, `@lytjs/vdom`, `@lytjs/reactivity`

### L3: 核心框架层

#### ✅ @lytjs/dom

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/dom`
- **描述**: LytJS DOM utilities - Web Components integration and DOM enhancements
- **关键词**: lytjs, dom, web-components
- **依赖**: `@lytjs/common-is`, `@lytjs/common-string`

#### ✅ @lytjs/web

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/web`
- **描述**: LytJS web platform utilities - CSS variables and web-specific features
- **关键词**: lytjs, web, css-variables, theme

#### ✅ @lytjs/core

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/core`
- **描述**: LytJS core - createApp, h, defineComponent, and plugin system
- **关键词**: lytjs, core, createApp, h, defineComponent, plugin
- **依赖**: `@lytjs/shared-types`, `@lytjs/reactivity`, `@lytjs/vdom`, `@lytjs/compiler`, `@lytjs/renderer`, `@lytjs/component`, `@lytjs/common-is`, `@lytjs/common-string`, `@lytjs/common-scheduler`, `@lytjs/common-error`, `@lytjs/common-object`

### L4: 生态系统

#### ✅ @lytjs/core-signal

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/core-signal`
- **描述**: Lyt.js Core - Signal rendering mode only
- **关键词**: lytjs, core, signal, createApp, fine-grained, reactive
- **依赖**: `@lytjs/component`, `@lytjs/reactivity`, `@lytjs/compiler`, `@lytjs/renderer`, `@lytjs/dom-runtime`, `@lytjs/common-scheduler`, `@lytjs/common-error`, `@lytjs/shared-types`

#### ✅ @lytjs/core-vnode

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/core-vnode`
- **描述**: Lyt.js Core - VNode rendering mode only
- **关键词**: lytjs, core, vnode, createApp, h, defineComponent
- **依赖**: `@lytjs/component`, `@lytjs/reactivity`, `@lytjs/vdom`, `@lytjs/compiler`, `@lytjs/renderer`, `@lytjs/common-scheduler`, `@lytjs/common-error`, `@lytjs/shared-types`

#### ✅ @lytjs/router

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/ecosystem/packages/router`
- **描述**: LytJS declarative routing system with support for nested routes, navigation guards, and history modes
- **关键词**: lytjs, router, routing, spa
- **依赖**: `@lytjs/common-is`, `@lytjs/common-env`, `@lytjs/reactivity`, `@lytjs/component`, `@lytjs/vdom`

#### ✅ @lytjs/router-fs

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/ecosystem/packages/router-fs`
- **描述**: LytJS File-System based Router Engine
- **关键词**: lytjs, router, file-system, fs

#### ✅ @lytjs/api

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/ecosystem/packages/api`
- **描述**: LytJS API Router Engine
- **关键词**: lytjs, api, router, file-system
- **依赖**: `@lytjs/common-http`

#### ✅ @lytjs/store

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/ecosystem/packages/store`
- **描述**: LytJS Signal-based state management with Option Store and Setup Store patterns
- **关键词**: lytjs, store, state, signal, reactive
- **依赖**: `@lytjs/common-is`, `@lytjs/common-object`, `@lytjs/reactivity`, `@lytjs/component`

#### ✅ @lytjs/ssr

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/ecosystem/packages/ssr`
- **描述**: LytJS Server-Side Rendering support
- **关键词**: lytjs, ssr, server-side-rendering
- **依赖**: `@lytjs/common-is`, `@lytjs/common-env`, `@lytjs/common-dom`, `@lytjs/reactivity`, `@lytjs/component`, `@lytjs/vdom`

#### ✅ @lytjs/compat

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/ecosystem/packages/compat`
- **描述**: LytJS Vue 2/3 compatibility layer for migration support
- **关键词**: lytjs, compat, migration, vue
- **依赖**: `@lytjs/reactivity`, `@lytjs/component`, `@lytjs/core`

#### ✅ @lytjs/devtools

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/ecosystem/packages/devtools`
- **描述**: LytJS Developer Tools for debugging and inspecting applications
- **关键词**: lytjs, devtools, debugging, inspector
- **依赖**: `@lytjs/common-is`, `@lytjs/common-env`, `@lytjs/common-dom`, `@lytjs/common-object`, `@lytjs/reactivity`, `@lytjs/component`, `@lytjs/vdom`, `@lytjs/router`, `@lytjs/store`

#### ✅ @lytjs/platform-adapter

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/ecosystem/packages/platform-adapter`
- **描述**: LytJS 跨平台渲染适配器
- **关键词**: lytjs, platform-adapter, cross-platform, renderer
- **依赖**: `@lytjs/common-is`, `@lytjs/common-constants`, `@lytjs/vdom`, `@lytjs/common-vnode`

#### ✅ @lytjs/bundler

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/ecosystem/packages/bundler`
- **描述**: LytJS bundler integration for Vite
- **关键词**: lytjs, bundler, vite, webpack

### L5: UI 组件

#### ✅ @lytjs/hmr

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/ecosystem/packages/hmr`
- **描述**: LytJS Hot Module Replacement support
- **关键词**: lytjs, hmr, hot-module-replacement

### L6: 插件系统

#### ✅ @lytjs/runtime-edge

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/ecosystem/packages/runtime-edge`
- **描述**: LytJS edge runtime support for serverless and edge computing environments
- **关键词**: lytjs, edge, serverless, runtime, edge-functions

#### ✅ @lytjs/ui

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/ecosystem/packages/ui`
- **描述**: LytJS 官方 UI 组件库，包含 Button、Input、Dialog 等组件
- **关键词**: lytjs, ui, components, button, input, dialog
- **依赖**: `@lytjs/common-is`, `@lytjs/common-env`, `@lytjs/common-dom`, `@lytjs/common-a11y`, `@lytjs/reactivity`, `@lytjs/component`, `@lytjs/vdom`

#### ✅ @lytjs/plugin-vite

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/plugins/packages/plugin-vite`
- **描述**: LytJS official Vite plugin for SFC compilation, HMR, and build optimizations
- **关键词**: lytjs, vite, plugin, sfc, hmr
- **依赖**: `@lytjs/compiler`, `@lytjs/common-is`

#### ✅ @lytjs/plugin-theme

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/plugins/packages/plugin-theme`
- **描述**: LytJS official theme plugin for CSS variable management, dark/light mode, and custom theme support
- **关键词**: lytjs, theme, dark-mode, css-variables
- **依赖**: `@lytjs/core`, `@lytjs/reactivity`, `@lytjs/common-is`

#### ✅ @lytjs/plugin-logger

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/plugins/packages/plugin-logger`
- **描述**: LytJS official logger plugin with log levels, persistence, and performance tracing support
- **关键词**: lytjs, logger, logging, debug, performance
- **依赖**: `@lytjs/core`, `@lytjs/reactivity`, `@lytjs/common-is`

#### ✅ @lytjs/plugin-auth

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/plugins/packages/plugin-auth`
- **描述**: LytJS official auth plugin for route authorization, permission checking, and role management
- **关键词**: lytjs, auth, authorization, permission, role
- **依赖**: `@lytjs/core`, `@lytjs/reactivity`, `@lytjs/common-is`

#### ✅ @lytjs/plugin-storage

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/plugins/packages/plugin-storage`
- **描述**: LytJS official storage plugin with localStorage and sessionStorage support, plus JSON serialization
- **关键词**: lytjs, storage, localStorage, sessionStorage, persistence
- **依赖**: `@lytjs/core`, `@lytjs/reactivity`, `@lytjs/common-is`

#### ✅ @lytjs/plugin-i18n

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/plugins/packages/plugin-i18n`
- **描述**: LytJS Internationalization plugin
- **关键词**: lytjs, i18n, internationalization, localization
- **依赖**: `@lytjs/core`, `@lytjs/reactivity`, `@lytjs/common-is`

#### ✅ @lytjs/plugin-form

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/plugins/packages/plugin-form`
- **描述**: LytJS official form plugin for form state management, validation, and submission
- **关键词**: lytjs, form, validation, form-state
- **依赖**: `@lytjs/core`, `@lytjs/reactivity`

#### ✅ @lytjs/plugin-validation

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/plugins/packages/plugin-validation`
- **描述**: LytJS official validation plugin for type-safe form validation
- **关键词**: lytjs, validation, form, validator
- **依赖**: `@lytjs/core`, `@lytjs/reactivity`, `@lytjs/plugin-form`

#### ✅ @lytjs/plugin-data

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/plugins/packages/plugin-data`
- **描述**: LytJS official enhanced data plugin with optimistic updates, deduplication, and store integration
- **关键词**: lytjs, data, fetch, optimistic, store
- **依赖**: `@lytjs/core`, `@lytjs/reactivity`, `@lytjs/plugin-data-fetch`

#### ✅ @lytjs/plugin-data-fetch

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/plugins/packages/plugin-data-fetch`
- **描述**: LytJS official data fetch plugin with caching, retries, and interceptors
- **关键词**: lytjs, fetch, ajax, cache, interceptor
- **依赖**: `@lytjs/core`, `@lytjs/reactivity`

#### ✅ @lytjs/plugin-chart

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/plugins/packages/plugin-chart`
- **描述**: LytJS official chart plugin for rendering charts using Canvas API with zero dependencies
- **关键词**: lytjs, chart, canvas, visualization
- **依赖**: `@lytjs/core`

#### ✅ @lytjs/plugin-animation

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/plugins/packages/plugin-animation`
- **描述**: LytJS official animation plugin with CSS transitions and animations
- **关键词**: lytjs, animation, transition, css-animation
- **依赖**: `@lytjs/core`, `@lytjs/reactivity`

### L7: 工具包

#### ✅ @lytjs/plugin-testing

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/plugins/packages/plugin-testing`
- **描述**: LytJS official testing plugin with testing utilities and helpers
- **关键词**: lytjs, testing, test-utilities
- **依赖**: `@lytjs/core`, `@lytjs/reactivity`

#### ✅ @lytjs/cli

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/tools/packages/cli`
- **描述**: LytJS project scaffolding and development CLI tool
- **关键词**: lyt, cli, scaffold, create-lyt
- **依赖**: `@lytjs/common-is`, `@lytjs/common-env`

#### ✅ @lytjs/devtools-extension

- **状态**: 已发布
- **本地版本**: 6.5.0
- **npm 版本**: 6.5.0
- **路径**: `packages/tools/packages/devtools`
- **描述**: LytJS browser DevTools extension for debugging LytJS applications
- **关键词**: lytjs, devtools, debug, inspector, extension
- **依赖**: `@lytjs/reactivity`, `@lytjs/component`, `@lytjs/common-string`

