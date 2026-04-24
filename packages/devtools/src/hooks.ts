/**
 * Lyt.js DevTools — 应用连接钩子
 *
 * 负责将 DevTools 连接到 Lyt.js 应用实例，拦截组件生命周期、
 * 状态变化和事件发射，并将数据推送到 DevTools 面板。
 *
 * 核心功能：
 * - connectToApp(app) 连接到 Lyt 应用实例
 * - 拦截组件创建/更新/卸载生命周期
 * - 拦截状态变化
 * - 拦截事件发射
 * - 将数据推送到 DevTools 面板
 *
 * 纯原生零依赖实现。
 */

// ============================================================
// 类型定义
// ============================================================

/** 组件信息（DevTools 内部使用） */
export interface ComponentInfo {
  /** 唯一标识 */
  id: string;
  /** 组件名称 */
  name: string;
  /** 父组件 ID */
  parentId: string | null;
  /** 子组件 ID 列表 */
  childIds: string[];
  /** 组件 props */
  props: Record<string, any>;
  /** 组件 state */
  state: Record<string, any>;
  /** 计算属性缓存 */
  computed: Record<string, any>;
  /** 是否已挂载 */
  isMounted: boolean;
  /** 是否已卸载 */
  isUnmounted: boolean;
  /** 对应的 DOM 元素 */
  el: Element | null;
  /** 渲染耗时（毫秒） */
  renderTime: number;
  /** 最后更新时间 */
  lastUpdateTime: number;
  /** 组件实例引用 */
  instance: any;
}

/** 事件记录 */
export interface EventRecord {
  /** 事件唯一 ID */
  id: string;
  /** 事件名称 */
  name: string;
  /** 触发时间戳 */
  timestamp: number;
  /** 事件参数 */
  args: any[];
  /** 来源组件 ID */
  componentId: string;
  /** 来源组件名称 */
  componentName: string;
}

/** 状态变化记录 */
export interface StateChangeRecord {
  /** 组件 ID */
  componentId: string;
  /** 组件名称 */
  componentName: string;
  /** 属性路径 */
  path: string;
  /** 旧值 */
  oldValue: any;
  /** 新值 */
  newValue: any;
  /** 变化时间戳 */
  timestamp: number;
}

/** DevTools 钩子回调接口 */
export interface DevToolsCallbacks {
  /** 组件创建回调 */
  onComponentCreated?: (info: ComponentInfo) => void;
  /** 组件更新回调 */
  onComponentUpdated?: (info: ComponentInfo) => void;
  /** 组件卸载回调 */
  onComponentUnmounted?: (componentId: string) => void;
  /** 状态变化回调 */
  onStateChanged?: (record: StateChangeRecord) => void;
  /** 事件触发回调 */
  onEventEmitted?: (record: EventRecord) => void;
}

/** Lyt 应用实例接口（最小化） */
export interface LytApp {
  /** 根组件实例 */
  _instance: any;
  /** 挂载方法 */
  mount: (container: string | Element) => any;
  /** 卸载方法 */
  unmount: () => void;
  /** 全局属性 */
  globalProperties?: Record<string, any>;
}

// ============================================================
// 全局状态
// ============================================================

/** 组件信息映射表（id → ComponentInfo） */
const componentMap = new Map<string, ComponentInfo>();

/** 事件记录列表 */
const eventRecords: EventRecord[] = [];

/** 状态变化记录列表 */
const stateChangeRecords: StateChangeRecord[] = [];

/** 自增 ID 计数器 */
let idCounter = 0;

/** 当前选中的组件 ID */
let selectedComponentId: string | null = null;

/** DevTools 回调 */
const callbacks: DevToolsCallbacks = {};

/** 是否已连接 */
let isConnected = false;

/** 原始方法备份（用于拦截后恢复） */
const originalMethods = new Map<any, Map<string, Function>>();

// ============================================================
// 工具函数
// ============================================================

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `comp_${++idCounter}`;
}

/**
 * 生成事件 ID
 */
function generateEventId(): string {
  return `evt_${++idCounter}`;
}

/**
 * 获取组件名称
 * 尝试从组件定义中获取名称，否则使用匿名标识
 */
