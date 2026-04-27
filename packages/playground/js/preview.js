/**
 * Lyt.js Playground - Preview Module
 *
 * Manages the iframe sandbox for live preview rendering.
 * Captures console output and handles errors.
 */

const PreviewManager = (() => {
  let iframe = null
  let consoleMessages = []
  let updateTimer = null
  let onConsoleCallback = null

  /**
   * Initialize preview iframe
   */
  function init(iframeId) {
    iframe = document.getElementById(iframeId)
    if (!iframe) {
      console.error('[Playground] Preview iframe not found:', iframeId)
      return
    }
    consoleMessages = []
  }

  /**
   * Update preview with new code (debounced)
   */
  function scheduleUpdate(code, delay = 500) {
    if (updateTimer) {
      clearTimeout(updateTimer)
    }
    updateTimer = setTimeout(() => {
      update(code)
    }, delay)
  }

  /**
   * Immediately update preview
   */
  function update(code) {
    if (!iframe) return

    // Clear previous console messages
    consoleMessages = []
    notifyConsoleUpdate()

    // Build the preview HTML with console interception
    const previewHTML = buildPreviewHTML(code)

    // Write to iframe
    const doc = iframe.contentDocument || iframe.contentWindow.document
    doc.open()
    doc.write(previewHTML)
    doc.close()
  }

  /**
   * Build preview HTML with console interception script injected
   */
  function buildPreviewHTML(code) {
    // Extract the user's HTML content
    let userHTML = code

    // If the code is a complete HTML document, inject our console interceptor
    if (userHTML.includes('<html') || userHTML.includes('<!DOCTYPE')) {
      // Inject console interceptor before </head> or at the beginning
      const consoleInterceptor = `
<script>
(function() {
  // Override console methods to send messages to parent
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    clear: console.clear,
    table: console.table
  };

  function sendToParent(type, args) {
    try {
      const serialized = Array.from(args).map(arg => {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg, null, 2); }
          catch(e) { return String(arg); }
        }
        return String(arg);
      }).join(' ');

      window.parent.postMessage({
        type: 'console',
        method: type,
        args: serialized,
        source: 'lytjs-preview'
      }, '*');
    } catch(e) {}
  }

  console.log = function() { sendToParent('log', arguments); originalConsole.log.apply(console, arguments); };
  console.warn = function() { sendToParent('warn', arguments); originalConsole.warn.apply(console, arguments); };
  console.error = function() { sendToParent('error', arguments); originalConsole.error.apply(console, arguments); };
  console.info = function() { sendToParent('info', arguments); originalConsole.info.apply(console, arguments); };
  console.clear = function() { originalConsole.clear.apply(console, arguments); };
  console.table = function() { sendToParent('log', arguments); originalConsole.table.apply(console, arguments); };

  // Capture unhandled errors
  window.addEventListener('error', function(e) {
    sendToParent('error', ['Error: ' + e.message + ' (line ' + e.lineno + ')']);
  });

  window.addEventListener('unhandledrejection', function(e) {
    sendToParent('error', ['Unhandled Promise Rejection: ' + e.reason]);
  });
})();
</script>`

      // Inject before </head> if it exists, otherwise at the beginning
      if (userHTML.includes('</head>')) {
        userHTML = userHTML.replace('</head>', consoleInterceptor + '\n</head>')
      } else {
        userHTML = consoleInterceptor + '\n' + userHTML
      }
    } else {
      // Wrap non-HTML code in a basic HTML document
      userHTML = `<!DOCTYPE html>
<html>
<head>
<script>
(function() {
  const originalConsole = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  function sendToParent(type, args) {
    try {
      window.parent.postMessage({ type: 'console', method: type, args: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), source: 'lytjs-preview' }, '*');
    } catch(e) {}
  }
  console.log = function() { sendToParent('log', arguments); originalConsole.log.apply(console, arguments); };
  console.warn = function() { sendToParent('warn', arguments); originalConsole.warn.apply(console, arguments); };
  console.error = function() { sendToParent('error', arguments); originalConsole.error.apply(console, arguments); };
  window.addEventListener('error', function(e) { sendToParent('error', ['Error: ' + e.message]); });
})();
</script>
</head>
<body>
<div id="app"></div>
<script type="module">
${code}
<\/script>
</body>
</html>`
    }

    return userHTML
  }

  /**
   * Handle messages from the preview iframe
   */
  function handleMessage(event) {
    if (event.data && event.data.source === 'lytjs-preview') {
      if (event.data.type === 'console') {
        const msg = {
          method: event.data.method,
          args: event.data.args,
          timestamp: Date.now()
        }
        consoleMessages.push(msg)

        // Limit stored messages
        if (consoleMessages.length > 200) {
          consoleMessages = consoleMessages.slice(-200)
        }

        notifyConsoleUpdate()
      }
    }
  }

  /**
   * Notify console panel of new messages
   */
  function notifyConsoleUpdate() {
    if (onConsoleCallback) {
      onConsoleCallback([...consoleMessages])
    }
  }

  /**
   * Set callback for console updates
   */
  function onConsoleUpdate(callback) {
    onConsoleCallback = callback
  }

  /**
   * Get all console messages
   */
  function getConsoleMessages() {
    return [...consoleMessages]
  }

  /**
   * Clear console messages
   */
  function clearConsole() {
    consoleMessages = []
    notifyConsoleUpdate()
  }

  /**
   * Toggle fullscreen preview
   */
  function toggleFullscreen() {
    if (!iframe) return
    const container = iframe.parentElement
    if (container) {
      container.classList.toggle('fullscreen')
      // Trigger a resize event for the iframe content
      setTimeout(() => {
        const event = new Event('resize')
        iframe.contentWindow?.dispatchEvent(event)
      }, 100)
    }
  }

  /**
   * Refresh the preview
   */
  function refresh(code) {
    if (updateTimer) {
      clearTimeout(updateTimer)
      updateTimer = null
    }
    update(code)
  }

  // Listen for messages from iframe
  window.addEventListener('message', handleMessage)

  return {
    init,
    scheduleUpdate,
    update,
    refresh,
    onConsoleUpdate,
    getConsoleMessages,
    clearConsole,
    toggleFullscreen
  }
})()
