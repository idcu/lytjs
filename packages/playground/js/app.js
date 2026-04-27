/**
 * Lyt.js Playground - Main Application
 *
 * Orchestrates editor, preview, templates, and share modules.
 */

const App = (() => {
  let currentTemplate = null
  let consolePanelCollapsed = false

  /**
   * Initialize the playground application
   */
  async function init() {
    // Populate template selector
    populateTemplateSelector()

    // Initialize preview
    PreviewManager.init('preview-iframe')

    // Set up console panel
    setupConsolePanel()

    // Set up toolbar buttons
    setupToolbar()

    // Set up keyboard shortcuts
    setupKeyboardShortcuts()

    // Check for shared code in URL
    const sharedCode = await ShareManager.getCodeFromHash()
    if (sharedCode) {
      // Load shared code
      EditorManager.init('editor-container')
      window.addEventListener('editor-ready', () => {
        EditorManager.setValue(sharedCode)
        PreviewManager.update(sharedCode)
        EditorManager.onDidChange((code) => {
          PreviewManager.scheduleUpdate(code)
        })
      })
      // Select "Custom" in dropdown
      const selector = document.getElementById('template-selector')
      if (selector) {
        const customOpt = document.createElement('option')
        customOpt.value = '__custom__'
        customOpt.textContent = 'Shared Code'
        selector.insertBefore(customOpt, selector.firstChild)
        selector.value = '__custom__'
      }
      showToast('Shared code loaded successfully')
    } else {
      // Load default template
      const defaultKey = getDefaultTemplateKey()
      loadTemplate(defaultKey)
      EditorManager.init('editor-container')
      window.addEventListener('editor-ready', () => {
        EditorManager.onDidChange((code) => {
          PreviewManager.scheduleUpdate(code)
        })
      })
    }

    // Set up console message handler
    PreviewManager.onConsoleUpdate((messages) => {
      renderConsoleMessages(messages)
    })

    // Handle window resize
    window.addEventListener('resize', () => {
      EditorManager.layout()
    })

    // Handle hash changes
    window.addEventListener('hashchange', async () => {
      if (ShareManager.hasSharedCode()) {
        const code = await ShareManager.getCodeFromHash()
        if (code) {
          EditorManager.setValue(code)
          PreviewManager.update(code)
        }
      }
    })
  }

  /**
   * Populate the template selector dropdown
   */
  function populateTemplateSelector() {
    const selector = document.getElementById('template-selector')
    if (!selector) return

    const templates = getTemplateList()
    templates.forEach(tmpl => {
      const option = document.createElement('option')
      option.value = tmpl.key
      option.textContent = tmpl.name
      option.title = tmpl.description
      selector.appendChild(option)
    })

    selector.addEventListener('change', (e) => {
      if (e.target.value !== '__custom__') {
        loadTemplate(e.target.value)
      }
    })
  }

  /**
   * Load a template by key
   */
  function loadTemplate(key) {
    const code = getTemplate(key)
    if (!code) {
      console.error('[Playground] Template not found:', key)
      return
    }

    currentTemplate = key
    EditorManager.setValue(code)
    PreviewManager.update(code)

    // Update selector
    const selector = document.getElementById('template-selector')
    if (selector) {
      selector.value = key
    }
  }

  /**
   * Set up console panel
   */
  function setupConsolePanel() {
    const toggleBtn = document.getElementById('console-toggle')
    const clearBtn = document.getElementById('console-clear')
    const panel = document.getElementById('console-panel')

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        consolePanelCollapsed = !consolePanelCollapsed
        if (panel) {
          panel.classList.toggle('collapsed', consolePanelCollapsed)
        }
        toggleBtn.classList.toggle('active', !consolePanelCollapsed)
        // Resize editor after panel toggle
        setTimeout(() => EditorManager.layout(), 300)
      })
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        PreviewManager.clearConsole()
      })
    }
  }

  /**
   * Set up toolbar buttons
   */
  function setupToolbar() {
    // Share button
    const shareBtn = document.getElementById('btn-share')
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const code = EditorManager.getValue()
        const result = await ShareManager.copyShareURL(code)
        if (result.success) {
          showToast('Share link copied to clipboard!')
        } else {
          showToast('Failed to copy link. URL: ' + result.url, 'error')
        }
      })
    }

    // Run button
    const runBtn = document.getElementById('btn-run')
    if (runBtn) {
      runBtn.addEventListener('click', () => {
        const code = EditorManager.getValue()
        PreviewManager.refresh(code)
        showToast('Preview refreshed')
      })
    }

    // Format button
    const formatBtn = document.getElementById('btn-format')
    if (formatBtn) {
      formatBtn.addEventListener('click', () => {
        EditorManager.formatDocument()
        showToast('Code formatted')
      })
    }

    // Fullscreen button
    const fullscreenBtn = document.getElementById('btn-fullscreen')
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        PreviewManager.toggleFullscreen()
        fullscreenBtn.classList.toggle('active')
        setTimeout(() => EditorManager.layout(), 300)
      })
    }
  }

  /**
   * Set up keyboard shortcuts
   */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Enter: Run preview
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        const code = EditorManager.getValue()
        PreviewManager.refresh(code)
      }

      // Ctrl/Cmd + S: Prevent default save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        showToast('Code is auto-saved in the editor')
      }
    })
  }

  /**
   * Render console messages to the console panel
   */
  function renderConsoleMessages(messages) {
    const container = document.getElementById('console-output')
    if (!container) return

    if (messages.length === 0) {
      container.innerHTML = '<div class="console-empty">No console output</div>'
      return
    }

    container.innerHTML = messages.map((msg, i) => {
      const methodClass = 'console-' + msg.method
      const icon = getConsoleIcon(msg.method)
      const time = new Date(msg.timestamp).toLocaleTimeString()
      return `<div class="console-entry ${methodClass}" data-index="${i}">
        <span class="console-icon">${icon}</span>
        <span class="console-text">${escapeHTML(msg.args)}</span>
        <span class="console-time">${time}</span>
      </div>`
    }).join('')

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight

    // Update console badge
    updateConsoleBadge(messages)
  }

  /**
   * Get icon for console method
   */
  function getConsoleIcon(method) {
    switch (method) {
      case 'error': return '&#x2715;'
      case 'warn': return '&#x26A0;'
      case 'info': return '&#x2139;'
      default: return '&#x203A;'
    }
  }

  /**
   * Update console badge count
   */
  function updateConsoleBadge(messages) {
    const badge = document.getElementById('console-badge')
    if (!badge) return

    const errorCount = messages.filter(m => m.method === 'error').length
    const warnCount = messages.filter(m => m.method === 'warn').length
    const totalCount = messages.length

    if (errorCount > 0) {
      badge.textContent = errorCount + ' errors'
      badge.className = 'console-badge badge-error'
      badge.style.display = 'inline'
    } else if (warnCount > 0) {
      badge.textContent = warnCount + ' warnings'
      badge.className = 'console-badge badge-warn'
      badge.style.display = 'inline'
    } else if (totalCount > 0) {
      badge.textContent = totalCount
      badge.className = 'console-badge badge-info'
      badge.style.display = 'inline'
    } else {
      badge.style.display = 'none'
    }
  }

  /**
   * Escape HTML to prevent XSS in console output
   */
  function escapeHTML(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  /**
   * Show a toast notification
   */
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container')
    if (!container) return

    const toast = document.createElement('div')
    toast.className = 'toast toast-' + type
    toast.textContent = message
    container.appendChild(toast)

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible')
    })

    // Auto remove
    setTimeout(() => {
      toast.classList.remove('toast-visible')
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)
        }
      }, 300)
    }, 2500)
  }

  return {
    init,
    loadTemplate,
    showToast
  }
})()

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init()
})
