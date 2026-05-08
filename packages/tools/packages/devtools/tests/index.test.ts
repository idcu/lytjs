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
} from '../src/component-tree';
import {
  generateSignalId,
  registerSignal,
  unregisterSignal,
  getSignals,
  getSignalValue,
  getSignalById,
  clearSignalRegistry,
} from '../src/signals';
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
      expect(id1).toMatch(/^component-\d+$/);
    });

    it('should register and unregister components', () => {
      const id = generateComponentId();
      const instance = { name: 'TestComponent' };
      
      registerComponent(instance, id);
      expect(getComponentCount()).toBe(1);
      
      unregisterComponent(id);
      expect(getComponentCount()).toBe(0);
    });

    it('should get component tree', () => {
      const id = generateComponentId();
      const instance = { name: 'RootComponent' };
      
      registerComponent(instance, id);
      const tree = getComponentTree();
      
      expect(tree.length).toBe(1);
      expect(tree[0].name).toBe('RootComponent');
      expect(tree[0].id).toBe(id);
    });

    it('should get component by ID', () => {
      const id = generateComponentId();
      const instance = { name: 'TestComponent', props: { foo: 'bar' } };
      
      registerComponent(instance, id);
      const node = getComponentById(id);
      
      expect(node).toBeDefined();
      expect(node?.name).toBe('TestComponent');
      expect(node?.props).toEqual({ foo: 'bar' });
    });

    it('should return undefined for unknown component ID', () => {
      const node = getComponentById('unknown-id');
      expect(node).toBeUndefined();
    });
  });

  describe('signals', () => {
    it('should generate unique signal IDs', () => {
      const id1 = generateSignalId();
      const id2 = generateSignalId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^signal-\d+$/);
    });

    it('should register and unregister signals', () => {
      const id = generateSignalId();
      const signal = { value: 42 };
      
      registerSignal(signal, id, 'count');
      expect(getSignals().length).toBe(1);
      
      unregisterSignal(id);
      expect(getSignals().length).toBe(0);
    });

    it('should get signal value', () => {
      const signal = { value: 42 };
      expect(getSignalValue(signal)).toBe(42);
    });

    it('should get signal by ID', () => {
      const id = generateSignalId();
      const signal = { value: 'test', _isRef: true };
      
      registerSignal(signal, id, 'testSignal');
      const info = getSignalById(id);
      
      expect(info).toBeDefined();
      expect(info?.name).toBe('testSignal');
      expect(info?.value).toBe('test');
      expect(info?.type).toBe('ref');
    });

    it('should detect different signal types', () => {
      const refSignal = { value: 1, _isRef: true };
      const computedSignal = { value: 2, _isComputed: true };
      const reactiveSignal = { value: 3, _isReactive: true };
      
      registerSignal(refSignal, generateSignalId(), 'ref');
      registerSignal(computedSignal, generateSignalId(), 'computed');
      registerSignal(reactiveSignal, generateSignalId(), 'reactive');
      
      const signals = getSignals();
      expect(signals.find(s => s.name === 'ref')?.type).toBe('ref');
      expect(signals.find(s => s.name === 'computed')?.type).toBe('computed');
      expect(signals.find(s => s.name === 'reactive')?.type).toBe('reactive');
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
      expect(snapshot.id).toMatch(/^snapshot-\d+$/);
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
