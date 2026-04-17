import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'Lyt.js',
  description: '零依赖超轻量前端框架',

  head: [
    ['meta', { name: 'theme-color', content: '#4f46e5' }],
    ['meta', { name: 'keywords', content: 'lyt, lytjs, 前端框架, 零依赖, 轻量' }],
    ['meta', { name: 'author', content: 'Lyt.js Team' }],
    ['meta', { name: 'og:title', content: 'Lyt.js - 零依赖超轻量前端框架' }],
    ['meta', { name: 'og:description', content: '零依赖超轻量前端框架，支持多平台渲染' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '指南', link: '/guide/quick-start' },
      { text: 'API', link: '/api/reactivity' },
      { text: '示例', link: '/examples/counter' },
      { text: '更新日志', link: 'https://gitee.com/lytjs/lytjs/blob/main/CHANGELOG.md' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '模板语法', link: '/guide/template-syntax' },
          ],
        },
        {
          text: '核心',
          items: [
            { text: '响应式系统', link: '/guide/reactivity' },
            { text: '组件系统', link: '/guide/component' },
          ],
        },
        {
          text: '生态',
          items: [
            { text: '路由', link: '/guide/router' },
            { text: '状态管理', link: '/guide/store' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '单文件组件', link: '/guide/sfc' },
            { text: '服务端渲染', link: '/guide/ssr' },
            { text: 'Vapor Mode', link: '/guide/vapor-mode' },
          ],
        },
      ],
      '/api/': [
        {
          text: '核心 API',
          items: [
            { text: '响应式 API', link: '/api/reactivity' },
            { text: '组件 API', link: '/api/component' },
          ],
        },
        {
          text: '生态 API',
          items: [
            { text: '路由 API', link: '/api/router' },
            { text: '状态管理 API', link: '/api/store' },
            { text: '插件系统 API', link: '/api/plugin' },
          ],
        },
        {
          text: '编译与渲染',
          items: [
            { text: '编译器 API', link: '/api/compiler' },
            { text: '渲染器 API', link: '/api/renderer' },
            { text: 'Web Component API', link: '/api/web-component' },
          ],
        },
        {
          text: '开发工具',
          items: [
            { text: 'DevTools API', link: '/api/devtools' },
          ],
        },
      ],
    },

    search: {
      provider: 'local',
    },

    socialLinks: [
      { icon: 'github', link: 'https://gitee.com/lytjs/lytjs' },
    ],

    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright 2024-present Lyt.js Contributors',
    },

    editLink: {
      pattern: 'https://gitee.com/lytjs/lytjs/edit/main/docs-site/:path',
      text: '在 Gitee 上编辑此页',
    },
  },

  vite: {
    ssr: {
      noExternal: [],
    },
  },
})
