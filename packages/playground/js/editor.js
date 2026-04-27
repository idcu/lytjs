/**
 * Lyt.js Playground - Editor Module
 *
 * Manages Monaco Editor integration for code editing.
 * Supports HTML syntax highlighting with embedded JS/CSS.
 */

const EditorManager = (() => {
  let editor = null
  let isReady = false
  let pendingCode = null

  /**
   * Initialize Monaco Editor
   */
  async function init(containerId) {
    const container = document.getElementById(containerId)
    if (!container) {
      console.error('[Playground] Editor container not found:', containerId)
      return
    }

    // Load Monaco from CDN
    await loadMonaco()

    // Configure Monaco environment for workers
    window.MonacoEnvironment = {
      getWorkerUrl: function (moduleId, label) {
        if (label === 'json') {
          return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.MonacoEnvironment = { baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/' };
            importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs/language/json/json.worker.js');
          `)}`
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
          return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.MonacoEnvironment = { baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/' };
            importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs/language/css/css.worker.js');
          `)}`
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
          return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.MonacoEnvironment = { baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/' };
            importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs/language/html/html.worker.js');
          `)}`
        }
        if (label === 'typescript' || label === 'javascript') {
          return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.MonacoEnvironment = { baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/' };
            importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs/language/typescript/ts.worker.js');
          `)}`
        }
        return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
          self.MonacoEnvironment = { baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/' };
          importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs/editor/editor.worker.js');
        `)}`
      }
    }

    // Create editor
    editor = monaco.editor.create(container, {
      value: pendingCode || '',
      language: 'html',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      folding: true,
      links: true,
      padding: { top: 8, bottom: 8 },
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10
      }
    })

    // Define custom theme
    monaco.editor.defineTheme('lytjs-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A737D' },
        { token: 'keyword', foreground: '42b883' },
        { token: 'string', foreground: '98C379' },
        { token: 'number', foreground: 'D19A66' },
        { token: 'tag', foreground: 'E06C75' },
        { token: 'attribute.name', foreground: 'D19A66' },
        { token: 'attribute.value', foreground: '98C379' },
      ],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#cdd6f4',
        'editor.lineHighlightBackground': '#313244',
        'editorCursor.foreground': '#f5e0dc',
        'editor.selectionBackground': '#45475a',
        'editorLineNumber.foreground': '#6c7086',
        'editorLineNumber.activeForeground': '#cdd6f4',
      }
    })

    monaco.editor.setTheme('lytjs-dark')

    isReady = true
    pendingCode = null

    // Dispatch ready event
    window.dispatchEvent(new CustomEvent('editor-ready'))
  }

  /**
   * Load Monaco Editor from CDN
   */
  function loadMonaco() {
    return new Promise((resolve, reject) => {
      if (window.monaco) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs/loader.js'
      script.onload = () => {
        require.config({
          paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs' }
        })
        require(['vs/editor/editor.main'], () => {
          resolve()
        })
      }
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  /**
   * Get current editor content
   */
  function getValue() {
    if (!editor) return pendingCode || ''
    return editor.getValue()
  }

  /**
   * Set editor content
   */
  function setValue(code) {
    if (!editor) {
      pendingCode = code
      return
    }
    const currentValue = editor.getValue()
    if (currentValue !== code) {
      // Save cursor position and scroll position
      const position = editor.getPosition()
      const scrollTop = editor.getScrollTop()

      editor.setValue(code)

      // Restore cursor if possible
      if (position && position.lineNumber <= editor.getModel().getLineCount()) {
        editor.setPosition(position)
        editor.revealLineInCenter(position.lineNumber)
      }
      editor.setScrollTop(scrollTop)
    }
  }

  /**
   * Register content change callback
   */
  function onDidChange(callback) {
    if (!editor) return
    editor.onDidChangeModelContent(() => {
      callback(editor.getValue())
    })
  }

  /**
   * Format the document
   */
  function formatDocument() {
    if (!editor) return
    editor.getAction('editor.action.formatDocument')?.run()
  }

  /**
   * Focus the editor
   */
  function focus() {
    if (!editor) return
    editor.focus()
  }

  /**
   * Resize the editor (called on layout changes)
   */
  function layout() {
    if (!editor) return
    editor.layout()
  }

  /**
   * Check if editor is ready
   */
  function ready() {
    return isReady
  }

  /**
   * Set editor language
   */
  function setLanguage(lang) {
    if (!editor) return
    const model = editor.getModel()
    if (model) {
      monaco.editor.setModelLanguage(model, lang)
    }
  }

  return {
    init,
    getValue,
    setValue,
    onDidChange,
    formatDocument,
    focus,
    layout,
    ready,
    setLanguage
  }
})()
