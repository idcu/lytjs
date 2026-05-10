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
}

const signals = new Map<string, SignalInfo>();

export function registerSignal(info: SignalInfo): void {
  signals.set(info.id, info);
}

export function unregisterSignal(id: string): void {
  signals.delete(id);
}

export function getSignals(): SignalInfo[] {
  return Array.from(signals.values());
}

export function getSignalById(id: string): SignalInfo | undefined {
  return signals.get(id);
}

export function setSignalValue(id: string, value: unknown): boolean {
  const signal = signals.get(id);
  if (!signal) return false;
  signal.value = value;
  return true;
}

export function getSignalsByComponent(componentId: string): SignalInfo[] {
  return Array.from(signals.values()).filter(s => s.componentId === componentId);
}

export function clearSignals(): void {
  signals.clear();
}
