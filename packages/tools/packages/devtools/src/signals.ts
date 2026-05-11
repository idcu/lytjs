/**
 * DevTools 信号管理模块
 * 提供响应式信号的注册、查询和修改功能
 */

export type SignalType = 'ref' | 'reactive' | 'computed' | 'signal';

export interface SignalInfo {
  id: string;
  name: string;
  type: SignalType;
  value: unknown;
  componentId?: string;
  dependencies?: string[];
  dependents?: string[];
}

const signals = new Map<string, SignalInfo>();
let signalIdCounter = 0;

/**
 * 生成信号 ID
 */
export function generateSignalId(): string {
  return `signal-${++signalIdCounter}-${Date.now().toString(36)}`;
}

/**
 * 注册信号
 */
export function registerSignal(info: SignalInfo): void {
  signals.set(info.id, info);
}

/**
 * 注销信号
 */
export function unregisterSignal(id: string): void {
  signals.delete(id);
}

/**
 * 获取所有信号
 */
export function getSignals(): SignalInfo[] {
  return Array.from(signals.values());
}

/**
 * 通过 ID 获取信号
 */
export function getSignalById(id: string): SignalInfo | undefined {
  return signals.get(id);
}

/**
 * 获取信号值
 */
export function getSignalValue(id: string): unknown {
  const signal = signals.get(id);
  return signal?.value;
}

/**
 * 设置信号值
 */
export function setSignalValue(id: string, value: unknown): boolean {
  const signal = signals.get(id);
  if (!signal) return false;
  signal.value = value;
  return true;
}

/**
 * 通过组件 ID 获取信号
 */
export function getSignalsByComponent(componentId: string): SignalInfo[] {
  return Array.from(signals.values()).filter(s => s.componentId === componentId);
}

/**
 * 清除所有信号
 */
export function clearSignals(): void {
  signals.clear();
}

/**
 * 清除信号注册表并重置计数器
 */
export function clearSignalRegistry(): void {
  signals.clear();
  signalIdCounter = 0;
}
