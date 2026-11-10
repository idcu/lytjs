import { useRoute } from '@lytjs/router';

/**
 * 兜底页。
 *
 * 路由表里用 `/*` 通配符接住所有未匹配路径。`@lytjs/router` 的 matcher 支持
 * 静态段 / `:id` / `:id?` / `:id...` / `*`，**不支持** Vue 那种
 * `/:pathMatch(.*)*` 写法 —— 写成那样会整条路由失效（`*` 段被当成静态字符串）。
 */
export const NotFound = {
  name: 'NotFound',
  setup() {
    const route = useRoute();
    return { route };
  },
  template: `
    <section class="page not-found">
      <h2>页面不存在</h2>
      <p>没有匹配到路径 <code class="missing-path">{{ route().path }}</code></p>
    </section>
  `,
};
