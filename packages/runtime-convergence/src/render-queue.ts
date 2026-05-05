// @lytjs/runtime-convergence - render-queue
// 渲染队列：收集同一 tick 内的渲染操作，合并重复操作，支持同步插队刷新

import type { RendererHost } from '@lytjs/host-contract';
import type { RenderOperation, RenderQueueOptions, RenderPriority } from './types';
import { RENDER_PRIORITY_WEIGHT } from './types';

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
    // 按优先级排序
    this.sortQueue();
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

    // 取出当前所有操作（防止 flush 过程中新增操作导致无限循环）
    const ops = this.queue;
    this.queue = [];

    for (const op of ops) {
      this.executeOperation(op);
    }

    this.flushing = false;

    // 如果 flush 过程中又有新操作入队，继续调度
    if (this.queue.length > 0) {
      this.scheduleFlush();
    }
  }

  /**
   * 执行单个渲染操作。
   */
  private executeOperation(op: RenderOperation): void {
    switch (op.type) {
      case 'custom':
        op.fn();
        break;
      // insert / remove / move / patch 操作由上层 renderer 处理，
      // 此处仅作为调度容器，实际执行通过 custom 类型传入
      default:
        break;
    }
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
        // patch 操作：替换为最新的
        if (newOp.type === 'patch' && existing.type === 'patch') {
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
   */
  private getOperationKey(op: RenderOperation): string | null {
    switch (op.type) {
      case 'insert':
        return `insert:${String(op.vnode.type)}`;
      case 'remove':
        return `remove:${String(op.vnode.type)}`;
      case 'move':
        return `move:${String(op.vnode.type)}`;
      case 'patch':
        return `patch:${String(op.newVNode.type)}`;
      case 'custom':
        return null;
    }
  }

  /**
   * 按优先级排序队列。
   *
   * 优先级高的排在前面，同优先级保持插入顺序（稳定排序）。
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const priorityA = this.getPriority(a);
      const priorityB = this.getPriority(b);
      const weightA = RENDER_PRIORITY_WEIGHT[priorityA];
      const weightB = RENDER_PRIORITY_WEIGHT[priorityB];
      return weightA - weightB;
    });
  }

  /**
   * 获取操作的优先级。
   */
  private getPriority(op: RenderOperation): RenderPriority {
    return op.priority ?? this.options.defaultPriority;
  }
}
