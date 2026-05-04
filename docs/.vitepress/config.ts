import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Lyt.js',
  description: '下一代轻量级前端框架 v6.0.0',
  lang: 'zh-CN',

  // 文档站基础路径（部署到 Pages 子路径时使用）
  base: '/lytjs/',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/lytjs/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'Lyt.js' }],
    ['meta', { name: 'og:description', content: '下一代轻量级前端框架' }],
  ],

  themeConfig: {
    logo: '/lytjs/logo.svg',
    siteTitle: 'Lyt.js',

    nav: [
      { text: '指南', link: '/lytjs/guide/' },
      { text: 'API 参考', link: '/lytjs/api/' },
      {
        text: '子仓库',
        items: [
          { text: 'common', link: '/lytjs/api/' },
          { text: 'reactivity', link: '/lytjs/api/reactivity' },
          { text: 'vdom', link: '/lytjs/api/' },
          { text: 'compiler', link: '/lytjs/api/compiler' },
          { text: 'renderer', link: '/lytjs/api/renderer' },
          { text: 'component', link: '/lytjs/api/component' },
          { text: 'core', link: '/lytjs/api/core' },
        ],
      },
      {
        text: '生态',
        items: [
          // TODO: Router 包尚未实现，取消注释当包就绪时
          // { text: 'Router', link: '/lytjs/ecosystem/router/' },
          // TODO: Store 包尚未实现，取消注释当包就绪时
          // { text: 'Store', link: '/lytjs/ecosystem/store/' },
          // TODO: CLI 包尚未实现，取消注释当包就绪时
          // { text: 'CLI', link: '/lytjs/ecosystem/cli/' },
          // TODO: UI 组件库尚未实现，取消注释当包就绪时
          // { text: 'UI 组件库', link: '/lytjs/ecosystem/lytui/' },
        ],
      },
      // TODO: 示例页面尚未创建，取消注释当示例就绪时
      // { text: '示例', link: '/lytjs/examples/' },
    ],

    sidebar: {
      '/lytjs/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '概览', link: '/lytjs/api/' },
            { text: '@lytjs/core', link: '/lytjs/api/core' },
            { text: '@lytjs/reactivity', link: '/lytjs/api/reactivity' },
            { text: '@lytjs/compiler', link: '/lytjs/api/compiler' },
            { text: '@lytjs/renderer', link: '/lytjs/api/renderer' },
            { text: '@lytjs/component', link: '/lytjs/api/component' },
            { text: '独立构建变体', link: '/lytjs/api/core-variants' },
          ],
        },
      ],
      '/lytjs/guide/': [
        {
          text: '开始',
          items: [
            { text: '介绍', link: '/lytjs/guide/' },
            { text: '快速开始', link: '/lytjs/guide/getting-started' },
            { text: '安装', link: '/lytjs/guide/installation' },
          ],
        },
        {
          text: '核心概念',
          items: [
            { text: '响应式系统', link: '/lytjs/guide/reactivity' },
            { text: '组件', link: '/lytjs/guide/component' },
            { text: '模板语法', link: '/lytjs/guide/template-syntax' },
            { text: '生命周期', link: '/lytjs/guide/lifecycle' },
            { text: '事件处理', link: '/lytjs/guide/events' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '组合式 API', link: '/lytjs/guide/composition-api' },
            { text: '自定义指令', link: '/lytjs/guide/custom-directives' },
            { text: '插件', link: '/lytjs/guide/plugins' },
            { text: '渲染函数', link: '/lytjs/guide/render-function' },
          ],
        },
        {
          text: '工程化',
          items: [
            { text: '项目配置', link: '/lytjs/guide/project-config' },
            { text: '构建优化', link: '/lytjs/guide/build-optimization' },
            { text: 'SSR', link: '/lytjs/guide/ssr' },
            { text: 'TypeScript', link: '/lytjs/guide/typescript' },
          ],
        },
        {
          text: '内置与渲染',
          items: [
            { text: '内置组件', link: '/lytjs/guide/built-in-components' },
            { text: '渲染模式', link: '/lytjs/guide/rendering-modes' },
          ],
        },
        {
          text: '贡献',
          items: [
            { text: '贡献指南', link: '/lytjs/guide/contributing' },
            // TODO: 架构设计 (architecture.md)
            // TODO: 编码规范 (coding-standards.md)
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://gitee.com/lytjs/lytjs' }],

    footer: {
      message: '基于 MIT 许可发布',
      copyright: '2026-present lytjs',
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },

    editLink: {
      pattern: 'https://gitee.com/lytjs/lytjs/edit/develop/docs/:path',
      text: '在 Gitee 上编辑此页',
    },

    lastUpdated: {
      text: '最后更新于',
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    outline: {
      level: [2, 3],
      label: '页面导航',
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  },

  vite: {
    // 构建优化
    build: {
      minify: 'terser',
    },
  },
});