function getComponentName(instance: any): string {
  if (!instance) return 'Unknown';

  // 尝试多种方式获取组件名称
  const type = instance.type || instance.options;
  if (!type) return 'Anonymous';

  // 优先使用 name 属性
  if (type.name) return type.name;

  // 尝试从 render 函数获取名称
  if (type.render && type.render.name) return type.render.name;

  // 尝试从 setup 函数获取名称
  if (type.setup && type.setup.name) return type.setup.name;

  // 检查是否是 defineComponent 返回的对象
  if (type._isComponentDefine && type.options?.name) {
    return type.options.name;
  }

  return 'Anonymous';
}

/**
 * 深拷贝对象（仅支持可序列化数据）
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as unknown as T;
  const cloned = {} as T;
  for (const key of Object.keys(obj as any)) {
    cloned[key] = deepClone((obj as any)[key]);
  }
  return cloned;
}

/**
 * 比较两个值是否不同
 */
function isDifferent(a: any, b: any): boolean {
  if (a === b) return false;
  if (typeof a !== typeof b) return true;
  if (a === null || b === null) return a !== b;
  if (typeof a === 'object') {
    return JSON.stringify(a) !== JSON.stringify(b);
  }
  return a !== b;
}

/**
 * 安全地获取对象的嵌套属性值
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let current: any = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

/**
 * 安全地设置对象的嵌套属性值
 */
function setNestedValue(obj: Record<string, any>, path: string, value: any): void {
  const keys = path.split('.');
  let current: any = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] === null || current[keys[i]] === undefined || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// ============================================================
// 核心功能
// ============================================================

/**
 * 连接到 Lyt.js 应用实例
 *
 * 通过拦截应用实例上的方法来监听组件生命周期、状态变化和事件。
 *
 * @param app - Lyt.js 应用实例
 * @param cb - DevTools 回调函数集合
 */
export function connectToApp(app: LytApp, cb?: DevToolsCallbacks): void {
  if (isConnected) {
    console.warn('[Lyt DevTools] 已经连接到应用，不能重复连接。');
    return;
  }

  // 注册回调
  if (cb) {
    Object.assign(callbacks, cb);
  }

  isConnected = true;

  // 拦截应用挂载，在挂载完成后收集根组件信息
  interceptMount(app);

  // 如果应用已经挂载，立即收集组件信息
  if (app._instance) {
    collectComponentTree(app._instance, null);
    notifyPanel();
  }

  console.log('[Lyt DevTools] 已连接到应用实例。');
}

/**
 * 拦截应用的 mount 方法
 * 在原始 mount 执行后，收集组件树信息
 */
function interceptMount(app: LytApp): void {
  const originalMount = app.mount.bind(app);

  app.mount = function (container: string | Element) {
    const result = originalMount(container);

    // 挂载完成后收集组件信息
    if (app._instance) {
      collectComponentTree(app._instance, null);
      notifyPanel();
    }

    return result;
  };
}

/**
 * 递归收集组件树信息
 *
 * 遍历应用实例的组件树，为每个组件创建 ComponentInfo。
 *
 * @param instance - 组件实例
 * @param parentId - 父组件 ID
 */
function collectComponentTree(instance: any, parentId: string | null): void {
  if (!instance) return;

  // 获取或创建组件信息
  let info = findComponentByInstance(instance);
  const isNew = !info;

  if (isNew) {
    const id = generateId();
    info = {
      id,
      name: getComponentName(instance),
      parentId,
      childIds: [],
      props: {},
      state: {},
      computed: {},
      isMounted: instance.isMounted ?? false,
      isUnmounted: instance.isUnmounted ?? false,
      el: instance.el ?? null,
      renderTime: 0,
      lastUpdateTime: Date.now(),
      instance,
    };
    componentMap.set(id, info);
  } else {
    // 更新已有组件信息
    info.parentId = parentId;
    info.name = getComponentName(instance);
    info.isMounted = instance.isMounted ?? false;
    info.isUnmounted = instance.isUnmounted ?? false;
    info.el = instance.el ?? null;
    info.lastUpdateTime = Date.now();
  }

  // 收集 props
  if (instance.props) {
    info.props = deepClone(instance.props);
  }

  // 收集 state
  if (instance.state) {
    info.state = deepClone(instance.state);
  }

  // 收集 computed 缓存
  if (instance.computedCache) {
    info.computed = deepClone(instance.computedCache);
  }

  // 拦截状态变化
  if (isNew && instance.state && typeof instance.state === 'object') {
    interceptStateChanges(info.id, instance);
  }

  // 拦截 emit
  if (isNew && instance.emit && typeof instance.emit === 'function') {
    interceptEmit(info.id, instance);
  }

  // 通知组件创建
  if (isNew) {
    callbacks.onComponentCreated?.(info);
  } else {
    callbacks.onComponentUpdated?.(info);
  }

  // 递归处理子组件
  const subTree = instance.subTree;
  if (subTree) {
    collectFromVNode(subTree, info.id);
  }
}

