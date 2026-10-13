# @lytjs/compat

Vue 2/3 迁移辅助（生命周期钩子名映射）

## 目录

- [DEPRECATED_LIFECYCLE_HOOKS](#deprecated-lifecycle-hooks)
- [VUE3_LIFECYCLE_HOOKS](#vue3-lifecycle-hooks)
- [VUE2_LIFECYCLE_HOOKS](#vue2-lifecycle-hooks)
- [isDeprecatedLifecycleHook](#isdeprecatedlifecyclehook)
- [normalizeLifecycleHook](#normalizelifecyclehook)
- [LifecycleMigrationReport](#lifecyclemigrationreport)
- [migrateVue2LifecycleHooks](#migratevue2lifecyclehooks)

## DEPRECATED_LIFECYCLE_HOOKS

**Variable**

Vue 2 中被重命名、在 Vue 3 里已废弃的生命周期钩子。

| Vue 2           | Vue 3           |
| --------------- | --------------- |
| `beforeDestroy` | `beforeUnmount` |
| `destroyed`     | `unmounted`     |

其余钩子名在 Vue 2 → 3 之间**保持不变**（`beforeCreate` / `created` /
`beforeMount` / `mounted` / `beforeUpdate` / `updated` / `activated` /
`deactivated` / `errorCaptured`）。

## VUE3_LIFECYCLE_HOOKS

**Variable**

Vue 3 的完整生命周期钩子名（含新增的调试与 SSR 钩子）

## VUE2_LIFECYCLE_HOOKS

**Variable**

Vue 2 的完整生命周期钩子名

## isDeprecatedLifecycleHook

**Function**

判断某个钩子名是否是 Vue 2 遗留（在 Vue 3 中已废弃）。

### 签名

```typescript
isDeprecatedLifecycleHook: boolean;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| name | `string` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## normalizeLifecycleHook

**Function**

把单个钩子名归一化为 Vue 3 名称。

非废弃名称原样返回（包括未知名称 —— 本函数不做白名单过滤）。

### 签名

```typescript
normalizeLifecycleHook: string;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| name | `string` |      | 否   | -      |

### 返回值

**类型:** `string`

Vue 3 中的等价钩子名

## LifecycleMigrationReport

**Interface**

一次钩子迁移的结果报告

### 成员

| 名称            | 类型                                  | 描述                                                                                                                           | 可选 |
| --------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---- |
| options         | `Record<string, unknown>`             | 迁移后的新对象（不修改入参）                                                                                                   | 否   |
| renamed         | `Array<{ from: string; to: string }>` | 实际发生的重命名                                                                                                               | 否   |
| conflicts       | `string[]`                            | 冲突：新旧名同时存在。 处理策略是**保留新名、丢弃旧名**（新名是本轮迁移的目标语义）， 并把冲突的旧名记在这里供调用方提示用户。 | 否   |
| deprecatedCount | `number`                              | 命中的废弃钩子名总数（含冲突的）                                                                                               | 否   |
| ok              | `boolean`                             | 入参是否是普通对象（`null` / 数组 / 非对象一律为 `false`，且 `options` 为空对象）                                              | 否   |

## migrateVue2LifecycleHooks

**Function**

把 Vue 2 风格的组件选项对象迁移为 Vue 3 风格。

语义（全部确定性、可测）：

- `beforeDestroy` → `beforeUnmount`、`destroyed` → `unmounted`
- 若目标名已存在 ⇒ **保留新名**，旧名被丢弃并记入 `conflicts`
- 其余键**原样保留**（包括未知键），键顺序保持「首次出现」的顺序
- **不修改入参**，返回新对象
- 入参不是普通对象时返回 `ok: false` 与空 `options`（不抛错）

### 签名

```typescript
migrateVue2LifecycleHooks: LifecycleMigrationReport;
```

### 参数

| 参数    | 类型 | 描述 | 可选 | 默认值 |
| ------- | ---- | ---- | ---- | ------ |
| options | `T`  |      | 否   | -      |

### 返回值

**类型:** `LifecycleMigrationReport`

迁移结果报告
