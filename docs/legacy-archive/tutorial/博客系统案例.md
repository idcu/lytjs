# 博客系统实战案例

本案例将展示如何使用 LytJS 构建一个功能完整的博客系统，包含文章展示、搜索、分类、评论等功能。

## 项目概述

### 功能特性

- 📝 文章列表和详情
- 🔍 文章搜索
- 🏷️ 分类和标签
- 💬 评论系统
- 📱 响应式设计
- 🎨 深色/浅色主题

### 技术要点

- Signal 响应式系统
- Vapor 模式渲染
- 组件化开发
- 路由系统
- 主题切换
- 本地存储

---

## 第一步：项目初始化

### 创建应用实例

```typescript
import { createApp, defineComponent, ref, computed } from '@lytjs/core';
import { h } from '@lytjs/vdom';
import { ThemePlugin } from '@lytjs/plugin-theme';
import { Router, createRouter, useRouter, useRoute } from '@lytjs/router';

// 文章类型定义
interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  date: string;
  author: string;
  views: number;
}

// 评论类型定义
interface Comment {
  id: string;
  articleId: string;
  author: string;
  content: string;
  date: string;
}

// 模拟文章数据
const mockArticles: Article[] = [
  {
    id: '1',
    title: '深入理解 LytJS 的响应式系统',
    excerpt: '本文将深入探讨 LytJS 的响应式系统原理，包括 Signal、Effect、Computed 等核心概念。',
    content: `# 深入理解 LytJS 的响应式系统

## 什么是响应式系统？

响应式系统是现代前端框架的核心特性之一。它允许我们以声明式的方式描述 UI 状态，当状态变化时自动更新 UI。

## Signal

Signal 是 LytJS 响应式系统的基础。它是一个可观察的值容器。

\`\`\`typescript
import { ref, effect } from '@lytjs/core';

const count = ref(0);

effect(() => {
  console.log('Count:', count.value);
});

count.value++; // 输出: Count: 1
\`\`\`

## 总结

通过 Signal、Effect 和 Computed 构成了 LytJS 响应式系统的三大支柱。`,
    category: '技术',
    tags: ['LytJS', '响应式', '前端'],
    date: '2024-01-15',
    author: '张三',
    views: 1234,
  },
  {
    id: '2',
    title: 'Vapor 模式性能优化指南',
    excerpt: '学习如何使用 LytJS 的 Vapor 模式获得极致性能，包括最佳实践和优化技巧。',
    content: `# Vapor 模式性能优化指南

## Vapor 模式是 LytJS 提供的无虚拟 DOM 渲染模式，专为性能优化设计。

## 优化技巧

1. 使用细粒度更新
2. 避免不必要的渲染
3. 合理使用缓存`,
    category: '性能',
    tags: ['Vapor', '性能优化', '前端'],
    date: '2024-01-12',
    author: '李四',
    views: 856,
  },
  {
    id: '3',
    title: '从零开始构建 LytJS 组件库',
    excerpt: '完整指南：如何从零开始构建一套高质量的 LytJS 组件库。',
    content: `# 从零开始构建 LytJS 组件库

## 组件设计原则

1. 单一职责
2. 可复用性
3. 可测试性

## 实践步骤

1. 基础组件
2. 复合组件
3. 业务组件`,
    category: '教程',
    tags: ['组件库', '教程', '前端'],
    date: '2024-01-10',
    author: '王五',
    views: 678,
  },
  {
    id: '4',
    title: 'LytJS 与 Vue/React 对比',
    excerpt: '全面对比 LytJS 与 Vue、React 的异同，帮助你选择合适的框架。',
    content: `# LytJS 与 Vue/React 对比

## 核心差异

| 特性 | LytJS | Vue | React |
|------|--------|-----|-------|
| 响应式 | Signal | Proxy/Object.defineProperty | useState/useEffect |
| 渲染模式 | Vapor + VDOM | VDOM | VDOM |
| 体积 | < 10KB | ~ 30KB+ | ~ 40KB+ |
| 零依赖 | ✅ | ❌ | ❌ |

## 选择建议

- 需要极致性能和小体积 → LytJS
- 需要成熟生态和大量第三方库 → Vue/React`,
    category: '对比',
    tags: ['对比', 'Vue', 'React', '前端'],
    date: '2024-01-08',
    author: '张三',
    views: 1567,
  },
  {
    id: '5',
    title: 'LytJS 最佳实践',
    excerpt: '收集了 LytJS 开发中的最佳实践和常见问题解决方案。',
    content: `# LytJS 最佳实践

## 代码组织

1. 按功能模块划分
2. 组件与逻辑分离
3. 统一的命名规范

## 性能优化

1. 合理使用 computed
2. 避免频繁更新
3. 组件懒加载`,
    category: '最佳实践',
    tags: ['最佳实践', '前端'],
    date: '2024-01-05',
    author: '李四',
    views: 987,
  },
];

