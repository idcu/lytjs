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
          { text: 'common', link: '/lytjs/packages/common/' },
          { text: 'reactivity', link: '/lytjs/packages/reactivity/' },
          { text: 'vdom', link: '/lytjs/packages/vdom/' },
          { text: 'compiler', link: '/lytjs/packages/compiler/' },
          { text: 'renderer', link: '/lytjs/packages/renderer/' },
          { text: 'component', link: '/lytjs/packages/component/' },
          { text: 'core', link: '/lytjs/packages/core/' },
        ],
      },
      {
        text: '生态',
        items: [
          { text: 'Router', link: '/lytjs/ecosystem/router/' },
          { text: 'Store', link: '/lytjs/ecosystem/store/' },
          { text: 'CLI', link: '/lytjs/ecosystem/cli/' },
          { text: 'UI 组件库', link: '/lytjs/ecosystem/lytui/' },
        ],
      },
      { text: '示例', link: '/lytjs/examples/' },
    ],

    sidebar: {
      '/lytjs/guide/': [
        {
          text: '开始',
          items: [
            { text: '介绍', link: '/lytjs/guide/' },
            { text: '快速开始', link: '/lytjs/guide/getting-started' },
            { text: '安装', link: '/lytjs/guide/installation' },
          ],
        },
        // TODO: 核心概念 - 待补充以下文档
        // {
        //   text: "核心概念",
        //   items: [
        //     { text: "响应式系统", link: "/lytjs/guide/reactivity" },
        //     { text: "组件", link: "/lytjs/guide/components" },
        //     { text: "模板语法", link: "/lytjs/guide/template-syntax" },
        //     { text: "生命周期", link: "/lytjs/guide/lifecycle" },
        //     { text: "事件处理", link: "/lytjs/guide/events" },
        //   ],
        // },
        // TODO: 进阶 - 待补充以下文档
        // {
        //   text: "进阶",
        //   items: [
        //     { text: "组合式 API", link: "/lytjs/guide/composition-api" },
        //     { text: "自定义指令", link: "/lytjs/guide/custom-directives" },
        //     { text: "插件", link: "/lytjs/guide/plugins" },
        //     { text: "渲染函数", link: "/lytjs/guide/render-function" },
        //   ],
        // },
        // TODO: 工程化 - 待补充以下文档
        // {
        //   text: "工程化",
        //   items: [
        //     { text: "项目配置", link: "/lytjs/guide/project-config" },
        //     { text: "构建优化", link: "/lytjs/guide/build-optimization" },
        //     { text: "SSR", link: "/lytjs/guide/ssr" },
        //     { text: "TypeScript", link: "/lytjs/guide/typescript" },
        //   ],
        // },
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
