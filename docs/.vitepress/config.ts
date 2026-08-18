import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'LytJS',
  description: '轻量级、高性能的渐进式 JavaScript 框架',
  lang: 'zh-CN',
  ignoreDeadLinks: [
    // 仓库内部工具链 / 文档引用（非 VitePress 站点页面）
    /\.trae\//,
    /\.ai\//,
    /AGENTS/,
    /CHANGELOG/,
    /README$/,
    // 本地开发服务器地址
    (url) => url.startsWith('http://localhost'),
  ],
  // 归档内容不参与站点构建与死链校验
  srcExclude: ['**/legacy-archive/**'],
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
      { text: '新手入门', link: '/getting-started/', activeMatch: '/getting-started/' },
      { text: '核心指南', link: '/guide/', activeMatch: '/guide/' },
      { text: '包文档', link: '/packages/', activeMatch: '/packages/' },
      { text: '插件生态', link: '/plugins/', activeMatch: '/plugins/' },
      { text: '生态系统', link: '/ecosystem/', activeMatch: '/ecosystem/' },
      { text: 'API 参考', link: '/api/', activeMatch: '/api/' },
      { text: '示例', link: '/examples/', activeMatch: '/examples/' },
      { text: '贡献指南', link: '/contribute/', activeMatch: '/contribute/' },
      { text: '社区', link: '/community/', activeMatch: '/community/' },
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: '新手入门',
          items: [
            { text: '新手入门', link: '/getting-started/' },
            { text: '快速参考', link: '/getting-started/quick-reference' },
            { text: '快速开始', link: '/getting-started/quick-start' },
            { text: '安装', link: '/getting-started/installation' },
          ],
        },
        {
          text: '实战教程',
          items: [
            { text: '教程总览', link: '/getting-started/tutorials/' },
            { text: 'Todo 应用', link: '/getting-started/tutorials/todo-app' },
            { text: '用户管理', link: '/getting-started/tutorials/user-management' },
            { text: '购物车', link: '/getting-started/tutorials/shopping-cart' },
            { text: '表单验证', link: '/getting-started/tutorials/form-validation' },
            { text: '博客系统', link: '/getting-started/tutorials/blog-system' },
          ],
        },
      ],
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '简介', link: '/guide/' },
            { text: '架构概览', link: '/guide/architecture' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '响应式系统', link: '/guide/reactivity' },
            { text: '组件系统', link: '/guide/component' },
          ],
        },
        {
          text: '核心功能',
          items: [
            { text: '渲染函数', link: '/guide/render-function' },
            { text: '模板语法', link: '/guide/template-syntax' },
            { text: '事件处理', link: '/guide/events' },
            { text: '生命周期', link: '/guide/lifecycle' },
            { text: '组合式 API', link: '/guide/composition-api' },
            { text: '内置组件', link: '/guide/built-in-components' },
            { text: '自定义指令', link: '/guide/custom-directives' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '渲染模式', link: '/guide/rendering-modes' },
            { text: 'SSR', link: '/guide/ssr' },
            { text: '错误边界', link: '/guide/error-boundary' },
            { text: 'TypeScript', link: '/guide/typescript' },
            { text: '构建优化', link: '/guide/build-optimization' },
            { text: '本地使用', link: '/guide/local-usage' },
            { text: '插件开发', link: '/guide/plugins' },
            { text: '项目配置', link: '/guide/project-config' },
          ],
        },
      ],
      '/packages/': [
        {
          text: '包文档',
          items: [{ text: '包文档总览', link: '/packages/' }],
        },
        {
          text: '核心包',
          items: [
            { text: 'Core', link: '/packages/core/' },
            { text: 'Core VNode', link: '/packages/core/core-vnode' },
            { text: 'Core Signal', link: '/packages/core/core-signal' },
            { text: 'Common', link: '/packages/common/' },
            { text: 'Common 概览', link: '/packages/common/overview' },
            { text: 'Reactivity', link: '/packages/reactivity/' },
            { text: 'Component', link: '/packages/component/' },
            { text: 'VDOM', link: '/packages/vdom/' },
            { text: 'Renderer', link: '/packages/vdom/renderer' },
            { text: 'Compiler', link: '/packages/vdom/compiler' },
          ],
        },
        {
          text: '其他包',
          items: [
            { text: '其他包', link: '/packages/other/' },
            { text: 'Adapter Web', link: '/packages/other/adapter-web' },
            { text: 'DOM', link: '/packages/other/dom' },
            { text: 'DOM Runtime', link: '/packages/other/dom-runtime' },
            { text: 'Web', link: '/packages/other/web' },
            { text: 'Shared Types', link: '/packages/other/shared-types' },
            { text: 'Host Contract', link: '/packages/other/host-contract' },
          ],
        },
      ],
      '/plugins/': [
        {
          text: '插件生态',
          items: [
            { text: '插件生态', link: '/plugins/' },
            { text: '官方插件', link: '/plugins/official/' },
            { text: '插件开发', link: '/plugins/development/' },
          ],
        },
      ],
      '/ecosystem/': [
        {
          text: '生态系统',
          items: [
            { text: '生态系统', link: '/ecosystem/' },
            { text: 'Router', link: '/ecosystem/router/' },
            { text: 'Store', link: '/ecosystem/store/' },
            { text: 'UI 组件', link: '/ecosystem/ui/' },
            { text: 'SSR', link: '/ecosystem/ssr/' },
            { text: 'DevTools', link: '/ecosystem/devtools/' },
            { text: 'CLI', link: '/ecosystem/cli/' },
            { text: '其他包', link: '/ecosystem/other/' },
          ],
        },
        {
          text: '插件',
          items: [
            { text: 'Animation', link: '/ecosystem/plugins/animation' },
            { text: 'Form', link: '/ecosystem/plugins/form' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: 'API 总览', link: '/api/' },
            { text: 'Core', link: '/api/core' },
            { text: 'Core Variants', link: '/api/core-variants' },
            { text: 'Reactivity', link: '/api/reactivity' },
            { text: 'Component', link: '/api/component' },
            { text: 'VDOM', link: '/api/vdom' },
            { text: 'Renderer', link: '/api/renderer' },
            { text: 'Compiler', link: '/api/compiler' },
            { text: 'Common', link: '/api/common' },
            { text: 'Host Contract', link: '/api/host-contract' },
            { text: 'Shared Types', link: '/api/shared-types' },
            { text: 'Router', link: '/api/router' },
            { text: 'Store', link: '/api/store' },
            { text: 'DevTools', link: '/api/devtools' },
            { text: 'Plugin Vite', link: '/api/plugin-vite' },
            { text: 'CLI', link: '/api/cli' },
            { text: 'Test Utils', link: '/api/test-utils' },
          ],
        },
      ],
      '/contribute/': [
        {
          text: '贡献指南',
          items: [
            { text: '贡献首页', link: '/contribute/' },
            { text: '开始贡献', link: '/contribute/getting-started' },
          ],
        },
        {
          text: '架构设计',
          items: [
            { text: '架构设计', link: '/contribute/architecture/' },
            { text: '8 层架构', link: '/contribute/architecture/8-layer-architecture' },
          ],
        },
        {
          text: '开发指南',
          items: [
            { text: '开发指南', link: '/contribute/development/' },
            { text: '工作流程', link: '/contribute/development/workflow' },
            { text: '版本开发流程', link: '/contribute/development/version-workflow' },
            { text: '开发规范', link: '/contribute/development/guidelines' },
            { text: '测试指南', link: '/contribute/development/testing' },
            { text: 'TypeScript', link: '/contribute/development/typescript' },
            { text: 'Benchmark', link: '/contribute/development/benchmark-pr' },
          ],
        },
        {
          text: '知识库',
          items: [
            { text: '知识库', link: '/contribute/knowledge-base/' },
            { text: '开发技巧', link: '/contribute/knowledge-base/development-skills' },
          ],
        },
        {
          text: '原则',
          items: [
            { text: '原则', link: '/contribute/principles/' },
            { text: '中文文档', link: '/contribute/principles/chinese-docs' },
            { text: 'Common 模块', link: '/contribute/principles/common-modules' },
            { text: '零依赖', link: '/contribute/principles/zero-dependency' },
          ],
        },
        {
          text: '性能',
          items: [
            { text: '性能', link: '/contribute/performance/' },
            { text: '基准与计划', link: '/contribute/performance/baseline-and-plans' },
            { text: '优化报告 v6.4', link: '/contribute/performance/optimization-report-v64' },
          ],
        },
        {
          text: '插件',
          items: [
            { text: '插件', link: '/contribute/plugins/' },
            { text: '插件开发', link: '/contribute/plugins/plugin-development' },
          ],
        },
        {
          text: '路线图',
          items: [
            { text: '路线图', link: '/contribute/roadmap/' },
            { text: '当前', link: '/contribute/roadmap/current' },
          ],
        },
        {
          text: 'AI 助手',
          items: [
            { text: 'AI 助手', link: '/contribute/ai/' },
            { text: '助手开发指南', link: '/contribute/ai/assistant-guide' },
            { text: 'IDE 规则', link: '/contribute/ai/ide-rules' },
            { text: 'Agents 优化', link: '/contribute/ai/agents-optimization' },
          ],
        },
        {
          text: '其他',
          items: [
            { text: '其他', link: '/contribute/other/' },
            { text: '代码分析', link: '/contribute/other/code-analysis-report' },
            { text: '社区行为准则', link: '/contribute/other/code-of-conduct' },
            { text: '社区激励计划', link: '/contribute/other/incentive-program' },
            { text: '待办任务', link: '/contribute/other/pending-tasks' },
            { text: '第三方生态', link: '/contribute/other/third-party-ecosystem' },
            { text: '故障排除', link: '/contribute/other/troubleshooting' },
            { text: 'v6.4 到 v6.5', link: '/contribute/other/v64-v65-transition' },
          ],
        },
      ],
      '/examples/': [
        {
          text: '示例项目',
          items: [
            { text: '示例概览', link: '/examples/' },
            { text: '交互式计数器', link: '/examples/interactive-counter' },
            { text: '计数器', link: '/examples/counter' },
            { text: 'TodoMVC', link: '/examples/todomvc' },
            { text: '用户列表', link: '/examples/user-list' },
          ],
        },
      ],
      '/community/': [
        {
          text: '社区',
          items: [
            { text: '社区首页', link: '/community/' },
            { text: 'v6.9.5 发布', link: '/community/RELEASE_v6.9.5' },
            { text: 'v6.9.0 发布', link: '/community/RELEASE_v6.9.0' },
            { text: 'v6.8.0 发布', link: '/community/RELEASE_v6.8.0' },
            { text: 'v6.7.0 发布', link: '/community/RELEASE_v6.7.0' },
            { text: 'v6.6.0 发布', link: '/community/RELEASE_v6.6.0' },
            { text: 'v6.5.0 发布', link: '/community/RELEASE_v6.5.0' },
            { text: 'v6.4.0 发布', link: '/community/RELEASE_v6.4.0' },
          ],
        },
      ],
      '/reference/': [
        {
          text: '参考资料',
          items: [{ text: '参考资料', link: '/reference/' }],
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
