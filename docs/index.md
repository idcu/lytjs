---
layout: home

hero:
  name: Lyt.js
  text: 零依赖超轻量前端框架
  tagline: 纯原生实现，无第三方运行时依赖，支持多平台渲染
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: Gitee
      link: https://gitee.com/lytjs/lytjs

features:
  - icon: "\u26A1"
    title: 零依赖
    details: 纯原生 JavaScript/TypeScript 实现，不依赖任何第三方运行时库。从响应式系统到渲染器，全部自研。
  - icon: "\U0001F310"
    title: 多平台支持
    details: 内置 DOM、SSR、原生移动端和小程序渲染器。一套代码，多端运行。
  - icon: "\U0001F4DD"
    title: 增强型 HTML 模板
    details: 基于原生 HTML 的模板语法，支持 v-if、v-each、v-bind、v-on 等指令，学习成本极低。
  - icon: "\U0001F4E6"
    title: 超小体积
    details: gzip 后仅 34.56KB，包含响应式、组件、路由、状态管理等完整功能。
  - icon: "\U0001F3A8"
    title: Composition API
    details: 支持 setup() 组合式 API 和选项式 API，灵活选择开发风格。
  - icon: "\U0001F680"
    title: 高性能编译
    details: 完整的编译器管线（parse -> transform -> optimize -> generate），静态提升优化渲染性能。
  - icon: "\U0001F9E9"
    title: Web Component 适配
    details: v3.1.0 新增 Web Component 适配器，将 Lyt 组件注册为标准 Custom Elements，实现跨框架复用。
  - icon: "\U0001F527"
    title: DevTools 集成
    details: v3.1.0 新增内置 DevTools 模块，提供性能采集、组件分析、内存追踪和渲染追踪能力。
  - icon: "\U0001F30A"
    title: Vapor Mode
    details: v3.1.0 新增 Vapor Mode 编译策略，消除虚拟 DOM 开销，实现接近原生 JavaScript 的渲染性能。
  - icon: "\U0001F6E0\uFE0F"
    title: 增强插件系统
    details: v3.1.0 新增 app.use/unuse/isInstalled 完整生命周期管理，以及 createI18n、createAuth、createLogger 官方插件。
  - icon: "\U0001F3D7\uFE0F"
    title: Islands Architecture
    details: v3.1.0 新增 SSR Islands Architecture，仅对交互组件注水，静态内容零 JS 开销。
  - icon: "\U0001F504"
    title: Partial Hydration
    details: v3.1.0 新增 Partial Hydration，支持按区域配置不同注水策略（immediate/idle/visible/interaction）。
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #6366f1 30%, #8b5cf6);

  --vp-home-hero-image-background-image: linear-gradient(-45deg, #6366f1aa 50%, #8b5cf6aa 50%);
  --vp-home-hero-image-filter: blur(44px);

  --vp-button-brand-bg: #4f46e5;
  --vp-button-brand-hover-bg: #6366f1;
  --vp-button-brand-text: #fff;

  --vp-c-brand-1: #4f46e5;
  --vp-c-brand-2: #6366f1;
  --vp-c-brand-3: #818cf8;
  --vp-c-brand-soft: rgba(79, 70, 229, 0.14);
}
</style>
