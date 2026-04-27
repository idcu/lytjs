/**
 * Lyt.js SSR 示例服务器
 *
 * 演示如何使用 @lytjs/renderer 的 SSR 能力进行服务端渲染。
 */

import { createServer } from 'http'
import { renderToString } from '../../packages/renderer/dist/ssr/index.js'
import { h } from '../../packages/core/dist/index.js'

// 简单的页面组件
function App(props) {
  return h('html', {},
    h('head', {},
      h('title', {}, 'Lyt.js SSR 示例'),
      h('style', {}, `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1 { color: #42b883; }
        .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
        .card h2 { margin-top: 0; color: #1a202c; }
        code { background: #f7fafc; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
        footer { margin-top: 2rem; color: #718096; font-size: 0.875rem; }
      `)
    ),
    h('body', {},
      h('header', {},
        h('h1', {}, 'Lyt.js SSR 示例'),
        h('p', {}, '这是一个使用 Lyt.js 进行服务端渲染的示例应用。')
      ),
      h('main', {},
        h('div', { class: 'card' },
          h('h2', {}, '服务端渲染'),
          h('p', {}, '此页面由 Lyt.js 的 ', h('code', {}, 'renderToString()'), ' 在服务端生成。'),
          h('p', {}, '当前时间（服务端）: ' + new Date().toLocaleString('zh-CN'))
        ),
        h('div', { class: 'card' },
          h('h2', {}, '特性展示'),
          h('ul', {},
            h('li', {}, '零运行时依赖'),
            h('li', {}, '纯原生 JavaScript 实现'),
            h('li', {}, '支持同步和流式渲染'),
            h('li', {}, '支持 Islands Architecture')
          )
        ),
        h('div', { class: 'card' },
          h('h2', {}, '动态内容'),
          h('p', {}, '请求路径: ' + (props.path || '/'))
        )
      ),
      h('footer', {},
        h('p', {}, 'Powered by Lyt.js | 核心运行时仅 34.56 KB (ESM gzip)')
      )
    )
  )
}

const server = createServer((req, res) => {
  const html = renderToString(App({ path: req.url }))

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
})

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`Lyt.js SSR 示例服务器运行在 http://localhost:${PORT}`)
})
