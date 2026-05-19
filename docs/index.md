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
      text: 🏠 新手入门
      link: /getting-started/
    - theme: alt
      text: 📚 核心指南
      link: /guide/
    - theme: alt
      text: 🤝 贡献指南
      link: /contribute/

features:
  - icon: ⚡
    title: 极致性能
    details: 基于 Signal 的细粒度响应式系统，只更新真正需要的部分
    link: /guide/reactivity
  - icon: 🧩
    title: 渐进式架构
    details: 8 层清晰架构，按需引入，从简单组件到复杂应用
    link: /contribute/architecture/8-layer-architecture
  - icon: 🔧
    title: 完整生态
    details: Router、Store、UI 组件库、DevTools、SSR 一应俱全
    link: /ecosystem/
  - icon: 📦
    title: TypeScript 优先
    details: 完整的类型定义，零运行时第三方依赖
    link: /guide/typescript
  - icon: 🚀
    title: 双渲染模式
    details: 支持 VNode 虚拟 DOM 模式和 Signal 细粒度渲染模式
    link: /guide/rendering-modes
  - icon: 🛡️
    title: 零依赖
    details: 所有核心包零第三方依赖，可预测、易维护
    link: /contribute/principles/zero-dependency
---

## 快速导航

<div class="quick-nav">
  <div class="nav-card">
    <h3>📦 包文档</h3>
    <p>查看所有核心包的详细文档</p>
    <a href="/packages/" class="btn">浏览包文档 →</a>
  </div>
  <div class="nav-card">
    <h3>🔌 插件生态</h3>
    <p>官方插件和社区插件</p>
    <a href="/plugins/" class="btn">探索插件 →</a>
  </div>
  <div class="nav-card">
    <h3>🌐 生态系统</h3>
    <p>Router、Store、UI 组件等</p>
    <a href="/ecosystem/" class="btn">查看生态 →</a>
  </div>
  <div class="nav-card">
    <h3>🔍 API 参考</h3>
    <p>完整的 API 文档索引</p>
    <a href="/api/" class="btn">查看 API →</a>
  </div>
</div>

## 按目标群体导航

<div class="target-nav">
  <div class="target-section">
    <h3>🏠 新手用户</h3>
    <p>简单三步骤，快速开始！</p>
    <ul>
      <li><a href="/getting-started/quick-start">快速开始</a></li>
      <li><a href="/getting-started/tutorials/todo-app">Todo 应用实战</a></li>
      <li><a href="/guide/">继续深入指南</a></li>
    </ul>
  </div>
  <div class="target-section">
    <h3>👨‍💻 有经验的开发者</h3>
    <p>直接查看核心文档和 API 参考！</p>
    <ul>
      <li><a href="/guide/">核心指南</a></li>
      <li><a href="/api/">API 参考</a></li>
      <li><a href="/packages/">包文档</a></li>
    </ul>
  </div>
  <div class="target-section">
    <h3>🤝 贡献者</h3>
    <p>了解如何为 LytJS 贡献！</p>
    <ul>
      <li><a href="/contribute/">贡献首页</a></li>
      <li><a href="/contribute/architecture/8-layer-architecture">了解架构</a></li>
      <li><a href="/contribute/development/guidelines">遵循规范</a></li>
    </ul>
  </div>
</div>

## 学习路径

<div class="learning-path">
  <div class="path-card">
    <h4>新手友好路径</h4>
    <ol>
      <li>新手入门 → 快速开始</li>
      <li>响应式基础 → 组件开发</li>
      <li>实战案例 → 核心指南</li>
      <li>API 参考 → 生态系统</li>
    </ol>
  </div>
  <div class="path-card">
    <h4>开发者深入路径</h4>
    <ol>
      <li>已了解概念 → 架构设计</li>
      <li>API 参考 → 包文档</li>
      <li>插件开发 → 生态系统</li>
      <li>性能优化 → 贡献指南</li>
    </ol>
  </div>
</div>

## 文档结构概览

```
docs/
├── getting-started/  # 🏠 新手入门
├── guide/            # 📚 核心指南
├── tutorials/        # 🎓 实战教程
├── packages/         # 📦 包文档
├── plugins/          # 🔌 插件生态
├── ecosystem/        # 🌐 生态系统
├── api/              # 🔍 API 参考
├── examples/         # 💻 示例代码
├── reference/        # 🔗 参考资料
├── contribute/       # 🤝 贡献指南
├── community/        # 👥 社区文档
└── legacy/           # 📦 旧文档备份
```

开始你的 LytJS 之旅吧！🚀

<style>
.quick-nav {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.nav-card {
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  border-radius: 12px;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.nav-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.nav-card h3 {
  margin: 0 0 10px 0;
  font-size: 1.2rem;
}

.nav-card p {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 0.9rem;
}

.nav-card .btn {
  display: inline-block;
  padding: 8px 20px;
  background: var(--vp-c-brand);
  color: white;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.9rem;
  transition: background 0.3s ease;
}

.nav-card .btn:hover {
  background: var(--vp-c-brand-soft);
  text-decoration: none;
}

.target-nav {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.target-section {
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid #eee;
}

.target-section h3 {
  margin: 0 0 12px 0;
  font-size: 1.2rem;
}

.target-section p {
  margin: 0 0 16px 0;
  color: #666;
}

.target-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.target-section li {
  padding: 6px 0;
}

.target-section a {
  color: var(--vp-c-brand);
  text-decoration: none;
}

.target-section a:hover {
  text-decoration: underline;
}

.learning-path {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.path-card {
  padding: 24px;
  background: linear-gradient(135deg, #fff9f0 0%, #fff5e6 100%);
  border-radius: 12px;
  border: 1px solid #ffe6c2;
}

.path-card h4 {
  margin: 0 0 16px 0;
  color: #d46a00;
}

.path-card ol {
  margin: 0;
  padding-left: 20px;
  color: #555;
}

.path-card li {
  padding: 4px 0;
}
</style>
