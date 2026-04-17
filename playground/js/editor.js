/**
 * Lyt.js Playground - 代码编辑器逻辑
 */

;(function () {
  'use strict';

  const STORAGE_KEY = 'lyt-playground-code';
  const EXAMPLE_KEY = 'lyt-playground-example';

  /**
   * 编辑器类
   */
  class CodeEditor {
    constructor(options) {
      this.textarea = options.textarea;
      this.lineNumbers = options.lineNumbers;
      this.onRun = options.onRun || function () {};
      this.onChange = options.onChange || function () {};
      this._debounceTimer = null;
      this._debounceDelay = options.debounceDelay || 500;

      this._init();
    }

    _init() {
      // 加载保存的代码
      const savedCode = localStorage.getItem(STORAGE_KEY);
      if (savedCode) {
        this.setValue(savedCode);
      }

      // 绑定事件
      this.textarea.addEventListener('input', () => this._onInput());
      this.textarea.addEventListener('scroll', () => this._syncScroll());
      this.textarea.addEventListener('keydown', (e) => this._onKeyDown(e));
      this.textarea.addEventListener('paste', (e) => this._onPaste(e));

      // 初始化行号
      this._updateLineNumbers();

      // Tab 键支持
      this.textarea.setAttribute('spellcheck', 'false');
      this.textarea.setAttribute('autocomplete', 'off');
      this.textarea.setAttribute('autocorrect', 'off');
      this.textarea.setAttribute('autocapitalize', 'off');
    }

    /**
     * 获取编辑器内容
     */
    getValue() {
      return this.textarea.value;
    }

    /**
     * 设置编辑器内容
     */
    setValue(code) {
      this.textarea.value = code;
      this._updateLineNumbers();
    }

    /**
     * 获取光标位置
     */
    getCursorPosition() {
      return this.textarea.selectionStart;
    }

    /**
     * 设置光标位置
     */
    setCursorPosition(pos) {
      this.textarea.selectionStart = pos;
      this.textarea.selectionEnd = pos;
      this.textarea.focus();
    }

    /**
     * 输入事件处理
     */
    _onInput() {
      this._updateLineNumbers();
      this._autoSave();

      // 防抖触发 onChange
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this.onChange(this.getValue());
      }, this._debounceDelay);
    }

    /**
     * 键盘事件处理
     */
    _onKeyDown(e) {
      // Tab 键插入 2 个空格
      if (e.key === 'Tab') {
        e.preventDefault();
        this._insertText('  ');
        return;
      }

      // Ctrl+Enter 运行代码
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.onRun();
        return;
      }

      // Ctrl+S 保存（阻止默认行为）
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this._autoSave();
        return;
      }

      // Enter 键自动缩进
      if (e.key === 'Enter') {
        e.preventDefault();
        this._handleEnter();
        return;
      }

      // 自动补全括号
      if (this._isAutoCompleteChar(e.key)) {
        e.preventDefault();
        this._autoComplete(e.key);
        return;
      }
    }

    /**
     * 粘贴事件处理
     */
    _onPaste(e) {
      // 允许默认粘贴行为，但之后更新行号
      setTimeout(() => {
        this._updateLineNumbers();
        this._autoSave();
      }, 0);
    }

    /**
     * 处理 Enter 键自动缩进
     */
    _handleEnter() {
      const pos = this.textarea.selectionStart;
      const val = this.textarea.value;
      const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
      const currentLine = val.substring(lineStart, pos);

      // 计算当前行的缩进
      const indent = currentLine.match(/^\s*/)[0];

      // 如果行尾是 { 或 ( 或 [，增加缩进
      const lastChar = val[pos - 1];
      const extraIndent = (lastChar === '{' || lastChar === '(' || lastChar === '[') ? '  ' : '';

      // 检查下一个字符是否是 } 或 ) 或 ]
      const nextChar = val[pos];
      const closingBracket = (nextChar === '}' || nextChar === ')' || nextChar === ']');

      let insertion = '\n' + indent + extraIndent;
      if (closingBracket) {
        insertion += '\n' + indent;
      }

      this._insertText(insertion);

      // 如果有闭合括号，将光标放在中间
      if (closingBracket) {
        const newPos = pos + '\n'.length + indent.length + extraIndent.length;
        this.setCursorPosition(newPos);
      }
    }

    /**
     * 自动补全括号
     */
    _autoComplete(char) {
      const pairs = {
        '{': '}',
        '(': ')',
        '[': ']',
        "'": "'",
        '"': '"',
        '`': '`',
      };

      const closing = pairs[char];
      if (!closing) return;

      const pos = this.textarea.selectionStart;
      const val = this.textarea.value;

      // 如果下一个字符已经是闭合字符，只插入开始字符
      if (val[pos] === closing) {
        this._insertText(char);
        return;
      }

      this._insertText(char + closing);
      this.setCursorPosition(pos + 1);
    }

    /**
     * 判断是否是自动补全字符
     */
    _isAutoCompleteChar(key) {
      return ['{', '(', '[', "'", '"', '`'].indexOf(key) !== -1;
    }

    /**
     * 在光标位置插入文本
     */
    _insertText(text) {
      const pos = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const val = this.textarea.value;

      this.textarea.value = val.substring(0, pos) + text + val.substring(end);
      this.setCursorPosition(pos + text.length);
      this._updateLineNumbers();
      this._autoSave();
    }

    /**
     * 更新行号显示
     */
    _updateLineNumbers() {
      const lines = this.textarea.value.split('\n');
      const count = lines.length;
      const fragment = document.createDocumentFragment();

      for (let i = 1; i <= count; i++) {
        const lineEl = document.createElement('div');
        lineEl.className = 'line-number';
        lineEl.textContent = i;
        fragment.appendChild(lineEl);
      }

      this.lineNumbers.innerHTML = '';
      this.lineNumbers.appendChild(fragment);
    }

    /**
     * 同步滚动
     */
    _syncScroll() {
      this.lineNumbers.scrollTop = this.textarea.scrollTop;
    }

    /**
     * 自动保存到 localStorage
     */
    _autoSave() {
      try {
        localStorage.setItem(STORAGE_KEY, this.textarea.value);
      } catch (e) {
        // localStorage 可能不可用
      }
    }

    /**
     * 加载示例
     */
    loadExample(exampleId) {
      const example = EXAMPLES.find(ex => ex.id === exampleId);
      if (example) {
        this.setValue(example.code);
        this._autoSave();
        try {
          localStorage.setItem(EXAMPLE_KEY, exampleId);
        } catch (e) {}
      }
    }

    /**
     * 获取上次选择的示例 ID
     */
    static getLastExampleId() {
      try {
        return localStorage.getItem(EXAMPLE_KEY);
      } catch (e) {
        return null;
      }
    }

    /**
     * 清除保存的代码
     */
    static clearSaved() {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(EXAMPLE_KEY);
      } catch (e) {}
    }
  }

  // 暴露到全局
  window.CodeEditor = CodeEditor;
})();
