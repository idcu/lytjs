/* eslint-env browser, webextensions */
/* global chrome */

// Background service worker for DevTools extension

// Store active connections
const connections = new Map();

// Listen for connections from DevTools panel
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'lytjs-devtools-panel') {
    // Handle messages from panel
    port.onMessage.addListener((message) => {
      handlePanelMessage(message, port);
    });

    port.onDisconnect.addListener(() => {
      // Clean up connections
      for (const [tabId, conn] of connections.entries()) {
        if (conn.port === port) {
          connections.delete(tabId);
          break;
        }
      }
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender) => {
  // Check if this is a DevTools message
  if (message.type && message.type.startsWith('__LYTJS_DEVTOOLS_')) {
    // Forward to connected panels
    forwardToPanels(message, sender.tab?.id);
  }

  // Handle specific message types
  switch (message.type) {
    case '__LYTJS_DEVTOOLS_READY':
      // Hook is ready in the page
      notifyPanels('HOOK_READY', { tabId: sender.tab?.id });
      break;

    case '__LYTJS_DEVTOOLS_EVENT':
      // Forward event to panels
      forwardToPanels(
        {
          type: 'EVENT',
          data: message.data,
        },
        sender.tab?.id,
      );
      break;

    case '__LYTJS_DEVTOOLS_COMPONENT_TREE':
      forwardToPanels(
        {
          type: 'COMPONENT_TREE',
          data: message.data,
        },
        sender.tab?.id,
      );
      break;

    case '__LYTJS_DEVTOOLS_SIGNALS':
      forwardToPanels(
        {
          type: 'SIGNALS',
          data: message.data,
        },
        sender.tab?.id,
      );
      break;

    case '__LYTJS_DEVTOOLS_SNAPSHOT':
      forwardToPanels(
        {
          type: 'SNAPSHOT',
          data: message.data,
        },
        sender.tab?.id,
      );
      break;
  }

  return true;
});

// Handle messages from the DevTools panel
function handlePanelMessage(message, port) {
  const tabId = message.tabId;

  if (!tabId) return;

  // Store connection
  connections.set(tabId, { port });

  // Forward to content script
  switch (message.type) {
    case 'GET_COMPONENT_TREE':
      chrome.tabs.sendMessage(tabId, {
        type: 'GET_COMPONENT_TREE',
      });
      break;

    case 'GET_SIGNALS':
      chrome.tabs.sendMessage(tabId, {
        type: 'GET_SIGNALS',
      });
      break;

    case 'TOGGLE_RECORDING':
      chrome.tabs.sendMessage(tabId, {
        type: 'TOGGLE_RECORDING',
        enabled: message.enabled,
      });
      break;

    case 'TAKE_SNAPSHOT':
      chrome.tabs.sendMessage(tabId, {
        type: 'TAKE_SNAPSHOT',
      });
      break;

    case 'RESTORE_SNAPSHOT':
      chrome.tabs.sendMessage(tabId, {
        type: 'RESTORE_SNAPSHOT',
        snapshotId: message.snapshotId,
      });
      break;
  }
}

// Forward messages to all connected panels
function forwardToPanels(message, sourceTabId) {
  for (const [tabId, conn] of connections.entries()) {
    // Only forward to panels inspecting the source tab
    if (!sourceTabId || tabId === sourceTabId) {
      try {
        conn.port.postMessage(message);
      } catch {
        // Connection might be closed
        connections.delete(tabId);
      }
    }
  }
}

// Notify panels of an event
function notifyPanels(type, data) {
  forwardToPanels({ type, data }, data.tabId);
}

// Listen for tab updates to re-inject if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Notify panels that a page has loaded
    forwardToPanels(
      {
        type: 'PAGE_LOADED',
        tabId: tabId,
      },
      tabId,
    );
  }
});
