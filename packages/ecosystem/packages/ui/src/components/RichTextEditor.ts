/**
 * @lytjs/ui - RichTextEditor 组件
 *
 * 轻量级富文本编辑器，使用原生 API 实现，零第三方依赖
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import type { RichTextEditorSetupProps, RichTextEditorSlots } from '../types';

/** 格式化命令 */
type FormatCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikeThrough'
  | 'justifyLeft'
  | 'justifyCenter'
  | 'justifyRight'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'indent'
  | 'outdent'
  | 'removeFormat';

export const RichTextEditor = defineComponent({
  name: 'LytRichTextEditor',

  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '请输入内容...' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    height: { type: String, default: '300px' },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onInput: { type: Function, default: undefined },
    onFocus: { type: Function, default: undefined },
    onBlur: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: RichTextEditorSlots }) {
    const p = props as RichTextEditorSetupProps;
    let editorElement: HTMLElement | null = null;

    /** 执行格式化命令 */
    const execCommand = (command: FormatCommand, value?: string) => {
      if (!editorElement || p.disabled || p.readonly) return;
      editorElement.focus();
      document.execCommand(command, false, value);
      syncValue();
    };

    /** 同步值 */
    const syncValue = () => {
      if (editorElement) {
        const value = editorElement.innerHTML;
        p.onInput?.(value);
      }
    };

    /** 初始化编辑器 */
    const initEditor = (element: HTMLElement) => {
      editorElement = element;
      if (editorElement) {
        editorElement.innerHTML = p.modelValue;
        editorElement.contentEditable = String(!p.disabled && !p.readonly);
      }
    };

    /** 处理输入 */
    const handleInput = () => {
      syncValue();
    };

    /** 处理焦点 */
    const handleFocus = (event: FocusEvent) => {
      p.onFocus?.(event);
    };

    /** 处理失焦 */
    const handleBlur = (event: FocusEvent) => {
      p.onBlur?.(event);
    };

    /** 获取按钮类名 */
    const getButtonClass = (isActive: boolean) => {
      return `lyt-rich-text-editor__toolbar-btn ${isActive ? 'lyt-rich-text-editor__toolbar-btn--active' : ''}`;
    };

    /** 创建工具栏按钮 */
    const createToolbarButton = (
      command: FormatCommand,
      icon: string,
      title: string,
    ) => {
      return createVNode(
        'button',
        {
          class: getButtonClass(false),
          type: 'button',
          title,
          disabled: p.disabled || p.readonly,
          onClick: () => execCommand(command),
        },
        [icon],
      );
    };

    return () => {
      const toolbarButtons = [
        createToolbarButton('bold', 'B', '粗体'),
        createToolbarButton('italic', 'I', '斜体'),
        createToolbarButton('underline', 'U', '下划线'),
        createToolbarButton('strikeThrough', 'S', '删除线'),
        createVNode('span', { class: 'lyt-rich-text-editor__toolbar-divider' }, []),
        createToolbarButton('justifyLeft', '↩', '左对齐'),
        createToolbarButton('justifyCenter', '↔', '居中对齐'),
        createToolbarButton('justifyRight', '↪', '右对齐'),
        createVNode('span', { class: 'lyt-rich-text-editor__toolbar-divider' }, []),
        createToolbarButton('insertUnorderedList', '•', '无序列表'),
        createToolbarButton('insertOrderedList', '1.', '有序列表'),
        createToolbarButton('indent', '→', '缩进'),
        createToolbarButton('outdent', '←', '减少缩进'),
        createVNode('span', { class: 'lyt-rich-text-editor__toolbar-divider' }, []),
        createToolbarButton('removeFormat', '✕', '清除格式'),
      ];

      const editorStyle = {
        height: p.height,
        ...(isString(p.style) ? {} : p.style),
      };

      return createVNode(
        'div',
        {
          class: `lyt-rich-text-editor ${p.class} ${p.disabled ? 'lyt-rich-text-editor--disabled' : ''} ${p.readonly ? 'lyt-rich-text-editor--readonly' : ''}`,
          style: isString(p.style) ? p.style : undefined,
        },
        [
          // 工具栏
          createVNode(
            'div',
            { class: 'lyt-rich-text-editor__toolbar' },
            slots.toolbar ? slots.toolbar() : toolbarButtons,
          ),
          // 编辑区域
          createVNode('div', {
            class: 'lyt-rich-text-editor__content',
            ref: initEditor,
            contenteditable: !p.disabled && !p.readonly,
            'data-placeholder': p.placeholder,
            style: editorStyle,
            onInput: handleInput,
            onFocus: handleFocus,
            onBlur: handleBlur,
          }),
        ],
      );
    };
  },
});

export type { RichTextEditorProps, RichTextEditorSlots, RichTextEditorSetupProps } from '../types';
