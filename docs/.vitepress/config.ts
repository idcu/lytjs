import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Lyt.js',
  description: '下一代轻量级前端框架 v6.0.0',
  lang: 'zh-CN',

  // 文档站基础路径（部署到 Pages 子路径时使用）
  // VitePress 会自动给所有链接添加此前缀，链接中不需要重复写
  base: '/lytjs/',

  // 忽略死链接（部分文档页面尚未完成）
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/lytjs/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'Lyt.js' }],
    ['meta', { name: 'og:description', content: '下一代轻量级前端框架' }],
  ],

  // 主题配置
  themeConfig: {
    logo: '/lytjs/logo.svg',
    siteTitle: 'Lyt.js',

    // 导航栏
    nav: [
      { text: '指南', link: '/guide/', activeMatch: '^/guide/' },
      { text: 'API 参考', link: '/api/', activeMatch: '^/api/' },
      { text: '示例', link: '/examples/', activeMatch: '^/examples/' },
      {
        text: '生态',
        items: [
          { text: 'Router', link: '/api/router' },
          { text: 'Store', link: '/api/store' },
          { text: 'CLI', link: '/api/cli' },
          { text: 'DevTools', link: '/api/devtools' },
          { text: 'Vite 插件', link: '/api/plugin-vite' },
          { text: '测试工具', link: '/api/test-utils' },
        ],
      },
      {
        text: 'v6.0.0',
        items: [
          { text: '更新日志', link: '/changelog' },
          { text: '贡献指南', link: '/guide/contributing' },
          { text: 'GitHub', link: 'https://gitee.com/lytjs/lytjs' },
        ],
      },
    ],

    // 侧边栏
    sidebar: {
      '/guide/': [
        {
          text: '开始',
          collapsed: false,
          items: [
            { text: '介绍', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装', link: '/guide/installation' },
            { text: '本地开发使用指南', link: '/guide/local-usage' },
          ],
        },
        {
          text: '核心概念',
          collapsed: false,
          items: [
            { text: '响应式系统', link: '/guide/reactivity' },
            { text: '组件', link: '/guide/component' },
            { text: '模板语法', link: '/guide/template-syntax' },
            { text: '生命周期', link: '/guide/lifecycle' },
            { text: '事件处理', link: '/guide/events' },
          ],
        },
        {
          text: '进阶',
          collapsed: false,
          items: [
            { text: '组合式 API', link: '/guide/composition-api' },
            { text: '自定义指令', link: '/guide/custom-directives' },
            { text: '插件', link: '/guide/plugins' },
            { text: '渲染函数', link: '/guide/render-function' },
          ],
        },
        {
          text: '工程化',
          collapsed: false,
          items: [
            { text: '项目配置', link: '/guide/project-config' },
            { text: '构建优化', link: '/guide/build-optimization' },
            { text: 'SSR', link: '/guide/ssr' },
            { text: 'TypeScript', link: '/guide/typescript' },
          ],
        },
        {
          text: '内置与渲染',
          collapsed: false,
          items: [
            { text: '内置组件', link: '/guide/built-in-components' },
            { text: '渲染模式', link: '/guide/rendering-modes' },
          ],
        },
        {
          text: '贡献',
          collapsed: false,
          items: [
            { text: '贡献指南', link: '/guide/contributing' },
            { text: '架构设计', link: '/guide/architecture' },
          ],
        },
        {
          text: '开发者文档',
          collapsed: true,
          items: [
            { text: '包总览', link: '/guide/packages/' },
            { text: 'L0 基础层', link: '/guide/packages/common' },
            { text: '响应式系统原理', link: '/guide/packages/reactivity-deep' },
            { text: 'VDOM 实现原理', link: '/guide/packages/vdom-deep' },
            { text: '编译器架构', link: '/guide/packages/compiler-deep' },
            { text: '自定义渲染器开发', link: '/guide/packages/custom-renderer' },
          ],
        },
      ],
      '/api/': [
        {
          text: '核心包',
          collapsed: false,
          items: [
            { text: '概览', link: '/api/' },
            { text: '@lytjs/core', link: '/api/core' },
            { text: '@lytjs/reactivity', link: '/api/reactivity' },
            { text: '@lytjs/compiler', link: '/api/compiler' },
            { text: '@lytjs/renderer', link: '/api/renderer' },
            { text: '@lytjs/component', link: '/api/component' },
            { text: '@lytjs/vdom', link: '/api/vdom' },
            { text: '@lytjs/common-*', link: '/api/common' },
            { text: '@lytjs/host-contract', link: '/api/host-contract' },
            { text: '@lytjs/shared-types', link: '/api/shared-types' },
            { text: '独立构建变体', link: '/api/core-variants' },
          ],
        },
        {
          text: '生态包',
          collapsed: false,
          items: [
            { text: '@lytjs/router', link: '/api/router' },
            { text: '@lytjs/store', link: '/api/store' },
          ],
        },
        {
          text: '工具包',
          collapsed: false,
          items: [
            { text: '@lytjs/cli', link: '/api/cli' },
            { text: '@lytjs/devtools', link: '/api/devtools' },
            { text: '@lytjs/plugin-vite', link: '/api/plugin-vite' },
            { text: '@lytjs/test-utils', link: '/api/test-utils' },
          ],
        },
      ],
      '/examples/': [
        {
          text: '示例项目',
          collapsed: false,
          items: [
            { text: '概览', link: '/examples/' },
            { text: '计数器', link: '/examples/counter' },
            { text: '待办事项', link: '/examples/todomvc' },
            { text: '用户列表', link: '/examples/user-list' },
          ],
        },
      ],
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://gitee.com/lytjs/lytjs' },
    ],

    // 页脚
    footer: {
      message: '基于 MIT 许可发布',
      copyright: '2026-present lytjs',
    },

    // 本地搜索配置
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
        miniSearch: {
          searchOptions: {
            boost: {
              title: 5,
              text: 2,
              titles: 1,
            },
            fuzzy: 0.2,
            prefix: true,
          },
        },
      },
    },

    // 编辑链接
    editLink: {
      pattern: 'https://gitee.com/lytjs/lytjs/edit/develop/docs/:path',
      text: '在 Gitee 上编辑此页',
    },

    // 最后更新时间
    lastUpdated: {
      text: '最后更新于',
    },

    // 文档页脚
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    // 大纲
    outline: {
      level: [2, 3],
      label: '页面导航',
    },

    // 返回顶部
    returnToTopLabel: '回到顶部',

    // 侧边栏菜单
    sidebarMenuLabel: '菜单',

    // 暗黑模式
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  },

  // Markdown 配置
  markdown: {
    lineNumbers: true,
    config: (md) => {
      // 可以在这里添加自定义 markdown-it 插件
    },
  },

  // Vite 配置
  vite: {
    // 自定义 Vite 配置
    css: {
      preprocessorOptions: {
        // 如果需要使用 CSS 预处理器
      },
    },
  },
});
