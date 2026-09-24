# 插槽能力演示

覆盖：具名插槽 / 插槽作用域 / 插槽内 `v-for` / `v-if`+`v-else` / `v-show` / `v-model`。

## 运行

因为各包的产物是 ESM 且带 `@lytjs/*` 裸导入，需要先打包成单文件，再用任意静态服务器打开：

```bash
# 在仓库根目录
./node_modules/.bin/esbuild examples/slots-demo/main.ts \
  --bundle --format=iife --outfile=examples/slots-demo/bundle.js

cd examples/slots-demo && python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 同一份代码也被集成测试复用

`app.ts` 同时被 `packages/renderer/tests/slots-demo.integration.test.ts` 用 jsdom 真实渲染并断言，
因此这里不是"看起来能跑"，而是被验证过的。

> `bundle.js` 是构建产物，不入库。
