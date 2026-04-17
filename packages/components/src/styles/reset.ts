/**
 * 样式重置 CSS 字符串导出
 */

export const resetCSS = `/* Lyt.js Component Reset */
.lyt-btn,
.lyt-input,
.lyt-input-wrapper,
.lyt-select,
.lyt-checkbox,
.lyt-radio,
.lyt-switch,
.lyt-modal,
.lyt-modal__mask,
.lyt-modal__dialog,
.lyt-toast,
.lyt-toast-container,
.lyt-alert,
.lyt-tooltip,
.lyt-tooltip__popper,
.lyt-tabs,
.lyt-breadcrumb,
.lyt-pagination,
.lyt-table,
.lyt-table-wrapper,
.lyt-tag,
.lyt-badge,
.lyt-spin,
.lyt-empty,
.lyt-divider,
.lyt-link,
.lyt-container,
.lyt-icon {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.lyt-btn,
.lyt-input,
.lyt-select,
.lyt-checkbox,
.lyt-radio,
.lyt-switch,
.lyt-tabs__item,
.lyt-pagination__item,
.lyt-tag__close,
.lyt-alert__close,
.lyt-modal__close,
.lyt-tooltip__trigger {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.lyt-btn,
.lyt-input,
.lyt-select,
.lyt-checkbox,
.lyt-radio,
.lyt-switch,
.lyt-tabs__item,
.lyt-pagination__item,
.lyt-tag,
.lyt-link,
.lyt-alert__close,
.lyt-modal__close {
  outline: none;
}

.lyt-btn,
.lyt-input,
.lyt-select,
.lyt-checkbox,
.lyt-radio,
.lyt-switch,
.lyt-tabs__item,
.lyt-pagination__item,
.lyt-tag,
.lyt-link {
  -webkit-tap-highlight-color: transparent;
}

.lyt-btn::after,
.lyt-tabs__item::after,
.lyt-pagination__item::after {
  content: none;
}

.lyt-input::-webkit-outer-spin-button,
.lyt-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.lyt-input[type="number"] {
  -moz-appearance: textfield;
}

.lyt-select__list {
  scrollbar-width: thin;
  scrollbar-color: #c0c4cc transparent;
}

.lyt-select__list::-webkit-scrollbar {
  width: 6px;
}

.lyt-select__list::-webkit-scrollbar-thumb {
  background-color: #c0c4cc;
  border-radius: 3px;
}

.lyt-select__list::-webkit-scrollbar-track {
  background-color: transparent;
}

.lyt-modal__body::-webkit-scrollbar {
  width: 6px;
}

.lyt-modal__body::-webkit-scrollbar-thumb {
  background-color: #c0c4cc;
  border-radius: 3px;
}

.lyt-modal__body::-webkit-scrollbar-track {
  background-color: transparent;
}

*, *::before, *::after {
  box-sizing: border-box;
}
`

/**
 * 将 reset CSS 注入到 document head
 */
export function injectResetCSS(): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent = resetCSS
  document.head.appendChild(style)
  return style
}