/**
 * 从 VNode 中收集组件信息
 */
function collectFromVNode(vnode: any, parentId: string): void {
  if (!vnode) return;

  // 如果 VNode 关联了组件实例
  if (vnode.component) {
    collectComponentTree(vnode.component, parentId);

    // 更新父组件的 childIds
    const parentInfo = componentMap.get(parentId);
    if (parentInfo && !parentInfo.childIds.includes(vnode.component.id || vnode.component._id)) {
      const childId = findComponentIdByInstance(vnode.component);
      if (childId && !parentInfo.childIds.includes(childId)) {
        parentInfo.childIds.push(childId);
      }
    }

    return;
  }

  // 递归处理子节点
  if (vnode.children && Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      if (child && typeof child === 'object') {
        collectFromVNode(child, parentId);
      }
    }
  }
}

/**
 * 拦截组件的状态变化
 * 通过 Proxy 包装 state 对象来监听变化
 */
function interceptStateChanges(componentId: string, instance: any): void {
  if (!instance.state || typeof instance.state !== 'object') return;

  const state = instance.state;
  const info = componentMap.get(componentId);
  if (!info) return;

  // 如果 state 已经是 Proxy，不重复包装
  if (state.__devtools_intercepted__) return;

  try {
    // 标记为已拦截
    Object.defineProperty(state, '__devtools_intercepted__', {
      value: true,
      enumerable: false,
      configurable: false,
    });

    // 使用 Proxy 拦截 set 操作
    const proxy = new Proxy(state, {
      set(target: any, key: string | symbol, value: any): boolean {
        const oldValue = target[key];

        // 先执行原始 set
        const result = Reflect.set(target, key, value);

        // 检查值是否真的变化了
        if (isDifferent(oldValue, value)) {
          const keyStr = String(key);
          const record: StateChangeRecord = {
            componentId,
            componentName: info.name,
            path: keyStr,
            oldValue: deepClone(oldValue),
            newValue: deepClone(value),
            timestamp: Date.now(),
          };

          stateChangeRecords.push(record);

          // 限制记录数量
          if (stateChangeRecords.length > 1000) {
            stateChangeRecords.splice(0, stateChangeRecords.length - 1000);
          }

          // 更新组件信息
          info.state = deepClone(target);
          info.lastUpdateTime = Date.now();

          // 通知状态变化
          callbacks.onStateChanged?.(record);
        }

        return result;
      },
    });

    // 替换实例的 state 引用
    // 注意：这里不直接替换，因为可能破坏响应式系统
    // 而是通过在 instance 上添加 __devtools_proxy__ 引用
    Object.defineProperty(instance, '__devtools_state_proxy__', {
      value: proxy,
      enumerable: false,
      configurable: true,
    });
  } catch (e) {
    // Proxy 创建失败时静默处理
    console.warn('[Lyt DevTools] 状态拦截失败:', e);
  }
}

/**
 * 拦截组件的 emit 方法
 * 在原始 emit 调用前后记录事件信息
 */
function interceptEmit(componentId: string, instance: any): void {
  if (!instance.emit || typeof instance.emit !== 'function') return;

  const originalEmit = instance.emit;
  const info = componentMap.get(componentId);
  if (!info) return;

  instance.emit = function (event: string, ...args: any[]) {
    // 记录事件
    const record: EventRecord = {
      id: generateEventId(),
      name: event,
      timestamp: Date.now(),
      args: deepClone(args),
      componentId,
      componentName: info.name,
    };

    eventRecords.push(record);

    // 限制记录数量
    if (eventRecords.length > 500) {
      eventRecords.splice(0, eventRecords.length - 500);
    }

    // 通知事件触发
    callbacks.onEventEmitted?.(record);

    // 调用原始 emit
    return originalEmit.call(this, event, ...args);
  };
}

