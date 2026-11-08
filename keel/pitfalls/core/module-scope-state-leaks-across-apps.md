---
scope: core
status: active
severity: P1
last-verified: 2026-11-09
triggers: 1
keywords: [模块级状态, 全局单例, 跨app, 多实例, transition前缀, currentRouter, activePinia]
---

## 症状

两个 app 同时挂载（或同一进程存在两个渲染上下文）时，一个 app 设置的值影响另一个：
过渡类名前缀整体变化；`useRouter()` 返回另一个 app 的 router；`useStore()` 拿到同一个 store。

## 根因

消费点读取模块作用域 `let` / 单例（`globalTransitionPrefix`、`currentRouter`、`activePinia`），
而不是当前实例所属的 app context。安装期写全局、使用期读全局，后安装者必然覆盖先安装者；
同一 JS 进程内模块作用域只有一份。只有在“当前实例上下文”里取值才能天然按 app 隔离。

## 正解

- 先枚举：`grep -n "^(export )?let "` 与模块级 `new Map/Set`，逐个判「进程级缓存/调度器」还是「实例级值」。
- 实例级值：安装时同时写入 `app.provide`（已有机制），使用期优先 `inject` 取当前 app，无实例上下文才回落全局默认。
- 无 app 上下文 API 的状态（如过渡前缀）：组件 setup 读 `instance.appContext.config.<key>`，显式 prop 最高优先级。
- 不改公开导出面：新增能力走可选 `AppConfig` 字段，不新增导出、不改签名。
- 配双 app 负控：修复前必须红（断言两实例互不影响），修复后绿；不要只跑单 app 自测。
