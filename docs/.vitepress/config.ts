import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Lyt.js',
  description: 'Lightweight JavaScript framework',
  lang: 'zh-CN',

  base: '/lytjs/',

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/quick-start' },
      { text: 'API', link: '/api/core' },
      { text: '示例', link: '/examples/counter' },
      { text: '开发者', link: '/developer/README' },
      { text: 'English', link: '/en/' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '模板语法', link: '/guide/template-syntax' },
            { text: '组件', link: '/guide/component' },
            { text: '组件库', link: '/guide/components' }
          ]
        },
        {
          text: '核心概念',
          items: [
            { text: '响应式系统', link: '/guide/reactivity' },
            { text: 'Options API', link: '/guide/options-api' },
            { text: 'Composition API', link: '/guide/composition-api' },
            { text: '单文件组件', link: '/guide/sfc' }
          ]
        },
        {
          text: '生态',
          items: [
            { text: '路由', link: '/guide/router' },
            { text: '状态管理', link: '/guide/store' },
            { text: '服务端渲染', link: '/guide/ssr' },
            { text: '开发工具', link: '/guide/devtools' }
          ]
        },
        {
          text: '高级主题',
          items: [
            { text: 'Vapor Mode', link: '/guide/vapor-mode' },
            { text: '性能优化', link: '/guide/performance' },
            { text: '部署', link: '/guide/deployment' },
            { text: '常见问题', link: '/guide/faq' },
            { text: '与其他框架对比', link: '/guide/comparison' },
            { text: '从 Vue3 迁移', link: '/guide/migration-from-vue3' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: 'Core', link: '/api/core' },
            { text: 'Reactivity', link: '/api/reactivity' },
            { text: 'Component', link: '/api/component' },
            { text: 'Renderer', link: '/api/renderer' },
            { text: 'Compiler', link: '/api/compiler' },
            { text: 'Router', link: '/api/router' },
            { text: 'Store', link: '/api/store' },
            { text: 'DevTools', link: '/api/devtools' },
            { text: 'CLI', link: '/api/cli' },
            { text: 'Plugin', link: '/api/plugin' },
            { text: 'Web Component', link: '/api/web-component' }
          ]
        }
      ],
      '/developer/': [
        {
          text: '开发者指南',
          items: [
            { text: '架构概览', link: '/developer/01-architecture-overview' },
            { text: '开始贡献', link: '/developer/02-getting-started' },
            { text: '代码规范', link: '/developer/03-coding-standards' }
          ]
        },
        {
          text: '核心模块',
          items: [
            { text: '响应式系统', link: '/developer/core/01-reactivity' },
            { text: '编译器', link: '/developer/core/02-compiler' },
            { text: '渲染器', link: '/developer/core/03-renderer' },
            { text: '组件系统', link: '/developer/core/04-component' },
            { text: '核心', link: '/developer/core/05-core' }
          ]
        },
        {
          text: '高级主题',
          items: [
            { text: '模块组装', link: '/developer/advanced/01-module-assembly' }
          ]
        },
        {
          text: '特性',
          items: [
            { text: '路由', link: '/developer/feature/01-router' },
            { text: '状态管理', link: '/developer/feature/02-store' }
          ]
        }
      ],
      '/en/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Quick Start', link: '/en/guide/quick-start' },
            { text: 'Comparison', link: '/en/guide/comparison' },
            { text: 'SSR Guide', link: '/en/guide/ssr' },
            { text: 'Migration from Vue 3', link: '/en/guide/migration-from-vue3' }
          ]
        },
        {
          text: 'API Reference',
          items: [
            { text: 'Core', link: '/en/api/core' },
            { text: 'Reactivity', link: '/en/api/reactivity' },
            { text: 'Component', link: '/en/api/component' },
            { text: 'Router', link: '/en/api/router' },
            { text: 'Store', link: '/en/api/store' },
            { text: 'Components', link: '/en/api/components' }
          ]
        },
        {
          text: 'Community',
          items: [
            { text: 'Contributing', link: '/en/contributing' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/lytjs/lytjs' }
    ],

    footer: {
      message: 'MIT License',
      copyright: 'Copyright © 2024-present Lyt.js'
    }
  }
})
