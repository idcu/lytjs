/**
 * @lytjs/devtools unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getState,
  enable,
  disable,
  setConnected,
} from '../src/state';
import {
  generateComponentId,
  registerComponent,
  unregisterComponent,
  getComponentTree,
  getComponentById,
  getComponentCount,
  clearComponentRegistry,
  autoRegisterFromInstance,
} from '../src/component-tree';
import type { ComponentInstance } from '../src/component-tree';
import {
  generateSignalId,
  registerSignal,
  unregisterSignal,
  getSignals,
  getSignalValue,
  getSignalById,
  setSignalValue,
  clearSignalRegistry,
} from '../src/signals';
import type { SignalInfo } from '../src/signals';
import {
  startRecording as startEventRecording,
  stopRecording as stopEventRecording,
  isEventRecording,
  recordEvent,
  getEvents,
  clearEvents,
  subscribeEvents,
  getEventCount,
} from '../src/events';
import {
  takeSnapshot,
  getSnapshots,
  getSnapshotById,
  restoreSnapshot,
  deleteSnapshot,
  clearSnapshots,
} from '../src/snapshots';
import {
  isBridgeActive,
  activateBridge,
  deactivateBridge,
  sendToPanel,
  onPanelMessage,
} from '../src/bridge';

describe('@lytjs/devtools', () => {
  beforeEach(() => {
    // Clear all registries before each test
    clearComponentRegistry();
    clearSignalRegistry();
    clearEvents();
    clearSnapshots();
    deactivateBridge();
  });

  describe('state', () => {
    it('should have initial disabled state', () => {
      const state = getState();
      expect(state.enabled).toBe(false);
      expect(state.connected).toBe(false);
      expect(state.recording).toBe(false);
    });

    it('should enable DevTools', () => {
      enable();
      expect(getState().enabled).toBe(true);
    });

    it('should disable DevTools', () => {
      enable();
      disable();
      expect(getState().enabled).toBe(false);
    });

    it('should set connected status', () => {
      setConnected(true);
      expect(getState().connected).toBe(true);
      setConnected(false);
      expect(getState().connected).toBe(false);
    });
  });

  describe('component-tree', () => {
    it('should generate unique component IDs', () => {
      const id1 = generateComponentId();
      const id2 = generateComponentId();
      expect(id1).not.toBe(id2);
    });

    it('should register and unregister components', () => {
      const id = generateComponentId();
      const info = {
        id,
        name: 'TestComponent',
        children: [],
      };

      registerComponent(info);
      expect(getComponentCount()).toBe(1);

      unregisterComponent(id);
      expect(getComponentCount()).toBe(0);
    });

    it('should get component tree', () => {
      const id = generateComponentId();
      const info = {
        id,
        name: 'RootComponent',
        children: [],
      };

      registerComponent(info);
      const tree = getComponentTree();

      expect(tree.length).toBe(1);
      expect(tree[0].name).toBe('RootComponent');
      expect(tree[0].id).toBe(id);
    });

    it('should get component by ID', () => {
      const id = generateComponentId();
      const info = {
        id,
        name: 'TestComponent',
        children: [],
        props: { foo: 'bar' },
      };

      registerComponent(info);
      const node = getComponentById(id);

      expect(node).toBeDefined();
      expect(node?.name).toBe('TestComponent');
      expect(node?.props).toEqual({ foo: 'bar' });
    });

    it('should return undefined for unknown component ID', () => {
      const node = getComponentById('unknown-id');
      expect(node).toBeUndefined();
    });

    describe('autoRegisterFromInstance', () => {
      it('should auto-register a component from instance', () => {
        const instance: ComponentInstance = {
          type: 'MyComponent',
          props: { title: 'Hello' },
        };

        const id = autoRegisterFromInstance(instance);

        expect(id).toBeDefined();
        expect(getComponentCount()).toBe(1);

        const node = getComponentById(id);
        expect(node?.name).toBe('MyComponent');
        expect(node?.props).toEqual({ title: 'Hello' });
      });

      it('should use name as fallback when type is not provided', () => {
        const instance: ComponentInstance = {
          name: 'FallbackComponent',
        };

        const id = autoRegisterFromInstance(instance);
        const node = getComponentById(id);

        expect(node?.name).toBe('FallbackComponent');
      });

      it('should use Anonymous when neither type nor name is provided', () => {
        const instance: ComponentInstance = {};

        const id = autoRegisterFromInstance(instance);
        const node = getComponentById(id);

        expect(node?.name).toBe('Anonymous');
      });

      it('should recursively register children', () => {
        const instance: ComponentInstance = {
          type: 'Parent',
          children: [
            { type: 'ChildA' },
            { type: 'ChildB' },
          ],
        };

        autoRegisterFromInstance(instance);

        expect(getComponentCount()).toBe(3);

        const tree = getComponentTree();
        expect(tree).toHaveLength(1);
        expect(tree[0].name).toBe('Parent');
        expect(tree[0].children).toHaveLength(2);
        expect(tree[0].children[0].name).toBe('ChildA');
        expect(tree[0].children[1].name).toBe('ChildB');
      });

      it('should filter out function props', () => {
        const instance: ComponentInstance = {
          type: 'WithFn',
          props: {
            title: 'Test',
            onClick: () => {},
            data: { nested: true },
          } as unknown as Record<string, unknown>,
        };

        const id = autoRegisterFromInstance(instance);
        const node = getComponentById(id);

        // onClick 应该被过滤掉
        expect(node?.props).toEqual({
          title: 'Test',
          data: { nested: true },
        });
      });

      it('should set parent relationship', () => {
        const parentId = generateComponentId();
        const instance: ComponentInstance = {
          type: 'Child',
          parent: parentId,
        };

        // 先注册父组件
        registerComponent({ id: parentId, name: 'Parent', children: [] });

        const childId = autoRegisterFromInstance(instance);
        const child = getComponentById(childId);

        expect(child?.parentId).toBe(parentId);

        // 父组件的 children 应该包含子组件 ID
        const parent = getComponentById(parentId);
        expect(parent?.children).toContain(childId);
      });
    });
  });

  describe('signals', () => {
    it('should generate unique signal IDs', () => {
      const id1 = generateSignalId();
      const id2 = generateSignalId();
      expect(id1).not.toBe(id2);
    });

    it('should register and unregister signals', () => {
      const id = generateSignalId();
      const info: SignalInfo = {
        id,
        name: 'count',
        type: 'signal',
        value: 42,
        dependencies: [],
        dependents: [],
      };

      registerSignal(info);
      expect(getSignals().length).toBe(1);

      unregisterSignal(id);
      expect(getSignals().length).toBe(0);
    });

    it('should get signal value by ID', () => {
      const id = generateSignalId();
      const info: SignalInfo = {
        id,
        name: 'mySignal',
        type: 'signal',
        value: 42,
        dependencies: [],
        dependents: [],
      };

      registerSignal(info);
      expect(getSignalValue(id)).toBe(42);
    });

    it('should get signal by ID', () => {
      const id = generateSignalId();
      const info: SignalInfo = {
        id,
        name: 'testSignal',
        type: 'ref',
        value: 'test',
        dependencies: [],
        dependents: [],
      };

      registerSignal(info);
      const retrieved = getSignalById(id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('testSignal');
      expect(retrieved?.value).toBe('test');
      expect(retrieved?.type).toBe('ref');
    });

    it('should detect different signal types', () => {
      const refInfo: SignalInfo = {
        id: generateSignalId(), name: 'ref', type: 'ref',
        value: 1, dependencies: [], dependents: [],
      };
      const computedInfo: SignalInfo = {
        id: generateSignalId(), name: 'computed', type: 'computed',
        value: 2, dependencies: [], dependents: [],
      };
      const reactiveInfo: SignalInfo = {
        id: generateSignalId(), name: 'reactive', type: 'reactive',
        value: 3, dependencies: [], dependents: [],
      };

      registerSignal(refInfo);
      registerSignal(computedInfo);
      registerSignal(reactiveInfo);

      const signals = getSignals();
      expect(signals.find(s => s.name === 'ref')?.type).toBe('ref');
      expect(signals.find(s => s.name === 'computed')?.type).toBe('computed');
      expect(signals.find(s => s.name === 'reactive')?.type).toBe('reactive');
    });

    it('should set signal value', () => {
      const id = generateSignalId();
      const info: SignalInfo = {
        id,
        name: 'mutable',
        type: 'signal',
        value: 0,
        dependencies: [],
        dependents: [],
      };

      registerSignal(info);
      expect(getSignalValue(id)).toBe(0);

      const result = setSignalValue(id, 99);
      expect(result).toBe(true);
      expect(getSignalValue(id)).toBe(99);
    });

    it('should return false when setting value for non-existent signal', () => {
      const result = setSignalValue('non-existent', 42);
      expect(result).toBe(false);
    });
  });

  describe('events', () => {
    it('should start and stop recording', () => {
      expect(isEventRecording()).toBe(false);

      startEventRecording();
      expect(isEventRecording()).toBe(true);

      stopEventRecording();
      expect(isEventRecording()).toBe(false);
    });

    it('should record events when recording is active', () => {
      startEventRecording();
      const event = recordEvent('component:created', { name: 'Test' });

      expect(event).toBeDefined();
      expect(event?.type).toBe('component:created');
      expect(event?.payload).toEqual({ name: 'Test' });
      expect(getEventCount()).toBe(1);
    });

    it('should not record events when recording is inactive', () => {
      stopEventRecording();
      const event = recordEvent('component:created', { name: 'Test' });

      expect(event).toBeUndefined();
      expect(getEventCount()).toBe(0);
    });

    it('should get events with filter', () => {
      startEventRecording();
      recordEvent('component:created', {});
      recordEvent('signal:changed', {});
      recordEvent('component:mounted', {});

      const componentEvents = getEvents(['component:created', 'component:mounted']);
      expect(componentEvents.length).toBe(2);
    });

    it('should subscribe to events', () => {
      startEventRecording();
      const handler = vi.fn();

      const unsubscribe = subscribeEvents(handler);
      recordEvent('component:created', {});

      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      recordEvent('component:mounted', {});

      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe('snapshots', () => {
    it('should take a snapshot', () => {
      const snapshot = takeSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(snapshot.components).toBeDefined();
      expect(snapshot.signals).toBeDefined();
      expect(snapshot.events).toBeDefined();
    });

    it('should get all snapshots', () => {
      takeSnapshot();
      takeSnapshot();

      const snapshots = getSnapshots();
      expect(snapshots.length).toBe(2);
    });

    it('should get snapshot by ID', () => {
      const snapshot = takeSnapshot();
      const retrieved = getSnapshotById(snapshot.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(snapshot.id);
    });

    it('should delete a snapshot', () => {
      const snapshot = takeSnapshot();
      expect(getSnapshots().length).toBe(1);

      const deleted = deleteSnapshot(snapshot.id);
      expect(deleted).toBe(true);
      expect(getSnapshots().length).toBe(0);
    });

    it('should return false when deleting non-existent snapshot', () => {
      const deleted = deleteSnapshot('non-existent');
      expect(deleted).toBe(false);
    });

    describe('restoreSnapshot', () => {
      it('should return true for snapshot with no signals', () => {
        const snapshot = takeSnapshot();
        const result = restoreSnapshot(snapshot);
        expect(result).toBe(true);
      });

      it('should restore signal values from snapshot', () => {
        // 注册信号
        const signalId = generateSignalId();
        registerSignal({
          id: signalId,
          name: 'count',
          type: 'signal',
          value: 0,
          dependencies: [],
          dependents: [],
        });

        // 创建包含该信号的快照（值为 42）
        const snapshot = takeSnapshot([], [{
          id: signalId,
          name: 'count',
          type: 'signal',
          value: 42,
          dependencies: [],
          dependents: [],
        }]);

        // 恢复快照
        const result = restoreSnapshot(snapshot);
        expect(result).toBe(true);

        // 验证信号值已恢复
        expect(getSignalValue(signalId)).toBe(42);
      });

      it('should return false when signal not found in registry', () => {
        const snapshot = takeSnapshot([], [{
          id: 'non-existent-signal',
          name: 'missing',
          type: 'signal',
          value: 100,
          dependencies: [],
          dependents: [],
        }]);

        const result = restoreSnapshot(snapshot);
        expect(result).toBe(false);
      });

      it('should restore multiple signals and report partial failure', () => {
        const validId = generateSignalId();
        registerSignal({
          id: validId,
          name: 'valid',
          type: 'signal',
          value: 0,
          dependencies: [],
          dependents: [],
        });

        const snapshot = takeSnapshot([], [
          {
            id: validId,
            name: 'valid',
            type: 'signal',
            value: 55,
            dependencies: [],
            dependents: [],
          },
          {
            id: 'invalid-id',
            name: 'invalid',
            type: 'signal',
            value: 99,
            dependencies: [],
            dependents: [],
          },
        ]);

        const result = restoreSnapshot(snapshot);
        // 部分失败应返回 false
        expect(result).toBe(false);

        // 但有效的信号应已恢复
        expect(getSignalValue(validId)).toBe(55);
      });
    });
  });

  describe('bridge', () => {
    it('should activate and deactivate bridge', () => {
      expect(isBridgeActive()).toBe(false);

      activateBridge();
      expect(isBridgeActive()).toBe(true);

      deactivateBridge();
      expect(isBridgeActive()).toBe(false);
    });

    it('should create window hook when activated', () => {
      activateBridge();
      expect((window as any).__LYTJS_DEVTOOLS_HOOK__).toBeDefined();

      deactivateBridge();
      expect((window as any).__LYTJS_DEVTOOLS_HOOK__).toBeUndefined();
    });

    it('should subscribe to panel messages', () => {
      activateBridge();
      const handler = vi.fn();

      const unsubscribe = onPanelMessage(handler);

      // Simulate panel message
      window.postMessage({
        source: 'lytjs-devtools-panel',
        payload: { type: 'test' },
      }, '*');

      // Handler should be called asynchronously
      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith({ type: 'test' });
      }, 0);

      unsubscribe();
    });
  });
});