// 模拟评论数据
const mockComments: Comment[] = [
  {
    id: '1',
    articleId: '1',
    author: '访客A',
    content: '写得太好了！学到了很多。',
    date: '2024-01-16',
  },
  { id: '2', articleId: '1', author: '访客B', content: '期待更多这样的文章！', date: '2024-01-17' },
  {
    id: '3',
    articleId: '2',
    author: '技术爱好者',
    content: 'Vapor 模式真的很快！',
    date: '2024-01-13',
  },
];
```

---

## 第二步：状态管理

### 创建博客状态

```typescript
// 文章状态
const articles = ref<Article[]>(mockArticles);
const comments = ref<Comment[]>(mockComments);

// UI 状态
const searchQuery = ref('');
const selectedCategory = ref('all');
const selectedTag = ref('');

// 获取所有分类
const categories = computed(() => {
  const cats = new Set(articles.value.map((a) => a.category));
  return ['all', ...Array.from(cats)];
});

// 获取所有标签
const allTags = computed(() => {
  const tags = new Set(articles.value.flatMap((a) => a.tags));
  return Array.from(tags);
});

// 筛选文章
const filteredArticles = computed(() => {
  return articles.value.filter((article) => {
    const matchesSearch =
      searchQuery.value === '' ||
      article.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesCategory =
      selectedCategory.value === 'all' || article.category === selectedCategory.value;

    const matchesTag = selectedTag.value === '' || article.tags.includes(selectedTag.value);

    return matchesSearch && matchesCategory && matchesTag;
  });
});

// 获取文章评论
const getArticleComments = (articleId: string) => {
  return comments.value.filter((c) => c.articleId === articleId);
};

// 添加评论
const addComment = (articleId: string, author: string, content: string) => {
  const newComment: Comment = {
    id: Date.now().toString(),
    articleId,
    author,
    content,
    date: new Date().toISOString().split('T')[0],
  };
  comments.value.push(newComment);
  saveComments();
};

// 保存评论到本地存储
const saveComments = () => {
  localStorage.setItem('lytjs-blog-comments', JSON.stringify(comments.value));
};

// 从本地存储加载评论
const loadComments = () => {
  const saved = localStorage.getItem('lytjs-blog-comments');
  if (saved) {
    try {
      comments.value = JSON.parse(saved);
    } catch {
      comments.value = mockComments;
    }
  }
};

// 增加文章浏览量
const incrementViews = (articleId: string) => {
  const article = articles.value.find((a) => a.id === articleId);
  if (article) {
    article.views++;
  }
};

