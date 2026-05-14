---
layout: home

hero:
  name: LytJS
  text: 轻量级渐进式框架
  tagline: 高性能、易扩展、现代化 JavaScript 应用框架
  image:
    src: /logo.svg
    alt: LytJS
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 查看示例
      link: /examples/
    - theme: alt
      text: 在 Gitee 查看
      link: https://gitee.com/lytjs/lytjs

features:
  - icon: ⚡
    title: 极致性能
    details: 基于 Signal 的细粒度响应式系统，只更新真正需要更新的部分，带来极致的性能体验
  - icon: 🧩
    title: 渐进式架构
    details: 8 层清晰架构，按需引入，从简单组件到复杂应用，逐步增强，灵活可扩展
  - icon: 🔧
    title: 完整生态
    details: Router、Store、UI 组件库、DevTools、SSR、图表库一应俱全，开箱即用
  - icon: 📦
    title: TypeScript 优先
    details: 完整的类型定义，零运行时第三方依赖，提供卓越的类型安全开发体验
  - icon: 🎨
    title: 组件化开发
    details: 声明式组件系统，支持组合式 API，60+ UI 组件，适配多种主题
  - icon: 🚀
    title: 服务端渲染
    details: 内置 SSR 支持，流式渲染、静态生成，轻松构建 SEO 友好的高性能应用
  - icon: 🔍
    title: 强大 DevTools
    details: 时间旅行调试、信号依赖图、性能分析面板，让开发调试更高效
  - icon: 🛡️
    title: 零运行时依赖
    details: 所有核心功能自主实现，零第三方运行时依赖，保证代码纯净可控
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #4fc08d 30%, #42b883);
  --vp-home-hero-image-background-image: linear-gradient(-45deg, #4fc08d50 50%, #42b88350 50%);
  --vp-home-hero-image-filter: blur(44px);
}
</style>

## 快速开始

```bash
# 使用 LytJS CLI 创建新项目
npx @lytjs/cli create my-app

# 进入项目目录
cd my-app

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

## 项目状态

- **版本**: v6.0.0
- **状态**: 稳定版
- **许可证**: MIT
- **生态**: 完整
- **测试**: 高覆盖率
