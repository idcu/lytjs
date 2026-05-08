/* eslint-env browser, webextensions */
/* global chrome */

// Create the LytJS panel in DevTools
chrome.devtools.panels.create('LytJS', 'icons/icon48.png', 'panel.html', function () {
  // Panel created
  console.log('LytJS DevTools panel created');
});