// 初始化
loadComments();
```

---

## 第三步：创建组件

### 1. 文章卡片组件

```typescript
// 文章卡片组件
const ArticleCard = defineComponent({
  name: 'ArticleCard',
  props: {
    article: { type: Object as () => Article, required: true },
  },
  setup(props) {
    const router = useRouter();

    return () =>
      h(
        'article',
        {
          style: {
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '16px',
            backgroundColor: 'white',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s, transform 0.2s',
          },
          onmouseenter: (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            target.style.transform = 'translateY(-2px)';
          },
          onmouseleave: (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            target.style.boxShadow = 'none';
            target.style.transform = 'translateY(0)';
          },
          onclick: () => {
            router.push(`/article/${props.article.id}`);
          },
        },
        [
          h(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              },
            },
            [
              h(
                'span',
                {
                  style: {
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                  },
                },
                props.article.category,
              ),
              h('span', { style: { color: '#6b7280', fontSize: '14px' } }, props.article.date),
            ],
          ),
          h('h2', { style: { margin: '0 0 8px 0', fontSize: '20px' } }, props.article.title),
          h('p', { style: { margin: '0 0 12px 0', color: '#4b5563' } }, props.article.excerpt),
          h(
            'div',
            { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' } },
            props.article.tags.map((tag) =>
              h(
                'span',
                {
                  key: tag,
                  style: {
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                  },
                },
                `#${tag}`,
              ),
            ),
          ),
          h(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                color: '#6b7280',
                fontSize: '14px',
              },
            },
            [
              h('span', `作者: ${props.article.author}`),
              h('span', `👁 ${props.article.views} 阅读`),
            ],
          ),
        ],
      );
  },
});
```

### 2. 文章列表组件

```typescript
// 文章列表组件
const ArticleList = defineComponent({
  name: 'ArticleList',
  setup() {
    return () =>
      h('div', { class: 'article-list' }, [
        // 搜索栏
        h(
          'div',
          {
            style: { marginBottom: '24px' },
          },
          [
            h('input', {
              type: 'text',
              placeholder: '搜索文章...',
              value: searchQuery.value,
              style: {
                width: '100%',
                maxWidth: '400px',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
              },
              oninput: (e: Event) => {
                searchQuery.value = (e.target as HTMLInputElement).value;
              },
            }),
          ],
        ),

        // 分类筛选
        h(
          'div',
          {
            style: { marginBottom: '24px' },
          },
          [
            h('h3', { style: { marginBottom: '12px' } }, '分类'),
            h(
              'div',
              { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
              categories.value.map((cat) =>
                h(
                  'button',
                  {
                    key: cat,
                    style: {
                      padding: '6px 16px',
                      border:
                        selectedCategory.value === cat ? '2px solid #3b82f6' : '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: selectedCategory.value === cat ? '#3b82f6' : 'white',
                      color: selectedCategory.value === cat ? 'white' : '#374151',
                      cursor: 'pointer',
                    },
                    onclick: () => {
                      selectedCategory.value = cat;
                      selectedTag.value = '';
                    },
                  },
                  cat === 'all' ? '全部' : cat,
                ),
              ),
            ),
          ],
        ),

        // 标签筛选
        h(
          'div',
          {
            style: { marginBottom: '24px' },
          },
          [
            h('h3', { style: { marginBottom: '12px' } }, '标签'),
            h(
              'div',
              { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
              allTags.value.map((tag) =>
                h(
                  'button',
                  {
                    key: tag,
                    style: {
                      padding: '4px 12px',
                      border: selectedTag.value === tag ? '2px solid #10b981' : '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: selectedTag.value === tag ? '#10b981' : 'white',
                      color: selectedTag.value === tag ? 'white' : '#374151',
                      cursor: 'pointer',
                      fontSize: '14px',
                    },
                    onclick: () => {
                      selectedTag.value = selectedTag.value === tag ? '' : tag;
                      selectedCategory.value = 'all';
                    },
                  },
                  `#${tag}`,
                ),
              ),
            ),
          ],
        ),

        // 文章列表
        h('div', {}, [
          filteredArticles.value.length === 0
            ? h(
                'p',
                { style: { textAlign: 'center', color: '#6b7280', padding: '40px' } },
                '没有找到相关文章',
              )
            : filteredArticles.value.map((article) => h(ArticleCard, { article, key: article.id })),
        ]),
      ]);
  },
});
```

### 3. 文章详情组件

```typescript
// 文章详情组件
const ArticleDetail = defineComponent({
  name: 'ArticleDetail',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const articleId = route.params.id as string;
    const article = computed(() => articles.value.find((a) => a.id === articleId));
    const articleComments = computed(() => getArticleComments(articleId));
    const newCommentAuthor = ref('');
    const newCommentContent = ref('');

    // 增加浏览量
    if (article.value) {
      incrementViews(articleId);
    }

    const handleSubmitComment = () => {
      if (newCommentAuthor.value.trim() && newCommentContent.value.trim()) {
        addComment(articleId, newCommentAuthor.value, newCommentContent.value);
        newCommentAuthor.value = '';
        newCommentContent.value = '';
      }
    };

    // 将 Markdown 转换为简单 HTML
    const renderMarkdown = (content: string) => {
      return content
        .replace(/^### (.*$)/gm, '<h3 style="margin: 16px 0 8px 0; font-size: 18px;">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 style="margin: 24px 0 12px 0; font-size: 24px;">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 style="margin: 32px 0 16px 0; font-size: 32px;">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(
          /`([^`]+)`/g,
          '<code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">$1</code>',
        )
        .replace(/\n\n/g, '</p><p style="margin: 12px 0;">')
        .replace(/^- (.*$)/gm, '<li style="margin-left: 20px;">$1</li>');
    };

    if (!article.value) {
      return () => h('div', { style: { textAlign: 'center', padding: '40px' } }, '文章不存在');
    }

    return () =>
      h('div', { class: 'article-detail', style: { maxWidth: '800px', margin: '0 auto' } }, [
        // 返回按钮
        h(
          'button',
          {
            style: {
              marginBottom: '24px',
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer',
            },
            onclick: () => router.push('/'),
          },
          '← 返回列表',
        ),

        // 文章标题
        h('h1', { style: { margin: '0 0 16px 0', fontSize: '32px' } }, article.value.title),

        // 文章信息
        h(
          'div',
          { style: { display: 'flex', gap: '16px', marginBottom: '24px', color: '#6b7280' } },
          [
            h('span', `📅 ${article.value.date}`),
            h('span', `👤 ${article.value.author}`),
            h('span', `👁 ${article.value.views} 阅读`),
            h(
              'span',
              {
                style: {
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                },
              },
              article.value.category,
            ),
          ],
        ),

        // 标签
        h(
          'div',
          { style: { display: 'flex', gap: '8px', marginBottom: '32px' } },
          article.value.tags.map((tag) =>
            h(
              'span',
              {
                key: tag,
                style: {
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                },
              },
              `#${tag}`,
            ),
          ),
        ),

        // 文章内容
        h('div', {
          style: {
            lineHeight: '1.8',
            fontSize: '16px',
            color: '#374151',
            padding: '24px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          },
          innerHTML: renderMarkdown(article.value.content),
        }),

        // 评论区
        h('div', { style: { marginTop: '48px' } }, [
          h('h2', { style: { marginBottom: '24px' } }, `💬 评论 (${articleComments.value.length})`),

          // 评论表单
          h(
            'div',
            {
              style: {
                padding: '24px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                marginBottom: '24px',
              },
            },
            [
              h('h3', { style: { marginBottom: '16px' } }, '发表评论'),
              h('input', {
                type: 'text',
                placeholder: '您的名字',
                value: newCommentAuthor.value,
                style: {
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  marginBottom: '12px',
                },
                oninput: (e: Event) => {
                  newCommentAuthor.value = (e.target as HTMLInputElement).value;
                },
              }),
              h('textarea', {
                placeholder: '评论内容...',
                value: newCommentContent.value,
                style: {
                  width: '100%',
                  minHeight: '100px',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  marginBottom: '12px',
                  resize: 'vertical',
                },
                oninput: (e: Event) => {
                  newCommentContent.value = (e.target as HTMLTextAreaElement).value;
                },
              }),
              h(
                'button',
                {
                  style: {
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  },
                  onclick: handleSubmitComment,
                },
                '提交评论',
              ),
            ],
          ),

          // 评论列表
          h(
            'div',
            {},
            articleComments.value.map((comment) =>
              h(
                'div',
                {
                  key: comment.id,
                  style: {
                    padding: '16px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    marginBottom: '12px',
                  },
                },
                [
                  h(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                      },
                    },
                    [
                      h('span', { style: { fontWeight: 'bold' } }, comment.author),
                      h('span', { style: { color: '#6b7280', fontSize: '14px' } }, comment.date),
                    ],
                  ),
                  h('p', { style: { margin: 0, color: '#374151' } }, comment.content),
                ],
              ),
            ),
          ),
        ]),
      ]);
  },
});
```

---

## 第四步：创建主应用和路由

```typescript
// 主应用组件
const App = defineComponent({
  name: 'App',
  setup() {
    const { isDark, toggleTheme } = ThemePlugin.useTheme();

    return () =>
      h(
        'div',
        {
          style: {
            minHeight: '100vh',
            backgroundColor: isDark.value ? '#1f2937' : '#f9fafb',
            color: isDark.value ? 'white' : '#1f2937',
            transition: 'background-color 0.3s, color 0.3s',
          },
        },
        [
          // 头部
          h(
            'header',
            {
              style: {
                backgroundColor: isDark.value ? '#111827' : 'white',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                marginBottom: '32px',
              },
            },
            [
              h(
                'div',
                {
                  style: {
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  },
                },
                [
                  h('h1', { style: { margin: 0, fontSize: '24px' } }, '📖 LytJS 博客'),
                  h(
                    'button',
                    {
                      style: {
                        padding: '8px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        backgroundColor: isDark.value ? '#374151' : 'white',
                        color: isDark.value ? 'white' : '#374151',
                        cursor: 'pointer',
                      },
                      onclick: toggleTheme,
                    },
                    isDark.value ? '☀️ 浅色模式' : '🌙 深色模式',
                  ),
                ],
              ),
            ],
          ),

          // 主内容区
          h(
            'main',
            {
              style: { maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px' },
            },
            [h('router-view')],
          ),
        ],
      );
  },
});

// 创建路由
const router = createRouter({
  history: 'hash',
  routes: [
    { path: '/', component: ArticleList },
    { path: '/article/:id', component: ArticleDetail },
  ],
});

// 创建并挂载应用
const app = createApp(App);
app.use(ThemePlugin, { defaultTheme: 'light' });
app.use(router);
app.mount('#app');
```

---

## 第五步：创建 HTML 入口文件

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LytJS 博客系统</title>
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      #app {
        min-height: 100vh;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./blog.ts"></script>
  </body>
</html>
```

---

## 完整功能说明

### 1. 文章管理

- ✅ 文章列表展示
- ✅ 文章详情页
- ✅ 文章搜索
- ✅ 分类筛选
- ✅ 标签筛选
- ✅ 浏览量统计

### 2. 评论系统

- ✅ 评论展示
- ✅ 添加评论
- ✅ 评论存储

### 3. 用户体验

- ✅ 深色/浅色主题切换
- ✅ 响应式设计
- ✅ 路由导航
- ✅ 交互动画

### 4. 内容展示

- ✅ Markdown 简单渲染
- ✅ 标签和分类

---

## 进阶扩展建议

### 1. 添加更多功能

- 🔄 用户登录/注册
- 🔄 文章编辑和发布
- 🔄 图片上传
- 🔄 文章草稿功能
- 🔄 RSS 订阅
- 🔄 文章归档

### 2. 性能优化

- 🔄 文章列表分页
- 🔄 图片懒加载
- 🔄 文章内容缓存
- 🔄 服务端渲染 (SSR)

### 3. 测试覆盖

- 🔄 单元测试
- 🔄 组件测试
- 🔄 E2E 测试

---

## 运行本案例

```bash
# 1. 创建项目目录
mkdir lytjs-blog
cd lytjs-blog

# 2. 初始化项目
npm init -y

# 3. 安装依赖
npm install @lytjs/core @lytjs/vdom @lytjs/plugin-theme @lytjs/router

# 4. 安装开发依赖
npm install -D vite typescript

# 5. 创建上述文件
# - blog.ts
# - index.html

# 6. 启动开发服务器
npx vite
```

---

## 总结

通过这个案例，你学会了：

1. ✅ 使用 Signal 管理博客状态
2. ✅ 组件化开发博客系统
3. ✅ 使用路由系统进行导航
4. ✅ 主题切换功能
5. ✅ 本地存储持久化数据
6. ✅ 响应式 UI 设计
7. ✅ 搜索和筛选功能

继续探索 LytJS 的更多功能！
