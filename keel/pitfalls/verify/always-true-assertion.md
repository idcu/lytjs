---
scope: verify
status: active
severity: P1
last-verified: 2026-10-10
triggers: 0
keywords: [恒过断言, toBeDefined, 布尔, 门禁形同虚设, 假绿, matcher 误用]
---

## 症状

门禁 / 测试**永远是绿的**，哪怕它守护的能力已彻底坏掉。
典型写法：`expect(called).toBeDefined()`，而 `called` 是 `boolean`。

## 根因

`toBeDefined()` 只排除 `undefined`；`false` 也是 defined ⇒ 断言**恒真**。
实测：`compiler/tests/edge-cases.test.ts` 的"自定义 directive transform 应被调用"用的就是它，
而当时 `options.directiveTransforms` **完全未被消费**（`called` 恒为 `false`）——
该测试却一直绿，把缺陷藏了 ≥6 天。

## 正解

- 断布尔一律 `toBe(true)` / `toBeGreaterThan(0)`；`toBeDefined` 只用于"对象/函数存在吗"，不用于"发生了吗"；
- 写"某回调应被调用"时断言**调用计数 + 产出落到产物上**双条件；
- 评审门禁时逐个反问"**这条断言在什么输入下会失败？**"答不出 ⇒ 它没在守任何东西；
- 同族不同机制见 `self-fulfilling-green.md`。
