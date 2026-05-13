/**
 * @lytjs/ui 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { Dialog } from '../src/components/Dialog';

// ===== Button 组件测试 =====
describe('Button', () => {
  it('should render button with default props', () => {
    expect(Button).toBeDefined();
    expect(Button.name).toBe('LytButton');
  });

  it('should have correct props definition', () => {
    const props = Button.props;
    expect(props.type).toBeDefined();
    expect(props.size).toBeDefined();
    expect(props.disabled).toBeDefined();
    expect(props.loading).toBeDefined();
    expect(props.plain).toBeDefined();
    expect(props.round).toBeDefined();
    expect(props.circle).toBeDefined();
    expect(props.nativeType).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Button.props;
    expect(props.type.default).toBe('default');
    expect(props.size.default).toBe('medium');
    expect(props.disabled.default).toBe(false);
    expect(props.loading.default).toBe(false);
    expect(props.plain.default).toBe(false);
    expect(props.round.default).toBe(false);
    expect(props.circle.default).toBe(false);
    expect(props.nativeType.default).toBe('button');
  });
});

// ===== Input 组件测试 =====
describe('Input', () => {
  it('should render input with default props', () => {
    expect(Input).toBeDefined();
    expect(Input.name).toBe('LytInput');
  });

  it('should have correct props definition', () => {
    const props = Input.props;
    expect(props.modelValue).toBeDefined();
    expect(props.type).toBeDefined();
    expect(props.placeholder).toBeDefined();
    expect(props.disabled).toBeDefined();
    expect(props.readonly).toBeDefined();
    expect(props.clearable).toBeDefined();
    expect(props.showPassword).toBeDefined();
    expect(props.size).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Input.props;
    expect(props.modelValue.default).toBe('');
    expect(props.type.default).toBe('text');
    expect(props.placeholder.default).toBe('');
    expect(props.disabled.default).toBe(false);
    expect(props.readonly.default).toBe(false);
    expect(props.clearable.default).toBe(false);
    expect(props.showPassword.default).toBe(false);
    expect(props.size.default).toBe('medium');
  });
});

// ===== Dialog 组件测试 =====
describe('Dialog', () => {
  it('should render dialog with default props', () => {
    expect(Dialog).toBeDefined();
    expect(Dialog.name).toBe('LytDialog');
  });

  it('should have correct props definition', () => {
    const props = Dialog.props;
    expect(props.modelValue).toBeDefined();
    expect(props.title).toBeDefined();
    expect(props.width).toBeDefined();
    expect(props.showClose).toBeDefined();
    expect(props.closeOnClickModal).toBeDefined();
    expect(props.closeOnPressEscape).toBeDefined();
    expect(props.lockScroll).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Dialog.props;
    expect(props.modelValue.default).toBe(false);
    expect(props.title.default).toBe('');
    expect(props.width.default).toBe('50%');
    expect(props.showClose.default).toBe(true);
    expect(props.closeOnClickModal.default).toBe(true);
    expect(props.closeOnPressEscape.default).toBe(true);
    expect(props.lockScroll.default).toBe(true);
  });
});

// ===== 导出测试 =====
describe('exports', () => {
  it('should export all components', () => {
    expect(Button).toBeDefined();
    expect(Input).toBeDefined();
    expect(Dialog).toBeDefined();
  });
});
