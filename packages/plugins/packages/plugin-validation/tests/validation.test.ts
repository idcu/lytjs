import { describe, it, expect, vi } from 'vitest';
import { createValidationInstance } from '../src';

describe('@lytjs/plugin-validation', () => {
  describe('createValidationInstance', () => {
    it('should create a validation instance', () => {
      const validation = createValidationInstance();
      expect(validation).toBeDefined();
      expect(validation.validate).toBeDefined();
      expect(validation.validateField).toBeDefined();
      expect(validation.setMessages).toBeDefined();
      expect(validation.addRule).toBeDefined();
    });

    it('should validate required fields', async () => {
      const validation = createValidationInstance();
      const result = await validation.validateField('username', '', [{ type: 'required' }]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const validResult = await validation.validateField('username', 'testuser', [
        { type: 'required' },
      ]);
      expect(validResult.valid).toBe(true);
    });

    it('should validate email fields', async () => {
      const validation = createValidationInstance();

      const invalidResult = await validation.validateField('email', 'invalid-email', [
        { type: 'email' },
      ]);
      expect(invalidResult.valid).toBe(false);

      const validResult = await validation.validateField('email', 'test@example.com', [
        { type: 'email' },
      ]);
      expect(validResult.valid).toBe(true);
    });

    it('should validate phone fields', async () => {
      const validation = createValidationInstance();

      const invalidResult = await validation.validateField('phone', '12345', [{ type: 'phone' }]);
      expect(invalidResult.valid).toBe(false);

      const validResult = await validation.validateField('phone', '13812345678', [
        { type: 'phone' },
      ]);
      expect(validResult.valid).toBe(true);
    });

    it('should validate number fields', async () => {
      const validation = createValidationInstance();

      const invalidResult = await validation.validateField('age', 'not-a-number', [
        { type: 'number' },
      ]);
      expect(invalidResult.valid).toBe(false);

      const validResult = await validation.validateField('age', '30', [{ type: 'number' }]);
      expect(validResult.valid).toBe(true);
    });

    it('should validate min and max values', async () => {
      const validation = createValidationInstance();

      const tooSmall = await validation.validateField('age', '10', [{ type: 'min', value: 18 }]);
      expect(tooSmall.valid).toBe(false);

      const tooBig = await validation.validateField('age', '110', [{ type: 'max', value: 100 }]);
      expect(tooBig.valid).toBe(false);

      const valid = await validation.validateField('age', '30', [
        { type: 'min', value: 18 },
        { type: 'max', value: 100 },
      ]);
      expect(valid.valid).toBe(true);
    });

    it('should validate string lengths', async () => {
      const validation = createValidationInstance();

      const tooShort = await validation.validateField('password', '123', [
        { type: 'minLength', value: 6 },
      ]);
      expect(tooShort.valid).toBe(false);

      const tooLong = await validation.validateField('password', '123456789012345678901', [
        { type: 'maxLength', value: 20 },
      ]);
      expect(tooLong.valid).toBe(false);

      const validLength = await validation.validateField('password', '123456', [
        { type: 'minLength', value: 6 },
        { type: 'maxLength', value: 20 },
      ]);
      expect(validLength.valid).toBe(true);

      const exactLength = await validation.validateField('code', '1234', [
        { type: 'length', value: 4 },
      ]);
      expect(exactLength.valid).toBe(true);
    });

    it('should validate with custom regex pattern', async () => {
      const validation = createValidationInstance();

      const invalidResult = await validation.validateField('code', 'abc123', [
        { type: 'pattern', value: /^\d+$/ },
      ]);
      expect(invalidResult.valid).toBe(false);

      const validResult = await validation.validateField('code', '123456', [
        { type: 'pattern', value: /^\d+$/ },
      ]);
      expect(validResult.valid).toBe(true);
    });

    it('should validate URL', async () => {
      const validation = createValidationInstance();

      const invalidResult = await validation.validateField('website', 'not-a-url', [
        { type: 'url' },
      ]);
      expect(invalidResult.valid).toBe(false);

      const validResult = await validation.validateField('website', 'https://example.com', [
        { type: 'url' },
      ]);
      expect(validResult.valid).toBe(true);
    });

    it('should validate UUID', async () => {
      const validation = createValidationInstance();

      const invalidResult = await validation.validateField('id', 'not-a-uuid', [{ type: 'uuid' }]);
      expect(invalidResult.valid).toBe(false);

      const validResult = await validation.validateField(
        'id',
        '550e8400-e29b-41d4-a716-446655440000',
        [{ type: 'uuid' }],
      );
      expect(validResult.valid).toBe(true);
    });

    it('should validate date', async () => {
      const validation = createValidationInstance();

      const invalidResult = await validation.validateField('date', 'not-a-date', [
        { type: 'date' },
      ]);
      expect(invalidResult.valid).toBe(false);

      const validResult = await validation.validateField('date', '2024-01-01', [{ type: 'date' }]);
      expect(validResult.valid).toBe(true);
    });

    it('should validate with custom validator', async () => {
      const validator = vi.fn((value: unknown) => {
        return String(value).includes('test');
      });

      const validation = createValidationInstance();
      const invalidResult = await validation.validateField('name', 'abc', [
        { type: 'custom', validator },
      ]);
      expect(invalidResult.valid).toBe(false);
      expect(validator).toHaveBeenCalled();

      const validResult = await validation.validateField('name', 'testuser', [
        { type: 'custom', validator },
      ]);
      expect(validResult.valid).toBe(true);
    });

    it('should validate entire schema', async () => {
      const validation = createValidationInstance();

      const schema = {
        username: {
          rules: [{ type: 'required' }],
          label: '用户名',
        },
        email: {
          rules: [{ type: 'required' }, { type: 'email' }],
        },
      };

      const invalidResult = await validation.validate(schema, {
        username: '',
        email: 'invalid',
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);

      const validResult = await validation.validate(schema, {
        username: 'testuser',
        email: 'test@example.com',
      });
      expect(validResult.valid).toBe(true);
      expect(validResult.errors.length).toBe(0);
    });

    it('should set custom messages', async () => {
      const validation = createValidationInstance();
      validation.setMessages({
        required: '必填项哦！',
      });

      const result = await validation.validateField('username', '', [{ type: 'required' }]);
      expect(result.errors[0]).toBe('必填项哦！');
    });

    it('should add custom validation rules', async () => {
      const validation = createValidationInstance();
      validation.addRule(
        'containsLyt',
        (value: unknown) => String(value).includes('lyt'),
        '必须包含 lyt',
      );

      const invalidResult = await validation.validateField('name', 'test', [
        { type: 'containsLyt' as any },
      ]);
      expect(invalidResult.valid).toBe(false);

      const validResult = await validation.validateField('name', 'lytjs', [
        { type: 'containsLyt' as any },
      ]);
      expect(validResult.valid).toBe(true);
    });

    it('should stop on first error when configured', async () => {
      const validation = createValidationInstance({ stopOnFirstError: true });

      const result = await validation.validateField('password', '123', [
        { type: 'required' },
        { type: 'minLength', value: 6 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
    });

    it('should handle async custom validators', async () => {
      const asyncValidator = vi.fn(async (value: unknown) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return String(value).length > 3;
      });

      const validation = createValidationInstance();
      const invalidResult = await validation.validateField('name', 'abc', [
        { type: 'custom', validator: asyncValidator },
      ]);
      expect(invalidResult.valid).toBe(false);
      expect(asyncValidator).toHaveBeenCalled();

      const validResult = await validation.validateField('name', 'abcd', [
        { type: 'custom', validator: asyncValidator },
      ]);
      expect(validResult.valid).toBe(true);
    });

    it('should use custom error messages from rules', async () => {
      const validation = createValidationInstance();
      const result = await validation.validateField('username', '', [
        { type: 'required', message: '请输入用户名' },
      ]);
      expect(result.errors[0]).toBe('请输入用户名');
    });

    it('should validate with multiple rules', async () => {
      const validation = createValidationInstance();

      // 让我们禁用 stopOnFirstError 来测试多个错误
      const validationWithMultipleErrors = createValidationInstance({ stopOnFirstError: false });

      // 创建一个自定义验证器，对于相同的值总是失败
      validationWithMultipleErrors.addRule('alwaysFail1', () => false, '错误1');
      validationWithMultipleErrors.addRule('alwaysFail2', () => false, '错误2');

      const result = await validationWithMultipleErrors.validateField('test', 'some value', [
        { type: 'required' }, // 通过
        { type: 'alwaysFail1' as any }, // 失败
        { type: 'alwaysFail2' as any }, // 失败
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });
});
