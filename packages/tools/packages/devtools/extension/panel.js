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
    const btn = document.getElementById('record-btn');

    if (state.isRecording) {
      btn.textContent = 'Stop Recording';
      btn.classList.add('recording');
      sendMessage({ type: 'START_RECORDING' });
    } else {
      btn.textContent = 'Start Recording';
      btn.classList.remove('recording');
      sendMessage({ type: 'STOP_RECORDING' });
    }
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
    const tree = state.componentTree;

    if (!tree || tree.length === 0) {
      container.innerHTML = '<p class="placeholder">No component data. Is LytJS installed?</p>';
      return;
    }

    container.innerHTML = '';
    tree.forEach((node) => {
      const element = createTreeNode(node);
      container.appendChild(element);
    });
  }

  function createTreeNode(node, depth = 0) {
    const div = document.createElement('div');
    div.className = 'tree-node';
    div.style.paddingLeft = depth * 16 + 'px';

    const header = document.createElement('div');
    header.className = 'tree-node-header';
    header.innerHTML = `
      <span class="expand-icon">${node.children?.length ? '▶' : ' '}</span>
      <span class="node-name">${node.name || node.id}</span>
      <span class="node-tag">${node.tag || node.tagName || ''}</span>
    `;

    header.addEventListener('click', () => {
      if (node.children?.length) {
        const childContainer = div.querySelector('.tree-node-children');
        if (childContainer) {
          childContainer.classList.toggle('collapsed');
          header.querySelector('.expand-icon').textContent = childContainer.classList.contains(
            'collapsed',
          )
            ? '▶'
            : '▼';
        }
      }
      selectComponent(node, header);
    });

    div.appendChild(header);

    if (node.children?.length) {
      const childContainer = document.createElement('div');
      childContainer.className = 'tree-node-children';
      node.children.forEach((child) => {
        childContainer.appendChild(createTreeNode(child, depth + 1));
      });
      div.appendChild(childContainer);
    }

    return div;
  }

  function selectComponent(node, headerElement) {
    state.selectedComponent = node;
    renderComponentInspector(node);

    // Highlight in UI
    document.querySelectorAll('.tree-node-header').forEach((el) => {
      el.classList.remove('selected');
    });
    headerElement.classList.add('selected');
  }

  function renderComponentInspector(node) {
    const container = document.getElementById('component-inspector');
    if (!node) {
      container.innerHTML = '<p class="placeholder">Select a component to inspect</p>';
      return;
    }

    container.innerHTML = `
      <div class="inspector-section">
        <h3>Component</h3>
        <div class="inspector-row">
          <span class="label">Name:</span>
          <span class="value">${node.name || 'Anonymous'}</span>
        </div>
        <div class="inspector-row">
          <span class="label">ID:</span>
          <span class="value">${node.id}</span>
        </div>
        <div class="inspector-row">
          <span class="label">Tag:</span>
          <span class="value">${node.tag || node.tagName || 'N/A'}</span>
        </div>
      </div>

      <div class="inspector-section">
        <h3>Props</h3>
        <div class="inspector-data">
          ${renderObjectData(node.props)}
        </div>
      </div>

      <div class="inspector-section">
        <h3>State</h3>
        <div class="inspector-data">
          ${renderObjectData(node.state)}
        </div>
      </div>
    `;
  }

  function renderObjectData(obj) {
    if (!obj || Object.keys(obj).length === 0) {
      return '<p class="empty">No data</p>';
    }

    return Object.entries(obj)
      .map(
        ([key, value]) => `
      <div class="data-row">
        <span class="data-key">${key}:</span>
        <span class="data-value">${formatValue(value)}</span>
      </div>
    `,
      )
      .join('');
  }

  // Render Signals
  function renderSignals() {
    const container = document.getElementById('signals-list');
    const signals = state.signals;

    if (!signals || signals.length === 0) {
      container.innerHTML = '<p class="placeholder">No signals found</p>';
      return;
    }

    container.innerHTML = '';
    signals.forEach((signal) => {
      const row = document.createElement('div');
      row.className = 'signal-row';
      row.innerHTML = `
        <span class="signal-name">${signal.name || signal.id}</span>
        <span class="signal-type">${signal.type || 'signal'}</span>
        <span class="signal-value">${formatValue(signal.value)}</span>
      `;
      row.addEventListener('click', () => {
        copyToClipboard(JSON.stringify(signal.value, null, 2));
      });
      container.appendChild(row);
    });
  }

  // Render Events
  function renderEvents() {
    const container = document.getElementById('events-list');
    const events = state.events;

    if (!events || events.length === 0) {
      container.innerHTML = '<p class="placeholder">No events recorded</p>';
      return;
    }

    container.innerHTML = '';
    events.forEach((event, index) => {
      const row = document.createElement('div');
      row.className = 'event-row';
      row.innerHTML = `
        <span class="event-index">${index + 1}</span>
        <span class="event-type">${event.type}</span>
        <span class="event-time">${formatTime(event.timestamp)}</span>
      `;
      row.addEventListener('click', () => {
        showEventDetail(event);
      });
      container.appendChild(row);
    });
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + '.' + String(date.getMilliseconds()).padStart(3, '0');
  }

  function showEventDetail(event) {
    // Show event detail in a modal or inspector
    console.log('Event detail:', event);
    // Could also display in inspector panel
    const inspector = document.getElementById('component-inspector');
    if (inspector) {
      inspector.innerHTML = `
        <div class="inspector-section">
          <h3>Event Detail</h3>
          <div class="inspector-row">
            <span class="label">Type:</span>
            <span class="value">${event.type}</span>
          </div>
          <div class="inspector-row">
            <span class="label">Time:</span>
            <span class="value">${formatTime(event.timestamp)}</span>
          </div>
        </div>
        <div class="inspector-section">
          <h3>Data</h3>
          <div class="inspector-data">
            ${renderObjectData(event.detail || event.data)}
          </div>
        </div>
      `;
    }
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
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'function') return 'ƒ()';
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === 'object') return '{...}';
    return String(value);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(
      () => {
        console.log('[LytJS DevTools] Copied to clipboard');
      },
      (err) => {
        console.error('[LytJS DevTools] Failed to copy:', err);
      },
    );
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
