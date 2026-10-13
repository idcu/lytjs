// @lytjs/common-render-queue
// 渲染队列：收集同一 tick 内的渲染操作，合并重复操作，支持同步插队刷新

declare const __DEV__: boolean;

import type { RendererHost } from '@lytjs/host-contract';

// ============================================================
// 类型定义
// ============================================================

/**
 * 平台无关的 VNode 接口（最小接口，用于 RenderQueue 内部操作标识）。
 */
interface VNode {
  type: string | symbol | object;
  props: Record<string, unknown> | null;
  children: VNode[] | string | null;
  key?: string | number | symbol;
  component?: unknown;
  el?: unknown;
  anchor?: unknown;
}

/**
 * 调度任务优先级（与 AsyncScheduler 保持一致）。
 */
export type RenderPriority = 'sync' | 'high' | 'normal' | 'low';

/**
 * 优先级权重映射（数值越小优先级越高）。
 */
export const RENDER_PRIORITY_WEIGHT: Record<RenderPriority, number> = {
  sync: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/**
 * 渲染操作类型。
 *
 * ## 2026-10-10 修复（P1-2）
 *
 * 此前 `insert` / `remove` / `move` / `patch` 四种操作在 `executeOperation` 里
 * 全是 **no-op**（仅 `__DEV__` 下 warn），而类型上却带着完整的 `vnode` / `container` /
 * `anchor` 载荷 —— 调用方按类型把操作入队，运行时**什么都不发生**。
 *
 * 现在：
 * - `insert` / `remove` / `move` **真正执行**（`RendererHost` 已提供 `insert` / `remove`，
 *   载荷也齐全）；
 * - `patch` **从类型中移除** —— 它需要完整的 VNode diff，而本包是零依赖的 common 层
 *   （不能反向依赖 `@lytjs/vdom`）。删除后调用方会得到**编译期错误**，
 *   而不是运行期静默失效。需要 patch 请用 `custom` 包装。
 */
export type RenderOperation =
  | {
      type: 'insert';
      vnode: VNode;
      container: unknown;
      anchor?: unknown;
      priority?: RenderPriority;
    }
  | { type: 'remove'; vnode: VNode; priority?: RenderPriority }
  | { type: 'move'; vnode: VNode; container: unknown; anchor?: unknown; priority?: RenderPriority }
  | { type: 'custom'; fn: () => void; priority?: RenderPriority };

/**
 * 渲染队列配置项。
 */
export interface RenderQueueOptions {
  /** 是否启用操作合并（默认 true） */
  enableMerge?: boolean;
  /** 默认优先级（默认 'normal'） */
  defaultPriority?: RenderPriority;
}

// ============================================================
// 常量
// ============================================================

/** 默认队列配置 */
const DEFAULT_OPTIONS: Required<RenderQueueOptions> = {
  enableMerge: true,
  defaultPriority: 'normal',
};

// ============================================================
// RenderQueue
// ============================================================

/**
 * 渲染队列。
 *
 * 收集同一 tick 内的渲染操作，合并对同一元素的重复操作，
 * 通过 host.setTimeout 调度批量执行，支持同步插队刷新（flushSync）。
 *
 * 支持优先级排序：sync > high > normal > low
 *
 * `insert` / `remove` / `move` 会通过 `RendererHost` **真正执行**宿主节点操作；
 * `custom` 执行调用方回调（VNode diff 等本层无法完成的动作走这里）。
 *
 * @template HN - 宿主节点类型
 * @template HE - 宿主元素类型
 */
export class RenderQueue<HN = unknown, HE extends HN = HN> {
  /** 待执行的渲染操作队列 */
  private queue: RenderOperation[] = [];

  /** 是否已调度刷新 */
  private scheduled = false;

  /** 调度的定时器 ID */
  private timerId: number | null = null;

  /** 是否正在执行刷新（防止重入） */
  private flushing = false;

  /** 队列是否需要排序（dirty 标志，延迟到 flush 时排序） */
  private dirty = false;

  /** RendererHost 实例 */
  private host: RendererHost<HN, HE>;

  /** 配置项 */
  private options: Required<RenderQueueOptions>;

  /**
   * 创建渲染队列实例。
   * @param host - RendererHost 实例，用于调度时序
   * @param options - 可选的配置项
   */
  constructor(host: RendererHost<HN, HE>, options?: RenderQueueOptions) {
    this.host = host;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ==========================================================
  // 公开方法
  // ==========================================================

  /**
   * 将渲染操作加入队列。
   *
   * 如果启用了操作合并，会尝试合并同一元素的重复操作。
   * 队列不为空时自动调度刷新。
   *
   * @param op - 渲染操作
   */
  enqueue(op: RenderOperation): void {
    if (this.options.enableMerge) {
      this.tryMerge(op);
    } else {
      this.queue.push(op);
    }
    // 标记队列需要排序，延迟到 flush 时统一排序
    this.dirty = true;
    this.scheduleFlush();
  }

  /**
   * 同步插队刷新：立即执行队列中所有待处理操作。
   *
   * 用于需要立即更新 DOM 的场景（如用户交互后读取布局信息）。
   */
  flushSync(): void {
    if (this.flushing) return;

    // 取消已调度的异步刷新
    if (this.timerId !== null) {
      this.host.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.scheduled = false;

    this.flush();
  }

  /**
   * 清空队列（不执行操作）。
   */
  clear(): void {
    if (this.timerId !== null) {
      this.host.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.queue.length = 0;
    this.scheduled = false;
  }

  /**
   * 获取当前队列中的操作数量。
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * 销毁队列，清理所有状态。
   */
  dispose(): void {
    this.clear();
  }

  // ==========================================================
  // 内部方法
  // ==========================================================

  /**
   * 调度异步刷新。
   *
   * 使用 host.setTimeout(fn, 0) 在下一个微任务/宏任务中执行刷新。
   * 如果已经调度过，则跳过。
   */
  private scheduleFlush(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    this.timerId = this.host.setTimeout(() => {
      this.timerId = null;
      this.scheduled = false;
      this.flush();
    }, 0);
  }

  /**
   * 执行队列中所有操作。
   */
  private flush(): void {
    if (this.flushing || this.queue.length === 0) return;

    this.flushing = true;

    // 如果队列未排序，在 flush 时统一排序一次
    if (this.dirty) {
      this.sortQueue();
      this.dirty = false;
    }

    // 取出当前所有操作（防止 flush 过程中新增操作导致无限循环）
    const ops = this.queue;
    this.queue = [];

    for (const op of ops) {
      // 单个操作失败不应吞掉后续操作：此前 flush 无兜底，一处抛错会让整批操作丢失。
      try {
        this.executeOperation(op);
      } catch (err) {
        console.error('[lytjs/render-queue] 执行渲染操作失败:', op.type, err);
      }
    }

    this.flushing = false;

    // 如果 flush 过程中又有新操作入队，继续调度
    if (this.queue.length > 0) {
      this.scheduleFlush();
    }
  }

  /**
   * 执行单个渲染操作。
   *
   * `insert` / `remove` / `move` 通过 `RendererHost` **真正执行**宿主节点操作；
   * `custom` 执行调用方回调。
   */
  private executeOperation(op: RenderOperation): void {
    switch (op.type) {
      case 'custom':
        op.fn();
        break;
      case 'insert':
      case 'move':
        this.host.insert(
          this.requireElement(op.vnode, op.type),
          op.container as HN,
          (op.anchor ?? null) as HN | null,
        );
        break;
      case 'remove':
        this.host.remove(this.requireElement(op.vnode, 'remove'));
        break;
    }
  }

  /**
   * 取出 VNode 对应的宿主节点。
   *
   * ⚠️ 为空时**抛错而不是静默跳过** —— 这类情况几乎总是「VNode 还没挂载」或
   * 「调用方用错了 API」，静默跳过会让渲染结果少一块且毫无线索。
   */
  private requireElement(vnode: VNode, opType: string): HN {
    const el = vnode.el;
    if (el == null) {
      throw new Error(
        `[lytjs/render-queue] "${opType}" 操作的 vnode.el 为空，无法执行宿主节点操作。` +
          '请确认该 VNode 已挂载（el 已赋值），或改用 "custom" 操作自行处理。',
      );
    }
    return el as HN;
  }

  /**
   * 尝试合并重复操作。
   *
   * 合并规则：
   * - 同一元素的 remove 操作只保留最后一个
   * - 同一元素的 custom 操作合并为一次
   * - patch 操作：如果新旧 VNode 的 type 相同，仅保留最新的 patch
   */
  private tryMerge(newOp: RenderOperation): void {
    const targetKey = this.getOperationKey(newOp);
    if (!targetKey) {
      this.queue.push(newOp);
      return;
    }

    // 从后向前查找可合并的操作
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const existing = this.queue[i]!;
      if (this.getOperationKey(existing) === targetKey) {
        // remove 操作：替换为最新的
        if (newOp.type === 'remove' && existing.type === 'remove') {
          this.queue[i] = newOp;
          return;
        }
        // custom 操作：合并（保留两者，custom 不做去重）
      }
    }

    this.queue.push(newOp);
  }

  /**
   * 获取操作的标识 key，用于合并判断。
   *
   * 对于组件类型（非字符串 type），使用 vnode.key 或 type.name 避免不同组件被错误合并。
   * FIX: P1-49 定义正确类型替代 any，使用 unknown 和类型守卫
   * FIX: P2-49 提取 typeKey 为独立方法，避免每次调用时重复创建闭包
   */
  private getOperationKey(op: RenderOperation): string | null {
    switch (op.type) {
      case 'insert':
        return `insert:${this.getVNodeTypeKey(op.vnode)}`;
      case 'remove':
        return `remove:${this.getVNodeTypeKey(op.vnode)}`;
      case 'move':
        return `move:${this.getVNodeTypeKey(op.vnode)}`;
      case 'custom':
        return null;
    }
  }

  /**
   * 获取 VNode 的类型 key，用于操作合并判断。
   * FIX: P2-49 提取为独立方法，避免在 getOperationKey 中重复创建闭包
   */
  // FIX: DTS build error - 使用 unknown 中间类型
  private getVNodeTypeKey(vnode: unknown): string {
    const v = vnode as Record<string, unknown> | undefined;
    const t = v?.type;
    if (typeof t === 'string') {
      return t;
    }
    // 组件类型：优先使用 vnode.key，其次使用 type.name 或 Symbol
    if (v?.key != null) {
      return String(v.key);
    }
    if (typeof t === 'function') {
      return (t as { name?: string }).name ?? String(t);
    }
    if (typeof t === 'object' && t != null) {
      const tObj = t as Record<string, unknown>;
      return tObj.name != null ? String(tObj.name) : String(t);
    }
    return String(t);
  }

  /**
   * 按优先级排序队列。
   *
   * 优先级高的排在前面，同优先级保持插入顺序（稳定排序）。
   * FIX: P2-42 渲染队列优先级排序：确保 sync 优先级任务优先执行
   * FIX: P2-48 添加第二排序键（插入索引）确保排序稳定性
   */
  private sortQueue(): void {
    // 为每个操作添加原始索引作为第二排序键
    const indexedQueue = this.queue.map((op, index) => ({ op, index }));
    indexedQueue.sort((a, b) => {
      const priorityA = this.getPriority(a.op);
      const priorityB = this.getPriority(b.op);
      const weightA = RENDER_PRIORITY_WEIGHT[priorityA];
      const weightB = RENDER_PRIORITY_WEIGHT[priorityB];
      // 优先级不同时按优先级排序，相同时按原始索引排序（保持插入顺序）
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      return a.index - b.index;
    });
    this.queue = indexedQueue.map((item) => item.op);
  }

  /**
   * 获取操作的优先级。
   */
  private getPriority(op: RenderOperation): RenderPriority {
    return op.priority ?? this.options.defaultPriority;
  }
}