/**
 * 通知面板更新
 */
function notifyPanel(): void {
  // 面板更新由各子模块自行处理
  // 这里触发一个自定义事件通知全局更新
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lyt-devtools-update'));
  }
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 根据实例查找组件信息
 */
function findComponentByInstance(instance: any): ComponentInfo | null {
  for (const info of componentMap.values()) {
    if (info.instance === instance) return info;
  }
  return null;
}

/**
 * 根据实例查找组件 ID
 */
function findComponentIdByInstance(instance: any): string | null {
  const info = findComponentByInstance(instance);
  return info ? info.id : null;
}

/**
 * 获取所有组件信息
 */
export function getAllComponents(): ComponentInfo[] {
  return Array.from(componentMap.values());
}

/**
 * 获取根组件信息
 */
export function getRootComponent(): ComponentInfo | null {
  for (const info of componentMap.values()) {
    if (info.parentId === null) return info;
  }
  return null;
}

/**
 * 根据 ID 获取组件信息
 */
export function getComponentById(id: string): ComponentInfo | null {
  return componentMap.get(id) ?? null;
}

/**
 * 获取组件的子组件列表
 */
export function getChildComponents(parentId: string): ComponentInfo[] {
  const parent = componentMap.get(parentId);
  if (!parent) return [];
  return parent.childIds
    .map(id => componentMap.get(id))
    .filter(Boolean) as ComponentInfo[];
}

/**
 * 获取所有事件记录
 */
export function getEventRecords(): EventRecord[] {
  return [...eventRecords];
}

/**
 * 获取所有状态变化记录
 */
export function getStateChangeRecords(): StateChangeRecord[] {
  return [...stateChangeRecords];
}

/**
 * 获取指定组件的状态变化记录
 */
export function getComponentStateChanges(componentId: string): StateChangeRecord[] {
  return stateChangeRecords.filter(r => r.componentId === componentId);
}

/**
 * 获取指定组件的事件记录
 */
export function getComponentEvents(componentId: string): EventRecord[] {
  return eventRecords.filter(r => r.componentId === componentId);
}

/**
 * 选中组件
 */
export function selectComponent(id: string | null): void {
  selectedComponentId = id;
}

/**
 * 获取当前选中的组件
 */
export function getSelectedComponent(): ComponentInfo | null {
  if (!selectedComponentId) return null;
  return componentMap.get(selectedComponentId) ?? null;
}

/**
 * 获取当前选中的组件 ID
 */
export function getSelectedComponentId(): string | null {
  return selectedComponentId;
}

/**
 * 手动修改组件状态
 */
export function setComponentState(componentId: string, path: string, value: any): boolean {
  const info = componentMap.get(componentId);
  if (!info || !info.instance) return false;

  const state = info.instance.state;
  if (!state || typeof state !== 'object') return false;

  const oldValue = getNestedValue(state, path);
  setNestedValue(state, path, value);

  // 记录状态变化
  const record: StateChangeRecord = {
    componentId,
    componentName: info.name,
    path,
    oldValue: deepClone(oldValue),
    newValue: deepClone(value),
    timestamp: Date.now(),
  };
  stateChangeRecords.push(record);

  // 更新组件信息
  info.state = deepClone(state);
  info.lastUpdateTime = Date.now();

  callbacks.onStateChanged?.(record);

  return true;
}

/**
 * 刷新组件树信息
 * 重新遍历应用实例，更新所有组件信息
 */
export function refreshComponentTree(app: LytApp): void {
  // 清空旧的组件映射
  componentMap.clear();

  // 重新收集
  if (app._instance) {
    collectComponentTree(app._instance, null);
    notifyPanel();
  }
}

/**
 * 清除所有记录
 */
export function clearRecords(): void {
  eventRecords.length = 0;
  stateChangeRecords.length = 0;
}

/**
 * 断开连接
 */
export function disconnect(): void {
  componentMap.clear();
  eventRecords.length = 0;
  stateChangeRecords.length = 0;
  selectedComponentId = null;
  isConnected = false;
  console.log('[Lyt DevTools] 已断开与应用的连接。');
}

/**
 * 检查是否已连接
 */
export function isAppConnected(): boolean {
  return isConnected;
}

/**
 * 获取组件数量
 */
export function getComponentCount(): number {
  return componentMap.size;
}
