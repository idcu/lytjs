 
/* eslint-env browser */
/* global window, document */

// Script injected into the page to access LytJS internals

(function () {
  'use strict';

  // Create the DevTools hook
  const hook = {
    enabled: false,
    recording: false,
    componentTree: null,
    signals: null,
    events: [],
    snapshots: [],

    /**
     * Enable the DevTools hook
     */
    enable() {
      this.enabled = true;
      console.log('[LytJS DevTools] Hook enabled');
    },

    /**
     * Disable the DevTools hook
     */
    disable() {
      this.enabled = false;
      console.log('[LytJS DevTools] Hook disabled');
    },

    /**
     * Get the component tree from LytJS runtime
     */
    getComponentTree() {
      const devtools = window.__LYTJS_DEVTOOLS__;
      if (devtools && typeof devtools.getComponentTree === 'function') {
        return devtools.getComponentTree();
      }
      // Fallback: try to find components in the DOM
      return this._findComponentsInDOM();
    },

    /**
     * Find components in DOM by walking the element tree
     */
    _findComponentsInDOM() {
      const components = [];
      // Look for elements with __lytjs_component__ property
      const walk = (element) => {
        if (element.__lytjs_component__) {
          components.push({
            id: element.__lytjs_component__.__id || Math.random().toString(36).slice(2),
            name: element.__lytjs_component__.__name || element.tagName.toLowerCase(),
            tag: element.tagName.toLowerCase(),
            props: element.__lytjs_component__.__props || {},
            state: element.__lytjs_component__.__state || {},
            children: [],
          });
        }
        for (const child of element.children) {
          walk(child);
        }
      };
      walk(document.body);
      return components;
    },

    /**
     * Get signals from LytJS runtime
     */
    getSignals() {
      const devtools = window.__LYTJS_DEVTOOLS__;
      if (devtools && typeof devtools.getSignals === 'function') {
        return devtools.getSignals();
      }
      // Fallback: return empty array
      return [];
    },

    /**
     * Get current state
     */
    getState() {
      const runtime = window.__LYTJS_DEVTOOLS__;
      if (runtime && typeof runtime.getState === 'function') {
        return runtime.getState();
      }
      return null;
    },

    /**
     * Restore state
     */
    restoreState(state) {
      const runtime = window.__LYTJS_DEVTOOLS__;
      if (runtime && typeof runtime.restoreState === 'function') {
        return runtime.restoreState(state);
      }
      return false;
    },

    /**
     * Record an event
     */
    recordEvent(event) {
      if (!this.recording) return;

      const eventRecord = {
        ...event,
        timestamp: Date.now(),
      };

      this.events.push(eventRecord);
      this.notifyPanel('EVENT', eventRecord);
    },

    /**
     * Take a snapshot of the current state
     */
    takeSnapshot() {
      const state = this.getState();
      if (state) {
        const snapshot = {
          id: this.snapshots.length,
          state: state,
          timestamp: Date.now(),
        };
        this.snapshots.push(snapshot);
        this.notifyPanel('SNAPSHOT', snapshot);
        return snapshot;
      }
      return null;
    },

    /**
     * Restore a snapshot
     */
    restoreSnapshot(snapshotId) {
      const snapshot = this.snapshots.find((s) => s.id === snapshotId);
      if (snapshot) {
        return this.restoreState(snapshot.state);
      }
      return false;
    },

    /**
     * Toggle event recording
     */
    toggleRecording(enabled) {
      this.recording = enabled;
      console.log(`[LytJS DevTools] Recording ${enabled ? 'started' : 'stopped'}`);
    },

    /**
     * Send message to DevTools panel
     */
    notifyPanel(type, data) {
      window.postMessage(
        {
          type: '__LYTJS_DEVTOOLS_' + type,
          data: data,
        },
        '*',
      );
    },

    /**
     * Send component tree to panel
     */
    sendComponentTree() {
      const tree = this.getComponentTree();
      this.notifyPanel('COMPONENT_TREE', tree);
    },

    /**
     * Send signals to panel
     */
    sendSignals() {
      const signals = this.getSignals();
      this.notifyPanel('SIGNALS', signals);
    },
  };

  // Expose the hook globally
  window.__LYTJS_DEVTOOLS_HOOK__ = hook;

  // Listen for messages from content script
  window.addEventListener('message', (event) => {
    // Only accept messages from the same window
    if (event.source !== window) return;

    const message = event.data;

    // Handle requests from content script
    switch (message.type) {
      case '__LYTJS_GET_COMPONENT_TREE':
        hook.sendComponentTree();
        break;

      case '__LYTJS_GET_SIGNALS':
        hook.sendSignals();
        break;

      case '__LYTJS_TOGGLE_RECORDING':
        hook.toggleRecording(message.enabled);
        break;

      case '__LYTJS_TAKE_SNAPSHOT':
        hook.takeSnapshot();
        break;

      case '__LYTJS_RESTORE_SNAPSHOT':
        hook.restoreSnapshot(message.snapshotId);
        break;
    }
  });

  // Notify that the hook is ready
  window.postMessage({ type: '__LYTJS_DEVTOOLS_READY' }, '*');

  console.log('[LytJS DevTools] Hook injected and ready');
})();
