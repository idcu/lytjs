// packages/ecosystem/packages/plugin/src/registry.ts
// 通用插件系统 - 插件注册表（零框架依赖）

import { error, warn } from '@lytjs/common-error';
import type {
  EnhancedPlugin,
  Plugin,
  RegisteredPlugin,
  RegistrationResult,
  DependencyResult,
  PluginLifecycleEvent,
  PluginEventListener,
} from './types';

/**
 * 插件注册表
 * @description 管理插件的注册、注销、查询和依赖关系
 *
 * @example
 * ```typescript
 * const registry = new PluginRegistry();
 *
 * // 注册插件
 * registry.register(myPlugin, { theme: 'dark' });
 *
 * // 查询插件
 * const plugin = registry.get('my-plugin');
 *
 * // 检查依赖
 * const result = registry.checkDependencies(anotherPlugin);
 *
 * // 监听事件
 * registry.on('after:install', (event, data) => {
 *   console.log(`Plugin ${data.name} installed`);
 * });
 * ```
 */
export class PluginRegistry {
  /** 已注册插件映射（name → RegisteredPlugin） */
  private plugins = new Map<string, RegisteredPlugin>();

  /** 事件监听器映射 */
  private listeners = new Map<PluginLifecycleEvent, Set<PluginEventListener>>();

  constructor() {}

  /**
   * 注册插件
   * @param plugin - 插件实例（EnhancedPlugin 或基础 Plugin）
   * @param options - 安装选项
   * @returns 注册结果
   */
  register<TOptions = unknown, TContext = unknown>(
    plugin: EnhancedPlugin<TContext, TOptions> | Plugin<TContext, TOptions>,
    options: unknown = undefined,
  ): RegistrationResult {
    // 获取插件名称
    const name = this.getPluginName(plugin);

    if (!name) {
      const result: RegistrationResult = {
        success: false,
        name: 'anonymous',
        error: 'Plugin must have a name property. Use EnhancedPlugin interface for full support.',
      };
      this.emit('error', result);
      return result;
    }

    // 检查是否已注册
    if (this.plugins.has(name)) {
      const result: RegistrationResult = {
        success: false,
        name,
        error: `Plugin "${name}" is already registered.`,
      };
      this.emit('error', result);
      return result;
    }

    // 如果是 EnhancedPlugin，检查冲突
    if (this.isEnhancedPlugin(plugin)) {
      const conflict = this.checkConflicts(plugin);
      if (conflict) {
        const result: RegistrationResult = {
          success: false,
          name,
          error: `Plugin "${name}" conflicts with: ${conflict.join(', ')}`,
        };
        this.emit('error', result);
        return result;
      }
    }

    // 触发 before:register 事件
    this.emit('before:register', { name, plugin });

    // 注册插件
    const registered: RegisteredPlugin = {
      plugin: this.normalizePlugin(plugin),
      options,
      installed: false,
      registeredAt: Date.now(),
    };

    this.plugins.set(name, registered);

    // ⚠️ 2026-10-31：**不在此处自动安装**。
    //
    //   `register()` 的既有契约是"只登记"（`@lytjs/core` 的 `app.use()` 依赖它：
    //   先 register → 再自己调用 `plugin.install(app)` → 最后 `markInstalled()`）。
    //   若这里自动安装，`app.use()` 会**装两次**（实测 core 的 5 条插件用例变红）。
    //
    //   因此本批改为：**补齐此前根本不存在的 `install()` 方法**（见上方），
    //   独立使用 PluginRegistry 时必须显式 `await registry.install(name, ctx)`；
    //   走 `app.use()` 时由 core 负责安装，语义不变。
    this.emit('after:register', { name, plugin });

    return { success: true, name };
  }

