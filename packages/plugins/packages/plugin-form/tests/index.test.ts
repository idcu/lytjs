import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFormManager } from '../src';

describe('@lytjs/plugin-form', () => {
  describe('createFormManager', () => {
    it('should create a form manager instance', () => {
      const form = createFormManager();
      expect(form).toBeDefined();
      expect(form.getValue).toBeDefined();
      expect(form.setValue).toBeDefined();
      expect(form.getValues).toBeDefined();
      expect(form.submit).toBeDefined();
    });

    it('should initialize with initial values', () => {
      const form = createFormManager({
        initialValues: {
          username: 'test',
          email: 'test@example.com',
        },
      });

      form.registerField('username');
      form.registerField('email');

      expect(form.getValue('username')).toBe('test');
      expect(form.getValue('email')).toBe('test@example.com');
    });

    it('should get and set field values', () => {
      const form = createFormManager({
        initialValues: {
          count: 0,
        },
      });

      form.registerField('count');

      expect(form.getValue('count')).toBe(0);

      form.setValue('count', 5);
      expect(form.getValue('count')).toBe(5);
    });

    it('should get and set multiple values', () => {
      const form = createFormManager();

      form.registerField('name');
      form.registerField('age');

      form.setValues({
        name: 'Alice',
        age: 30,
      });

      expect(form.getValues()).toEqual({
        name: 'Alice',
        age: 30,
      });
    });

    it('should validate required fields', async () => {
      const form = createFormManager({
        fields: {
          username: {
            rules: [{ type: 'required' }],
          },
        },
      });

      expect(await form.validateField('username')).toBe(false);

      form.setValue('username', 'testuser');
      expect(await form.validateField('username')).toBe(true);
    });

    it('should validate email fields', async () => {
      const form = createFormManager({
        fields: {
          email: {
            rules: [{ type: 'email' }],
          },
        },
      });

      form.setValue('email', 'invalid-email');
      expect(await form.validateField('email')).toBe(false);

      form.setValue('email', 'test@example.com');
      expect(await form.validateField('email')).toBe(true);
    });

    it('should validate phone fields', async () => {
      const form = createFormManager({
        fields: {
          phone: {
            rules: [{ type: 'phone' }],
          },
        },
      });

      form.setValue('phone', '12345');
      expect(await form.validateField('phone')).toBe(false);

      form.setValue('phone', '13812345678');
      expect(await form.validateField('phone')).toBe(true);
    });

    it('should validate min and max', async () => {
      const form = createFormManager({
        fields: {
          age: {
            rules: [
              { type: 'min', value: 18 },
              { type: 'max', value: 100 },
            ],
          },
        },
      });

      form.setValue('age', 10);
      expect(await form.validateField('age')).toBe(false);

      form.setValue('age', 110);
      expect(await form.validateField('age')).toBe(false);

      form.setValue('age', 30);
      expect(await form.validateField('age')).toBe(true);
    });

    it('should validate minLength and maxLength', async () => {
      const form = createFormManager({
        fields: {
          password: {
            rules: [
              { type: 'minLength', value: 6 },
              { type: 'maxLength', value: 20 },
            ],
          },
        },
      });

      form.setValue('password', '123');
      expect(await form.validateField('password')).toBe(false);

      form.setValue('password', '123456789012345678901');
      expect(await form.validateField('password')).toBe(false);

      form.setValue('password', '123456');
      expect(await form.validateField('password')).toBe(true);
    });

    it('should validate with custom validator', async () => {
      const validator = vi.fn((value: unknown) => {
        return String(value).includes('test');
      });

      const form = createFormManager({
        fields: {
          name: {
            rules: [
              {
                type: 'custom',
                validator,
              },
            ],
          },
        },
      });

      form.setValue('name', 'abc');
      expect(await form.validateField('name')).toBe(false);
      expect(validator).toHaveBeenCalled();

      form.setValue('name', 'testuser');
      expect(await form.validateField('name')).toBe(true);
    });

    it('should validate entire form', async () => {
      const form = createFormManager({
        fields: {
          username: {
            rules: [{ type: 'required' }],
            initialValue: 'testuser',
          },
          email: {
            rules: [{ type: 'required' }, { type: 'email' }],
          },
        },
      });

      expect(await form.validate()).toBe(false);

      form.setValue('email', 'test@example.com');
      expect(await form.validate()).toBe(true);
    });

    it('should submit form and call callback', async () => {
      const callback = vi.fn();

      const form = createFormManager({
        fields: {
          username: {
            initialValue: 'testuser',
          },
        },
        validateOnSubmit: false,
      });

      await form.submit(callback);

      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        username: 'testuser',
      }));
    });

    it('should reset form', () => {
      const form = createFormManager({
        fields: {
          username: {
            initialValue: 'test',
          },
        },
      });

      form.setValue('username', 'changed');
      form.touchField('username');
      form.setErrors('username', ['some error']);

      form.reset();

      expect(form.state.fields.username.errors).toEqual([]);
      expect(form.state.fields.username.touched).toBe(false);
    });

    it('should reset form to initial values', () => {
      const form = createFormManager({
        fields: {
          username: {
            initialValue: 'test',
          },
        },
      });

      form.setValue('username', 'changed');

      form.resetToInitial();

      expect(form.getValue('username')).toBe('test');
    });

    it('should set field disabled state', () => {
      const form = createFormManager({
        fields: {
          username: {},
        },
      });

      expect(form.state.fields.username.disabled).toBe(false);

      form.setFieldDisabled('username', true);
      expect(form.state.fields.username.disabled).toBe(true);
    });

    it('should set field readonly state', () => {
      const form = createFormManager({
        fields: {
          username: {},
        },
      });

      expect(form.state.fields.username.readOnly).toBe(false);

      form.setFieldReadOnly('username', true);
      expect(form.state.fields.username.readOnly).toBe(true);
    });

    it('should register and unregister fields', () => {
      const form = createFormManager();

      expect(form.getFieldConfig('test')).toBeUndefined();

      form.registerField('test');
      expect(form.getFieldConfig('test')).toBeDefined();

      form.unregisterField('test');
      expect(form.getFieldConfig('test')).toBeUndefined();
    });
  });
});
