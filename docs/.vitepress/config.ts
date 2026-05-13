import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'LytJS',
  description: '轻量级、高性能的渐进式 JavaScript 框架',
  lang: 'zh-CN',
  
  head: [
    ['meta', { name: 'theme-color', content: '#4fc08d' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'LytJS' }],
    ['meta', { name: 'og:description', content: '轻量级、高性能的渐进式 JavaScript 框架' }],
  ],
  
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'LytJS',
    
    nav: [
      { text: '指南', link: '/guide/', activeMatch: '/guide/' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
      { text: '生态系统', link: '/ecosystem/', activeMatch: '/ecosystem/' },
      { text: '示例', link: '/examples/', activeMatch: '/examples/' },
    ],
    
    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '简介', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装', link: '/guide/installation' },
          ]
        },
        {
          text: '核心概念',
          items: [
            { text: '响应式系统', link: '/guide/reactivity' },
            { text: '组件', link: '/guide/component' },
            { text: '虚拟 DOM', link: '/guide/vdom' },
          ]
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '响应式 API', link: '/api/reactivity' },
            { text: '组件 API', link: '/api/component' },
            { text: '工具函数', link: '/api/utilities' },
          ]
        },
      ],
      '/ecosystem/': [
        {
          text: '官方包',
          items: [
            { text: 'Router', link: '/ecosystem/router' },
            { text: 'Store', link: '/ecosystem/store' },
            { text: 'UI 组件库', link: '/ecosystem/ui' },
            { text: 'DevTools', link: '/ecosystem/devtools' },
            { text: 'SSR', link: '/ecosystem/ssr' },
          ]
        },
      ],
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://gitee.com/lytjs/lytjs' }
    ],
    
    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © 2024-present LytJS Team'
    },
    
    search: {
      provider: 'local'
    },
    
    outline: {
      level: [2, 3]
    },
    
    editLink: {
      pattern: 'https://gitee.com/lytjs/lytjs/edit/develop/docs/:path',
      text: '在 Gitee 上编辑此页'
    },
    
    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    }
  }
});