  /**
   * 注销插件
   * @param name - 插件名称
   * @returns 是否成功注销
   */
  unregister(name: string): boolean {
    const registered = this.plugins.get(name);
    if (!registered) {
      return false;
    }

    // ⚠️ 2026-11-05 新增：**卸载被依赖的插件时给一条告警**。
    //   此前完全静默 —— 卸掉 `base` 之后，声明了 `dependencies: [{name:'base'}]` 的插件
    //   仍然在注册表里且标记为已安装，但它的依赖已经不存在了（后续调用会莫名其妙地失败）。
    //   不自动级联卸载是有意的（可能还有别的使用方），但至少要说出来。
    const dependents = this.findDependents(name);
    if (dependents.length > 0) {
      warn(
        `[plugin] 卸载 "${name}" 时，${dependents.join(', ')} 仍声明依赖它 —— ` +
          `这些插件之后可能无法正常工作（建议先卸载依赖方，或改用 optionalDependencies）。`,
      );
    }

    // 触发 before:unregister 事件
    this.emit('before:unregister', { name, plugin: registered.plugin });

    // 如果已安装，先调用 cleanup
    if (registered.installed && registered.plugin.cleanup) {
      try {
        const cleanupResult = registered.plugin.cleanup();
        // 处理异步 cleanup
        if (cleanupResult instanceof Promise) {
          cleanupResult.catch((err) => {
            error(
              `Plugin "${name}" async cleanup failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
        }
      } catch (err) {
        error(
          `Plugin "${name}" cleanup failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.plugins.delete(name);

    // 触发 after:unregister 事件
    this.emit('after:unregister', { name });

    return true;
  }

  /**
   * 获取已注册插件信息
   * @param name - 插件名称
   * @returns 插件注册信息，如果未找到则返回 undefined
   */
  get(name: string): RegisteredPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * 获取已注册的插件实例
   * @param name - 插件名称
   * @returns 插件实例，如果未找到则返回 undefined
   */
  getPlugin(name: string): EnhancedPlugin | undefined {
    return this.plugins.get(name)?.plugin;
  }

  /**
   * 检查插件是否已注册
   * @param name - 插件名称
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * 获取所有已注册插件名称
   */
  getNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * 获取所有已注册插件信息
   */
  getAll(): RegisteredPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 真正执行插件的 `install()`。
   *
   * ⚠️ 2026-10-31 修（P0）：此前**全仓没有任何地方调用 `plugin.install`** ——
   *   `register()` 只把插件塞进 Map 并把 `installed` 置 false，于是
   *   "注册成功"≠"生效"，且没有任何报错。现在提供显式安装入口。
   *
   * ⚠️ 2026-11-05 修（文档）：本段此前写着「由 `register()` 默认调用（可用
   *   `{ autoInstall: false }` 关闭）」—— **两句都是假的**：`register()` 从不自动安装
   *   （`autoInstall` 这个选项在代码里根本不存在）。照着文档写的人会以为
   *   `register()` 之后就生效了。现在按实际语义描述。
   *
   * 执行顺序（与 `app.use()` 对齐）：
   * `检查依赖` → `beforeInstall`（返回 false 取消）→ `before:install` 事件 →
   * `install()` → `installed = true` → `after:install` 事件 → `afterInstall`。
   *
   * @param name - 已注册的插件名
   * @param context - 传给 `install(context, options)` 的宿主上下文
   * @returns 安装是否成功；插件没有 `install`、依赖不满足、`beforeInstall` 返回 false 时返回 false
   * @throws 插件自己的 `install()` 抛出的异常（会先补一条 `error` 事件再原样抛出）
   */
  async install<TContext = unknown>(name: string, context?: TContext): Promise<boolean> {
    const registered = this.plugins.get(name);
    if (!registered) {
      this.emit('error', { success: false, name, error: `Plugin "${name}" is not registered.` });
      return false;
    }
    const installFn = registered.plugin.install as
      | ((ctx?: TContext, options?: unknown) => unknown)
      | undefined;
    if (typeof installFn !== 'function') {
      this.emit('error', {
        success: false,
        name,
        error: `Plugin "${name}" has no install() function.`,
      });
      return false;
    }
    if (registered.installed) return true;

    // ⚠️ 2026-11-05 修（P0）：**依赖检查此前只存在于 `app.use()` 里** ——
    //   独立使用注册表（`await registry.install(name)`）时，声明了 `dependencies`
    //   却缺依赖的插件**照样装进去**，之后在运行时才因为「某个能力不存在」而崩。
    //   两条安装路径（`app.use` / `registry.install`）必须同一套语义。
    const depResult = this.checkDependencies(registered.plugin);
    if (!depResult.satisfied) {
      const details = [
        ...depResult.missing.map(
          (dep) => `缺少 "${dep.name}"${dep.version ? `@${dep.version}` : ''}`,
        ),
        ...(depResult.requiredVersionMismatch ?? []).map(
          (dep) => `"${dep.name}" 需要 ${dep.expected}，实际 ${dep.actual ?? '未声明版本'}`,
        ),
      ];
      const message = `Plugin "${name}" has unsatisfied dependencies: ${details.join('; ')}`;
      this.emit('error', { success: false, name, error: message });
      return false;
    }

    // ⚠️ 2026-11-05 修（P0）：`beforeInstall` / `afterInstall` 两个生命周期钩子
    //   **只有 `app.use()` 会调**，独立路径完全跳过 —— 同一个插件「走 core 装」和
    //   「走 registry 装」行为不同，而 `beforeInstall` 返回 false 本该**取消安装**。
    //   现在两条路径都跑（registry.install 是 async，因此还能 await 异步钩子，
    //   这一点比 `app.use` 更强：core 遇到异步 beforeInstall 会直接抛错）。
    const beforeInstall = registered.plugin.beforeInstall as
      | ((ctx: TContext) => boolean | Promise<boolean>)
      | undefined;
    if (typeof beforeInstall === 'function') {
      let decision: boolean | undefined;
      try {
        decision = await beforeInstall.call(registered.plugin, context as TContext);
      } catch (err) {
        this.emit('error', {
          success: false,
          name,
          error: `Plugin "${name}" beforeInstall() failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        return false;
      }
      if (decision === false) {
        // 与 core 的差异（有意）：core 会顺手 `unregister`（它没有别的记录），
        // 这里保留注册状态 —— 取消安装 ≠ 从注册表消失，调用方可以稍后重试。
        return false;
      }
    }

    this.emit('before:install', { name, plugin: registered.plugin });
    try {
      const outcome = installFn.call(registered.plugin, context, registered.options);
      // 同步插件：立即落状态（避免调用方必须 await 才能看到 installed=true）
      if (outcome && typeof (outcome as Promise<unknown>).then === 'function') {
        await (outcome as Promise<unknown>);
      }
    } catch (err) {
      // ⚠️ 2026-11-05 修（P1）：此前**不发任何事件**就往外抛 —— `before:install` 已经发过、
      //   `after:install` 永远不会来，配对的事件监听器（devtools / 日志）就此泄漏状态。
      //   现在先补一条 `error`，再把原异常抛给调用方（保持既有「install 失败会抛」的语义）。
      this.emit('error', {
        success: false,
        name,
        error: `Plugin "${name}" install() failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      throw err;
    }

    registered.installed = true;
    registered.installedAt = Date.now();
    this.emit('after:install', { name, plugin: registered.plugin });

    const afterInstall = registered.plugin.afterInstall as
      | ((ctx: TContext) => void | Promise<void>)
      | undefined;
    if (typeof afterInstall === 'function') {
      try {
        await afterInstall.call(registered.plugin, context as TContext);
      } catch (err) {
        // 已经装好了：钩子失败不改 `installed`，但必须留痕（否则「装完了但收尾没做」无人知晓）
        this.emit('error', {
          success: false,
          name,
          error: `Plugin "${name}" afterInstall() failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    return true;
  }

  /**
   * 获取已安装插件列表
   */
  getInstalled(): RegisteredPlugin[] {
    return this.getAll().filter((p) => p.installed);
  }

  /**
   * 标记插件为已安装
   * @param name - 插件名称
   */
  markInstalled(name: string): void {
    const registered = this.plugins.get(name);
    if (registered) {
      registered.installed = true;
      registered.installedAt = Date.now();
    }
  }

  /**
   * 标记插件为未安装
   * @param name - 插件名称
   */
  markUninstalled(name: string): void {
    const registered = this.plugins.get(name);
    if (registered) {
      registered.installed = false;
      registered.installedAt = undefined;
    }
  }

  /**
   * 检查插件依赖是否满足
   * @param plugin - 要检查的插件
   * @returns 依赖检查结果
   */
  checkDependencies<TOptions = unknown, TContext = unknown>(
    plugin: EnhancedPlugin<TContext, TOptions> | Plugin<TContext, TOptions>,
  ): DependencyResult {
    const result: DependencyResult = {
      satisfied: true,
      missing: [],
      missingOptional: [],
      versionMismatch: [],
      requiredVersionMismatch: [],
    };

    if (!this.isEnhancedPlugin(plugin)) {
      return result;
    }

    // 检查必需依赖
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        const registered = this.plugins.get(dep.name);
        if (!registered) {
          result.satisfied = false;
          result.missing.push({ name: dep.name, version: dep.version });
        } else if (dep.version && registered.plugin.version) {
          // 简单版本比较（支持前缀 ^, ~, >=, >, <, <=, =）
          if (!this.satisfiesVersion(registered.plugin.version, dep.version)) {
            result.satisfied = false;
            const mismatch = {
              name: dep.name,
              expected: dep.version,
              actual: registered.plugin.version,
            };
            result.versionMismatch.push(mismatch);
            // 必需依赖的版本不符会让 `satisfied=false`，单独留一份便于调用方拼提示
            result.requiredVersionMismatch!.push(mismatch);
          }
        }
      }
    }

    // 检查可选依赖
    if (plugin.optionalDependencies) {
      for (const dep of plugin.optionalDependencies) {
        const registered = this.plugins.get(dep.name);
        if (!registered) {
          result.missingOptional.push({ name: dep.name, version: dep.version });
        } else if (dep.version && registered.plugin.version) {
          if (!this.satisfiesVersion(registered.plugin.version, dep.version)) {
            result.versionMismatch.push({
              name: dep.name,
              expected: dep.version,
              actual: registered.plugin.version,
            });
          }
        }
      }
    }

    return result;
  }

  /**
   * 解析插件加载顺序（拓扑排序）
   * @description 根据依赖关系计算正确的安装顺序
   * @returns 排序后的插件列表
   * @throws 如果存在循环依赖则抛出错误
   */
  resolveLoadOrder(): EnhancedPlugin[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: EnhancedPlugin[] = [];
    /** 声明了必需依赖、但该依赖没注册（此前**完全静默**，排序结果看着一切正常） */
    const missing = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving plugin "${name}"`);
      }

      visiting.add(name);

      const registered = this.plugins.get(name);
      if (registered && this.isEnhancedPlugin(registered.plugin)) {
        const requiredDeps = registered.plugin.dependencies ?? [];
        const optionalDeps = registered.plugin.optionalDependencies ?? [];

        // 先访问依赖：必需 + **已注册的可选**（可选依赖若在场，依赖方也应排在它后面）
        for (const dep of [...requiredDeps, ...optionalDeps]) {
          if (this.plugins.has(dep.name)) {
            visit(dep.name);
          } else if (requiredDeps.includes(dep)) {
            missing.add(`${name} → ${dep.name}`);
          }
        }
      }

      visiting.delete(name);
      visited.add(name);

      if (registered) {
        result.push(registered.plugin);
      }
    };

    // 按注册顺序遍历
    for (const name of this.plugins.keys()) {
      visit(name);
    }

    // ⚠️ 2026-11-05 新增：缺依赖时**说出来**。此前 `resolveLoadOrder()` 会安静地跳过
    //   未注册的依赖并返回一个「看起来完全正常」的顺序 —— 调用方按它逐个安装，
    //   装到某个插件时才发现依赖根本不在（或者更糟：运行时才发现）。
    if (missing.size > 0) {
      warn(
        `[plugin] resolveLoadOrder(): 以下必需依赖未注册，排序时已跳过 —— ` +
          `${[...missing].join('; ')}。请先注册这些依赖，否则插件会在运行时缺少能力。`,
      );
    }

    return result;
  }

  /**
   * 获取插件数量
   */
  get size(): number {
    return this.plugins.size;
  }

  /**
   * 清空所有已注册插件
   */
  clear(): void {
    // 先调用所有已安装插件的 cleanup
    for (const [name, registered] of this.plugins) {
      if (registered.installed && registered.plugin.cleanup) {
        try {
          registered.plugin.cleanup();
        } catch (err) {
          error(
            `Plugin "${name}" cleanup failed during clear: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
    this.plugins.clear();
  }

  // ==================== 事件系统 ====================

  /**
   * 注册事件监听器
   * @param event - 事件类型
   * @param handler - 事件处理函数
   * @returns 取消监听的函数
   */
  on(event: PluginLifecycleEvent, handler: PluginEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // 返回取消监听函数
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  /**
   * 触发事件
   * @param event - 事件类型
   * @param data - 事件数据
   */
  emit(event: PluginLifecycleEvent, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event, data);
        } catch (err) {
          error(
            `Plugin event handler error for "${event}": ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
  }

  /**
   * 移除事件监听器
   * @param event - 事件类型
   * @param handler - 事件处理函数
   */
  off(event: PluginLifecycleEvent, handler: PluginEventListener): void {
    this.listeners.get(event)?.delete(handler);
  }

  // ==================== 内部工具方法 ====================

  /**
   * 获取插件名称
   */
  private getPluginName<TOptions = unknown, TContext = unknown>(
    plugin: EnhancedPlugin<TContext, TOptions> | Plugin<TContext, TOptions>,
  ): string | undefined {
    if (this.isEnhancedPlugin(plugin)) {
      return plugin.name;
    }
    // 基础 Plugin 尝试从 name 属性获取
    return (plugin as unknown as Record<string, unknown>).name as string | undefined;
  }

  /**
   * 检查是否为 EnhancedPlugin
   */
  private isEnhancedPlugin<TOptions = unknown, TContext = unknown>(
    plugin: EnhancedPlugin<TContext, TOptions> | Plugin<TContext, TOptions>,
  ): plugin is EnhancedPlugin<TContext, TOptions> {
    return (
      'name' in plugin && typeof (plugin as EnhancedPlugin<TContext, TOptions>).name === 'string'
    );
  }

  /**
   * 将基础 Plugin 标准化为 EnhancedPlugin
   */
  private normalizePlugin<TOptions = unknown, TContext = unknown>(
    plugin: EnhancedPlugin<TContext, TOptions> | Plugin<TContext, TOptions>,
  ): EnhancedPlugin {
    if (this.isEnhancedPlugin(plugin)) {
      return plugin as EnhancedPlugin;
    }
    // 为基础 Plugin 生成匿名名称
    const anonymousName = `anonymous-plugin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      install: plugin.install as EnhancedPlugin['install'],
      name: anonymousName,
    };
  }

  /**
   * 找出**声明了必需依赖** `name` 的其它插件（用于卸载告警）。
   *
   * 只看 `dependencies`，不看 `optionalDependencies` —— 可选项缺席是被允许的。
   */
  private findDependents(name: string): string[] {
    const result: string[] = [];
    for (const [otherName, registered] of this.plugins) {
      if (otherName === name) continue;
      if ((registered.plugin.dependencies ?? []).some((dep) => dep.name === name)) {
        result.push(otherName);
      }
    }
    return result;
  }

  /**
   * 检查插件冲突
   */
  private checkConflicts<TOptions = unknown, TContext = unknown>(
    plugin: EnhancedPlugin<TContext, TOptions>,
  ): string[] | null {
    const conflicts: string[] = [];

    // 正向：本插件声明与谁冲突
    for (const conflictName of plugin.conflicts ?? []) {
      if (this.plugins.has(conflictName)) {
        conflicts.push(conflictName);
      }
    }

    // ⚠️ 2026-11-05 修（P1）：**反向**也要查。此前只查「本插件声明了谁」——
    //   于是 `conflicts` 的生效与否取决于**注册顺序**：
    //     先注册 a、再注册 b(conflicts:['a']) ⇒ 被拦下 ✓
    //     先注册 b(conflicts:['a'])、再注册 a        ⇒ **放行** ✗（b 的声明被无视）
    //   冲突是对称关系，不能只有后来者让步。
    for (const [otherName, registered] of this.plugins) {
      if (otherName === plugin.name) continue;
      if ((registered.plugin.conflicts ?? []).includes(plugin.name)) {
        conflicts.push(otherName);
      }
    }

    return conflicts.length > 0 ? [...new Set(conflicts)] : null;
  }

  /**
   * 判断 `actual` 是否满足 `range`。
   *
   * ⚠️ 2026-11-05 重写（P0）：旧实现只认**三段式**版本号，且不支持区间交集 ——
   *   于是下面这些**完全标准**的写法全被判成「不满足」：
   *
   *   | 依赖声明 | 实际版本 | 旧结果 | 现在 |
   *   |---|---|---|---|
   *   | `^1.0`   | 1.2.3 | ❌ 不满足 | ✅ |
   *   | `~1.2`   | 1.2.3 | ❌ 不满足 | ✅ |
   *   | `1.2`    | 1.2.3 | ❌ 不满足 | ✅ |
   *   | `*`      | 1.2.3 | ❌ 不满足 | ✅ |
   *   | `>=1.0.0 <2.0.0` | **3.0.0** | ✅ **放行（错）** | ❌ |
   *
   *   这条不是「体验问题」：`@lytjs/core` 的 `app.use()` 在依赖不满足时**直接抛错拒绝安装**，
   *   所以写成 `^1.0` 的插件根本装不上，而错误信息看起来像「版本真的不兼容」。
   *
   * 支持：`*` / `x` / 空、精确、`=`、`^`、`~`、`>`、`>=`、`<`、`<=`、
   * 缺省段（`1` / `1.2`）、空格分隔的**交集**（`>=1.0.0 <2.0.0`）、`||` 分隔的**并集**。
   */
  private satisfiesVersion(actual: string, expected: string): boolean {
    const actualVersion = this.parseVersion(actual);
    if (!actualVersion) return false;

    const range = expected.trim();
    if (range === '' || range === '*' || range === 'x' || range === 'X') return true;

    // `||` 并集：任一分支满足即可
    if (range.includes('||')) {
      return range.split('||').some((part) => this.satisfiesVersion(actual, part.trim()));
    }

    // 空格分隔 = 交集（每个比较符都要满足）
    const parts = range.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return parts.every((part) => this.satisfiesVersion(actual, part));
    }

    // 拆出比较符（注意 `>=` / `<=` 要排在 `>` / `<` 前面）
    let prefix = '';
    let rest = range;
    for (const candidate of ['>=', '<=', '>', '<', '=', '^', '~']) {
      if (rest.startsWith(candidate)) {
        prefix = candidate;
        rest = rest.slice(candidate.length).trim();
        break;
      }
    }

    const expectedParsed = this.parseVersion(rest);
    if (!expectedParsed) return false;

    const cmp = this.compareVersions(actualVersion, expectedParsed);
    const explicitParts = this.countVersionParts(rest);

    switch (prefix) {
      case '>':
        return cmp > 0;
      case '>=':
        return cmp >= 0;
      case '<':
        return cmp < 0;
      case '<=':
        return cmp <= 0;
      case '=':
        return cmp === 0;
      case '^': {
        if (cmp < 0) return false;
        // ^1.2.3 ⇒ <2.0.0；^0.2.3 ⇒ <0.3.0；^0.0.3 ⇒ <0.0.4；^0.0 ⇒ <0.1.0
        if (expectedParsed.major > 0) return actualVersion.major === expectedParsed.major;
        if (expectedParsed.minor > 0) {
          return actualVersion.major === 0 && actualVersion.minor === expectedParsed.minor;
        }
        if (explicitParts >= 3) {
          return (
            actualVersion.major === 0 &&
            actualVersion.minor === 0 &&
            actualVersion.patch === expectedParsed.patch
          );
        }
        return actualVersion.major === 0 && actualVersion.minor === 0;
      }
      case '~': {
        if (cmp < 0) return false;
        // ~1.2.3 / ~1.2 ⇒ <1.3.0
        return (
          actualVersion.major === expectedParsed.major &&
          actualVersion.minor === expectedParsed.minor
        );
      }
      default: {
        // 无比较符：三段 ⇒ 精确；缺省段 ⇒ x-range（`1.2` ⇒ 1.2.x，`1` ⇒ 1.x）
        if (explicitParts >= 3) return cmp === 0;
        if (explicitParts === 2) {
          return (
            actualVersion.major === expectedParsed.major &&
            actualVersion.minor === expectedParsed.minor
          );
        }
        return actualVersion.major === expectedParsed.major;
      }
    }
  }

  /**
   * 解析版本号字符串（缺省段按 0 补齐：`1` ⇒ 1.0.0、`1.2` ⇒ 1.2.0）。
   */
  private parseVersion(version: string): { major: number; minor: number; patch: number } | null {
    const match = version.trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    if (!match) return null;
    return {
      major: parseInt(match[1]!, 10),
      minor: match[2] === undefined ? 0 : parseInt(match[2], 10),
      patch: match[3] === undefined ? 0 : parseInt(match[3], 10),
    };
  }

  /** 版本字符串里**显式写了几段**（`1` ⇒ 1、`1.2` ⇒ 2、`1.2.3` ⇒ 3） */
  private countVersionParts(version: string): number {
    const match = version.trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    if (!match) return 0;
    if (match[3] !== undefined) return 3;
    if (match[2] !== undefined) return 2;
    return 1;
  }

  /**
   * 比较两个版本号
   * @returns 正数表示 a > b，负数表示 a < b，0 表示相等
   */
  private compareVersions(
    a: { major: number; minor: number; patch: number },
    b: { major: number; minor: number; patch: number },
  ): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    return a.patch - b.patch;
  }
}
