/* eslint-env browser, webextensions */
/* global chrome, window, document */

// Content script that runs in the page context
// Injects the LytJS hook into the page

(function () {
  'use strict';

  // Inject the hook script
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  // Listen for messages from the injected script
  window.addEventListener('message', (event) => {
    // Only accept messages from the same window
    if (event.source !== window) return;

    // Check if this is a DevTools message
    if (event.data.type && event.data.type.startsWith('__LYTJS_DEVTOOLS_')) {
      // Forward to background script
      chrome.runtime.sendMessage(event.data);
    }
  });

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message) => {
    // Forward to injected script
    switch (message.type) {
      case 'GET_COMPONENT_TREE':
        window.postMessage(
          {
            type: '__LYTJS_GET_COMPONENT_TREE',
          },
          '*',
        );
        break;

      case 'GET_SIGNALS':
        window.postMessage(
          {
            type: '__LYTJS_GET_SIGNALS',
          },
          '*',
        );
        break;

      case 'TOGGLE_RECORDING':
        window.postMessage(
          {
            type: '__LYTJS_TOGGLE_RECORDING',
            enabled: message.enabled,
          },
          '*',
        );
        break;

      case 'TAKE_SNAPSHOT':
        window.postMessage(
          {
            type: '__LYTJS_TAKE_SNAPSHOT',
          },
          '*',
        );
        break;

      case 'RESTORE_SNAPSHOT':
        window.postMessage(
          {
            type: '__LYTJS_RESTORE_SNAPSHOT',
            snapshotId: message.snapshotId,
          },
          '*',
        );
        break;
    }

    return true;
  });

  // Notify that content script is ready
  chrome.runtime.sendMessage({
    type: '__LYTJS_DEVTOOLS_CONTENT_READY',
  });
})();
