/**
 * @lytjs/ui - RichTextEditor 组件
 *
 * 轻量级富文本编辑器，使用原生 API 实现，零第三方依赖
 */

import { defineComponent, type PropType } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString } from '@lytjs/common-is';
import { signal } from '@lytjs/reactivity';

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
    placeholder: { type: String, default: '请输入内容' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    class: { type: String, default: '' },
    style: { type: [String, Object] as unknown as PropType<string | Record<string, string>>, default: '' },
    onChange: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots, emit }) {
    const _props = props as {
      modelValue?: string;
      placeholder?: string;
      disabled?: boolean;
      readonly?: boolean;
      class?: string;
      style?: string | Record<string, string>;
      onChange?: (value: string) => void;
    };

    const isFocused = signal(false);
    const editorRef = { current: null as HTMLElement | null };

    const execCommand = (command: FormatCommand) => {
      if (_props.disabled || _props.readonly) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      document.execCommand(command, false);
      handleInput();
    };

    const handleInput = () => {
      if (_props.disabled || _props.readonly) return;
      const content = editorRef.current?.innerHTML || '';
      emit('update:modelValue', content);
      _props.onChange?.(content);
    };

    const getEditorClass = () => {
      const classes = ['lyt-rich-text-editor'];
      if (isFocused()) classes.push('is-focused');
      if (_props.disabled) classes.push('is-disabled');
      if (_props.readonly) classes.push('is-readonly');
      if (_props.class) classes.push(_props.class);
      return classes.join(' ');
    };

    const toolbarItems: { command: FormatCommand; icon: string; title: string }[] = [
      { command: 'bold', icon: 'B', title: '粗体' },
      { command: 'italic', icon: 'I', title: '斜体' },
      { command: 'underline', icon: 'U', title: '下划线' },
      { command: 'strikeThrough', icon: 'S', title: '删除线' },
      { command: 'justifyLeft', icon: '◢', title: '左对齐' },
      { command: 'justifyCenter', icon: '◤', title: '居中' },
      { command: 'justifyRight', icon: '◣', title: '右对齐' },
      { command: 'insertUnorderedList', icon: '•', title: '无序列表' },
      { command: 'insertOrderedList', icon: '1.', title: '有序列表' },
      { command: 'indent', icon: '→|', title: '缩进' },
      { command: 'outdent', icon: '|←', title: '取消缩进' },
      { command: 'removeFormat', icon: '×', title: '清除格式' },
    ];

    return () => {
      const children: VNode[] = [];

      const toolbarChildren: VNode[] = toolbarItems.map(item => {
        const btn = createVNode('button', {
          type: 'button',
          class: 'lyt-rich-text-editor__toolbar-btn',
          title: item.title,
          disabled: _props.disabled || _props.readonly,
          onClick: () => execCommand(item.command),
        }, [createVNode('span', {}, item.icon)]);
        return btn;
      });

      children.push(createVNode('div', { class: 'lyt-rich-text-editor__toolbar' }, toolbarChildren));

      const editorContent = _props.modelValue || '';
      children.push(createVNode('div', {
        ref: editorRef,
        class: 'lyt-rich-text-editor__content',
        contentEditable: !_props.disabled && !_props.readonly,
        'data-placeholder': _props.placeholder,
        onInput: handleInput,
        onFocus: () => isFocused.set(true),
        onBlur: () => isFocused.set(false),
        innerHTML: editorContent,
      }));

      if (slots.footer) {
        const footerContent = slots.footer();
        children.push(createVNode('div', { class: 'lyt-rich-text-editor__footer' }, footerContent as VNode[]));
      }

      const editorStyle: Record<string, string> = {};
      if (_props.style) {
        if (isString(_props.style)) {
          Object.assign(editorStyle, { cssText: _props.style });
        } else {
          Object.assign(editorStyle, _props.style);
        }
      }

      return createVNode('div', {
        class: getEditorClass(),
        style: editorStyle,
      }, children);
    };
  },
});
