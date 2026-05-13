/**
 * @lytjs/ui - Form 组件
 *
 * 表单组件，支持表单验证和布局
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * Form 组件
 */
export const Form = defineComponent({
  name: 'LytForm',

  props: {
    model: { type: Object, default: () => ({}) },
    rules: { type: Object, default: () => ({}) },
    labelWidth: { type: String, default: '100px' },
    labelPosition: { type: String, default: 'right' },
    class: { type: String, default: '' },
    onSubmit: { type: Function, default: undefined },
  },

  setup(props: any, { slots }: any) {
    const errors = signal<Record<string, string>>({});

    // 验证单个字段
    const validateField = (field: string): boolean => {
      const rules = props.rules[field];
      if (!rules || rules.length === 0) return true;

      const value = props.model[field];
      
      for (const rule of rules) {
        if (rule.required && (!value || value === '')) {
          errors.set({ ...errors(), [field]: rule.message || '此字段必填' });
          return false;
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.set({ ...errors(), [field]: rule.message || '格式不正确' });
          return false;
        }
        if (rule.validator) {
          const result = rule.validator(value, props.model);
          if (result !== true) {
            errors.set({ ...errors(), [field]: result || '验证失败' });
            return false;
          }
        }
      }

      // 清除错误
      const newErrors = { ...errors() };
      delete newErrors[field];
      errors.set(newErrors);
      return true;
    };

    // 验证所有字段
    const validate = (): boolean => {
      let isValid = true;
      for (const field of Object.keys(props.rules)) {
        if (!validateField(field)) {
          isValid = false;
        }
      }
      return isValid;
    };

    // 重置表单
    const resetFields = () => {
      errors.set({});
    };

    // 提交处理
    const handleSubmit = (e: Event) => {
      e.preventDefault();
      if (validate()) {
        props.onSubmit?.(props.model);
      }
    };

    // 暴露方法
    (this as any).validate = validate;
    (this as any).validateField = validateField;
    (this as any).resetFields = resetFields;

    // 生成类名
    const getFormClass = () => {
      const classes = ['lyt-form', `lyt-form--label-${props.labelPosition}`];
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    return () => {
      return createVNode('form', {
        class: getFormClass(),
        onSubmit: handleSubmit,
      }, slots.default?.());
    };
  },
});

/**
 * FormItem 组件
 */
export const FormItem = defineComponent({
  name: 'LytFormItem',

  props: {
    label: { type: String, default: '' },
    prop: { type: String, default: '' },
    required: { type: Boolean, default: false },
    class: { type: String, default: '' },
  },

  setup(props: any, { slots }: any) {
    return () => {
      const children: any[] = [];
      
      // 标签
      if (props.label) {
        children.push(
          createVNode('label', {
            class: `lyt-form-item__label ${props.required ? 'lyt-form-item__label--required' : ''}`,
          }, props.label)
        );
      }
      
      // 内容
      children.push(
        createVNode('div', { class: 'lyt-form-item__content' }, slots.default?.())
      );
      
      return createVNode('div', {
        class: `lyt-form-item ${props.class}`,
      }, children);
    };
  },
});

export default { Form, FormItem };
