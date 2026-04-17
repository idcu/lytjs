/**
 * Lyt.js Playground - 预览系统
 */

;(function () {
  'use strict';

  /**
   * 预览管理器
   */
  class PreviewManager {
    constructor(options) {
      this.iframe = options.iframe;
      this.consolePanel = options.consolePanel;
      this._consoleEntries = [];
      this._maxEntries = 200;
    }

    /**
     * 运行用户代码
     */
    run(code) {
      // 清除之前的控制台输出
      this.clearConsole();

      // 获取 Lyt 运行时代码
      const runtimeCode = this._getRuntimeCode();

      // 构建完整的 HTML 文档
      const html = this._buildHTML(code, runtimeCode);

      // 写入 iframe
      const doc = this.iframe.contentDocument || this.iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
    }

    /**
     * 获取运行时代码
     */
    _getRuntimeCode() {
      // 尝试从 script 标签获取（已加载的 lyt-runtime.js）
      const scripts = document.querySelectorAll('script[data-runtime]');
      if (scripts.length > 0) {
        return scripts[0].textContent;
      }

      // 如果找不到，返回一个简单的提示
      return `
        console.warn('[Lyt Playground] \u8FD0\u884C\u65F6\u672A\u52A0\u8F7D\uFF0C\u8BF7\u786E\u4FDD lyt-runtime.js \u5DF2\u6B63\u786E\u52A0\u8F7D');
      `;
    }

    /**
     * 构建完整的 HTML 文档
     */
    _buildHTML(userCode, runtimeCode) {
      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #ffffff;
      color: #333;
      padding: 0;
    }
  </style>
</head>
<body>
  <!-- Console Interceptor -->
  <script>
    (function() {
      var _origLog = console.log;
      var _origWarn = console.warn;
      var _origError = console.error;
      var _origInfo = console.info;
      var _origClear = console.clear;

      function _send(type, args) {
        try {
          var msg = Array.prototype.slice.call(args).map(function(a) {
            if (a === null) return 'null';
            if (a === undefined) return 'undefined';
            if (typeof a === 'object') {
              try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); }
            }
            return String(a);
          }).join(' ');

          window.parent.postMessage({
            type: 'lyt-console',
            level: type,
            message: msg,
            timestamp: Date.now()
          }, '*');
        } catch(e) {}
      }

      console.log = function() { _send('log', arguments); _origLog.apply(console, arguments); };
      console.warn = function() { _send('warn', arguments); _origWarn.apply(console, arguments); };
      console.error = function() { _send('error', arguments); _origError.apply(console, arguments); };
      console.info = function() { _send('info', arguments); _origInfo.apply(console, arguments); };
      console.clear = function() { _origClear.call(console); };

      window.onerror = function(msg, url, line, col, error) {
        _send('error', ['Error: ' + msg + ' (line ' + line + ')']);
        return true;
      };

      window.addEventListener('unhandledrejection', function(e) {
        _send('error', ['Unhandled Promise Rejection: ' + e.reason]);
      });
    })();
  <\/script>

  <!-- Lyt.js Runtime -->
  <script>
    ${runtimeCode}
  <\/script>

  <!-- User Code -->
  ${userCode}
</body>
</html>`;
    }

    /**
     * 处理来自 iframe 的消息
     */
    handleMessage(event) {
      if (event.data && event.data.type === 'lyt-console') {
        this._addConsoleEntry(event.data.level, event.data.message, event.data.timestamp);
      }
    }

    /**
     * 添加控制台条目
     */
    _addConsoleEntry(level, message, timestamp) {
      const entry = { level, message, timestamp };
      this._consoleEntries.push(entry);

      // 限制最大条目数
      if (this._consoleEntries.length > this._maxEntries) {
        this._consoleEntries.shift();
      }

      // 渲染到面板
      this._renderConsoleEntry(entry);
    }

    /**
     * 渲染控制台条目到面板
     */
    _renderConsoleEntry(entry) {
      const el = document.createElement('div');
      el.className = 'console-entry console-' + entry.level;

      const time = new Date(entry.timestamp);
      const timeStr = time.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const prefix = document.createElement('span');
      prefix.className = 'console-time';
      prefix.textContent = timeStr;

      const icon = document.createElement('span');
      icon.className = 'console-icon';
      const icons = {
        log: '\u25CB',
        info: '\u25CF',
        warn: '\u25B2',
        error: '\u25CF',
      };
      icon.textContent = icons[entry.level] || '\u25CB';

      const msg = document.createElement('span');
      msg.className = 'console-message';
      msg.textContent = entry.message;

      el.appendChild(prefix);
      el.appendChild(icon);
      el.appendChild(msg);

      this.consolePanel.appendChild(el);

      // 自动滚动到底部
      this.consolePanel.scrollTop = this.consolePanel.scrollHeight;
    }

    /**
     * 清除控制台
     */
    clearConsole() {
      this._consoleEntries = [];
      this.consolePanel.innerHTML = '';
    }

    /**
     * 获取控制台条目数
     */
    getConsoleEntryCount() {
      return this._consoleEntries.length;
    }
  }

  // 暴露到全局
  window.PreviewManager = PreviewManager;
})();
