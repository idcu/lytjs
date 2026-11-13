---
'@lytjs/middleware': minor
---

`combineMiddlewares()` 现在把中间件 / 下游返回的 `Response` **透传给调用方**（此前只 `await`、丢弃返回值），与 `MiddlewareChain` 的语义对齐；中间件自己的返回值优先于下游。

`MiddlewareFn` 的返回类型随之放宽为 `Promise<void | Response>`：对实现方是放宽，既有只返回 `Promise<void>` 的中间件不受影响。**返回值语义变化**：此前调用 `combineMiddlewares()` 的结果恒为 `undefined`，现在可能是一个 `Response`；依赖「恒为 void」的调用方需要自行判断/忽略它。
