# Lyt.js SSR 示例

此示例演示如何使用 Lyt.js 的 SSR（服务端渲染）能力。

## 运行

```bash
# 先构建项目
cd ../..
npm run build

# 运行 SSR 服务器
cd examples/ssr-app
node server.js
```

然后访问 http://localhost:3000

## 说明

- 使用 `renderToString()` 将组件树序列化为 HTML 字符串
- 完全在服务端渲染，无需浏览器环境
- 支持动态内容（如请求路径、当前时间等）
