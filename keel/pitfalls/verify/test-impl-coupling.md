---
scope: verify
status: active
severity: P1
last-verified: 2026-11-09
triggers: 1
keywords: [测试耦合, 内部实现, getBlockStackDepth, patchFlag, _instance, toContain, 产物字符串]
---

## 症状

测试断内部结构：私有计数器/字段、魔数、产物文本片段。重构实现即红，真实行为坏了却仍绿。
例：`toContain('attrName')` 在动态属性名被写成字面量 key 时照样通过。

## 根因

断言锚点选在实现细节（栈深度、字段名、代码文本），与公开可观察行为不因果等价；
子串断言过弱，可被错误产物满足。

## 正解

- 断公开行为：执行产物断 VNode 树/DOM/双向绑定/缓存引用；魔数换公开常量。
- 每改一处做负控：临时破坏实现确认变红，还原确认变绿。
- 只写不读的内部字段先查零引用（含 tests/docs），确认后删除；无公开行为可断的记待决。
