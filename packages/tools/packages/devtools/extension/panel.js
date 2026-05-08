/* eslint-env browser, webextensions */
/* global chrome, document */

// LytJS DevTools Panel - Main Logic

(function () {
  'use strict';

  // State
  const state = {
    currentTab: 'components',
    isRecording: false,
    events: [],
    snapshots: [],
    selectedSnapshot: null,
    selectedComponent: null,
    componentTree: [],
    signals: [],
    tabId: null,
  };

  // Initialize
  function init() {
    // Get current tab ID
    state.tabId = chrome.devtools.inspectedWindow.tabId;

    // Setup tab switching
    setupTabs();

    // Setup event handlers
    setupEventHandlers();

    // Connect to background
    connectToBackground();

    // Request initial data
    requestComponentTree();
    requestSignals();
  }

  // Tab Switching
  function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        switchTab(tabName);
      });
    });
  }

  function switchTab(tabName) {
    // Update state
    state.currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach((content) => {
      content.classList.toggle('active', content.id === tabName + '-tab');
    });
  }

  // Event Handlers
  function setupEventHandlers() {
    // Record button
    const recordBtn = document.getElementById('record-btn');
    recordBtn.addEventListener('click', toggleRecording);

    // Clear button
    const clearBtn = document.getElementById('clear-btn');
    clearBtn.addEventListener('click', clearEvents);

    // Snapshot button
    const snapshotBtn = document.getElementById('snapshot-btn');
    snapshotBtn.addEventListener('click', takeSnapshot);

    // Restore button
    const restoreBtn = document.getElementById('restore-btn');
    restoreBtn.addEventListener('click', restoreSnapshot);
  }

  // Background Connection
  function connectToBackground() {
    const port = chrome.runtime.connect({ name: 'lytjs-devtools-panel' });

    port.onMessage.addListener((message) => {
      handleMessage(message);
    });

    // Store port for sending messages
    state.port = port;
  }

  function sendMessage(message) {
    if (state.port) {
      state.port.postMessage({
        ...message,
        tabId: state.tabId,
      });
    }
  }

  // Message Handling
  function handleMessage(message) {
    switch (message.type) {
      case 'COMPONENT_TREE':
        state.componentTree = message.data;
        renderComponentTree();
        break;

      case 'SIGNALS':
        state.signals = message.data;
        renderSignals();
        break;

      case 'EVENT':
        if (state.isRecording) {
          state.events.push(message.data);
          renderEvents();
        }
        break;

      case 'SNAPSHOT':
        state.snapshots.push(message.data);
        renderSnapshots();
        break;

      case 'HOOK_READY':
        requestComponentTree();
        requestSignals();
        break;
    }
  }

  // Request Data
  function requestComponentTree() {
    sendMessage({ type: 'GET_COMPONENT_TREE' });
  }

  function requestSignals() {
    sendMessage({ type: 'GET_SIGNALS' });
  }

  // Recording
  function toggleRecording() {
    state.isRecording = !state.isRecording;
    const recordBtn = document.getElementById('record-btn');
    recordBtn.textContent = state.isRecording ? 'Stop Recording' : 'Start Recording';
    recordBtn.classList.toggle('recording', state.isRecording);

    sendMessage({
      type: 'TOGGLE_RECORDING',
      enabled: state.isRecording,
    });
  }

  function clearEvents() {
    state.events = [];
    renderEvents();
  }

  // Snapshots
  function takeSnapshot() {
    sendMessage({ type: 'TAKE_SNAPSHOT' });
  }

  function restoreSnapshot() {
    if (state.selectedSnapshot !== null) {
      sendMessage({
        type: 'RESTORE_SNAPSHOT',
        snapshotId: state.selectedSnapshot,
      });
    }
  }

  // Render Component Tree
  function renderComponentTree() {
    const container = document.getElementById('component-tree');

    if (!state.componentTree || state.componentTree.length === 0) {
      container.innerHTML = '<p class="placeholder">No component data. Is LytJS installed?</p>';
      return;
    }

    container.innerHTML = '';
    renderTreeNodes(state.componentTree, container, 0);
  }

  function renderTreeNodes(nodes, container, depth) {
    nodes.forEach((node) => {
      const nodeEl = document.createElement('div');
      nodeEl.className = 'tree-node';
      nodeEl.style.paddingLeft = depth * 16 + 8 + 'px';

      const hasChildren = node.children && node.children.length > 0;

      nodeEl.innerHTML = `
        <span class="expand">${hasChildren ? '▶' : ''}</span>
        <span class="name">${node.name || 'Component'}</span>
        ${node.tagName ? `<span class="tag">&lt;${node.tagName}&gt;</span>` : ''}
      `;

      nodeEl.addEventListener('click', (e) => {
        e.stopPropagation();
        selectComponent(node, nodeEl);
      });

      container.appendChild(nodeEl);

      if (hasChildren) {
        renderTreeNodes(node.children, container, depth + 1);
      }
    });
  }

  function selectComponent(component, element) {
    // Update selection
    document.querySelectorAll('.tree-node.selected').forEach((el) => {
      el.classList.remove('selected');
    });
    element.classList.add('selected');

    state.selectedComponent = component;
    renderComponentInspector(component);
  }

  function renderComponentInspector(component) {
    const inspector = document.getElementById('component-inspector');

    if (!component) {
      inspector.innerHTML = '<p class="placeholder">Select a component to inspect</p>';
      return;
    }

    let html = '';

    // Props section
    if (component.props && Object.keys(component.props).length > 0) {
      html += `
        <div class="inspector-section">
          <h3>Props</h3>
          ${renderProperties(component.props)}
        </div>
      `;
    }

    // State section
    if (component.state && Object.keys(component.state).length > 0) {
      html += `
        <div class="inspector-section">
          <h3>State</h3>
          ${renderProperties(component.state)}
        </div>
      `;
    }

    // Info section
    html += `
      <div class="inspector-section">
        <h3>Info</h3>
        ${renderProperties({
          ID: component.id || 'N/A',
          Name: component.name || 'Unknown',
          Tag: component.tagName || 'N/A',
        })}
      </div>
    `;

    inspector.innerHTML = html;
  }

  function renderProperties(obj) {
    return Object.entries(obj)
      .map(([key, value]) => {
        const type = typeof value;
        const valueClass =
          type === 'number'
            ? 'number'
            : type === 'boolean'
              ? 'boolean'
              : value === null
                ? 'null'
                : '';
        const displayValue =
          value === null
            ? 'null'
            : typeof value === 'object'
              ? JSON.stringify(value)
              : String(value);

        return `
        <div class="property-row">
          <span class="property-key">${key}</span>
          <span class="property-value ${valueClass}">${displayValue}</span>
        </div>
      `;
      })
      .join('');
  }

  // Render Signals
  function renderSignals() {
    const container = document.getElementById('signals-list');

    if (!state.signals || state.signals.length === 0) {
      container.innerHTML = '<p class="placeholder">No signals found</p>';
      return;
    }

    container.innerHTML = state.signals
      .map(
        (signal) => `
      <div class="list-item">
        <div class="name">${signal.name}</div>
        <div class="value">${formatValue(signal.value)}</div>
      </div>
    `,
      )
      .join('');
  }

  // Render Events
  function renderEvents() {
    const container = document.getElementById('events-list');

    if (state.events.length === 0) {
      container.innerHTML = '<p class="placeholder">No events recorded</p>';
      return;
    }

    container.innerHTML = state.events
      .map(
        (event) => `
      <div class="list-item">
        <div class="name">${event.type || 'Event'}</div>
        <div class="value">${event.detail ? JSON.stringify(event.detail) : ''}</div>
        <div class="timestamp">${new Date(event.timestamp).toLocaleTimeString()}</div>
      </div>
    `,
      )
      .join('');
  }

  // Render Snapshots
  function renderSnapshots() {
    const container = document.getElementById('timeline');
    const restoreBtn = document.getElementById('restore-btn');

    if (state.snapshots.length === 0) {
      container.innerHTML = '<p class="placeholder">No snapshots available</p>';
      restoreBtn.disabled = true;
      return;
    }

    container.innerHTML = state.snapshots
      .map(
        (snapshot, index) => `
      <div class="snapshot-item ${state.selectedSnapshot === index ? 'selected' : ''}" data-index="${index}">
        <div class="title">Snapshot #${index + 1}</div>
        <div class="time">${new Date(snapshot.timestamp).toLocaleString()}</div>
      </div>
    `,
      )
      .join('');

    // Add click handlers
    container.querySelectorAll('.snapshot-item').forEach((item) => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        state.selectedSnapshot = index;
        renderSnapshots();
        restoreBtn.disabled = false;
      });
    });
  }

  // Helpers
  function formatValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
