import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'LytJS',
  description: '轻量级、高性能的渐进式 JavaScript 框架',
  lang: 'zh-CN',
  ignoreDeadLinks: true,
  base: '/lytjs/',

  head: [
    ['meta', { name: 'theme-color', content: '#4fc08d' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'LytJS' }],
    ['meta', { name: 'og:description', content: '轻量级、高性能的渐进式 JavaScript 框架' }],
    ['meta', { name: 'og:image', content: '/logo.svg' }],
    ['link', { rel: 'icon', href: '/logo.svg' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'LytJS',

    nav: [
      { text: '教程', link: '/tutorial/', activeMatch: '/tutorial/' },
      { text: '指南', link: '/guide/', activeMatch: '/guide/' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
      { text: '生态系统', link: '/ecosystem/', activeMatch: '/ecosystem/' },
      { text: '示例', link: '/examples/', activeMatch: '/examples/' },
      { text: '开发文档', link: '/development/', activeMatch: '/development/' },
    ],

    sidebar: {
      '/tutorial/': [
        {
          text: '教程',
          items: [
            { text: '教程总览', link: '/tutorial/' },
            { text: '快速开始', link: '/tutorial/quick-start' },
          ],
        },
        {
          text: '入门教程',
          items: [
            { text: '基础概念', link: '/tutorial/basics' },
            { text: '响应式基础', link: '/tutorial/reactivity' },
            { text: '组件基础', link: '/tutorial/components' },
          ],
        },
        {
          text: '进阶教程',
          items: [
            { text: '状态管理', link: '/tutorial/state-management' },
            { text: '路由导航', link: '/tutorial/routing' },
            { text: '表单处理', link: '/tutorial/forms' },
            { text: 'API 集成', link: '/tutorial/api-integration' },
          ],
        },
        {
          text: '实战项目',
          items: [{ text: 'Todo 应用', link: '/tutorial/todo-app-example' }],
        },
        {
          text: '高级教程',
          items: [
            { text: '性能优化', link: '/tutorial/performance' },
            { text: '测试指南', link: '/tutorial/testing' },
            { text: '部署指南', link: '/tutorial/deployment' },
            { text: '自定义插件', link: '/tutorial/custom-plugins' },
          ],
        },
        {
          text: '社区与生态',
          items: [
            { text: '生态与社区', link: '/tutorial/ecosystem' },
            { text: '社区贡献指南', link: '/tutorial/contributing' },
          ],
        },
        {
          text: '参考',
          items: [
            { text: '常见问题', link: '/tutorial/faq' },
            { text: '最佳实践', link: '/tutorial/best-practices' },
          ],
        },
      ],
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '简介', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装', link: '/guide/installation' },
          ],
        },
        {
          text: '核心概念',
          items: [
            { text: '响应式系统', link: '/guide/reactivity' },
            { text: '组件', link: '/guide/component' },
            { text: '虚拟 DOM', link: '/guide/vdom' },
            { text: '组合式 API', link: '/guide/composition-api' },
            { text: '模板语法', link: '/guide/template-syntax' },
            { text: '事件处理', link: '/guide/events' },
            { text: '生命周期', link: '/guide/lifecycle' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '插件系统', link: '/guide/plugins' },
            { text: '自定义指令', link: '/guide/custom-directives' },
            { text: '渲染模式', link: '/guide/rendering-modes' },
            { text: '内置组件', link: '/guide/built-in-components' },
            { text: 'TypeScript 支持', link: '/guide/typescript' },
            { text: 'SSR', link: '/guide/ssr' },
            { text: '构建优化', link: '/guide/build-optimization' },
          ],
        },
        {
          text: '深入了解',
          items: [
            { text: '架构设计', link: '/guide/architecture' },
            { text: '响应式深入', link: '/guide/packages/reactivity-deep' },
            { text: 'VDOM 深入', link: '/guide/packages/vdom-deep' },
            { text: '编译器深入', link: '/guide/packages/compiler-deep' },
            { text: '自定义渲染器', link: '/guide/packages/custom-renderer' },
          ],
        },
        {
          text: '贡献',
          items: [
            { text: '贡献指南', link: '/guide/contributing' },
            { text: '项目配置', link: '/guide/project-config' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '总览', link: '/api/' },
            { text: '响应式 API', link: '/api/reactivity' },
            { text: '核心 API', link: '/api/core' },
            { text: '核心变体', link: '/api/core-variants' },
            { text: '组件 API', link: '/api/component' },
            { text: 'VDOM API', link: '/api/vdom' },
            { text: '渲染器 API', link: '/api/renderer' },
            { text: '编译器 API', link: '/api/compiler' },
            { text: '工具函数', link: '/api/common' },
            { text: 'Host Contract', link: '/api/host-contract' },
            { text: '共享类型', link: '/api/shared-types' },
            { text: 'CLI', link: '/api/cli' },
            { text: 'Vite 插件', link: '/api/plugin-vite' },
            { text: 'DevTools', link: '/api/devtools' },
            { text: '测试工具', link: '/api/test-utils' },
            { text: 'Router', link: '/api/router' },
            { text: 'Store', link: '/api/store' },
          ],
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
          ],
        },
      ],
      '/development/': [
        {
          text: '开发文档',
          items: [
            { text: 'AI 开发规则', link: '/development/AI_IDE_RULES' },
            { text: '架构设计', link: '/development/ARCHITECTURE' },
            { text: '中文文档指南', link: '/development/CHINESE_DOCS_GUIDE' },
            { text: '插件开发指南', link: '/development/PLUGIN_DEVELOPMENT' },
            { text: '项目结构说明', link: '/development/PROJECT_STRUCTURE' },
            { text: '路线图', link: '/development/ROADMAP_NEXT_STEPS' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://gitee.com/lytjs/lytjs' }],

    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © 2024-present LytJS Team',
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档',
          },
          modal: {
            noResultsText: '未找到相关结果',
            resetButtonTitle: '清除搜索',
            footer: {
              selectText: '选择',
              navigateText: '导航',
              closeText: '关闭',
            },
          },
        },
      },
    },

    outline: {
      level: [2, 3],
      label: '页面目录',
    },

    editLink: {
      pattern: 'https://gitee.com/lytjs/lytjs/edit/develop/docs/:path',
      text: '在 Gitee 上编辑此页',
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  },
});
