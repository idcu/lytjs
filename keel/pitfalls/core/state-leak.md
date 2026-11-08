---
scope: core
status: active
severity: P1
last-verified: 2026-11-09
triggers: 3
keywords: [模块级状态, 跨app, 全局单例]
---

## 症状

两个 app 同时挂载时互相污染：过渡前缀全局变化、useRouter 返回别人的 router、useStore 拿到同一个 store。

## 根因

消费点读模块作用域变量/单例（globalTransitionPrefix、currentRouter、activePinia），
安装期写全局、使用期读全局，后安装者覆盖先安装者。

## 正解

- 先 grep `^(export )?let ` 与模块级 `new Map/Set`，区分进程级缓存与实例级值。
- 实例级值：安装时写 `app.provide`，使用期优先 `inject` 当前 app，无实例才回落全局。
- 无上下文 API（如过渡前缀）：组件 setup 读 `instance.appContext.config.<key>`，显式 prop 优先。
- 不改公开导出面：新增能力走可选 AppConfig 字段；配双 app 负控，修复前必须红。
