/**
 * @lytjs/ui - 组件交互测试
 * 
 * 测试复杂组件的交互功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Table } from '../src/components/Table';
import { Tree } from '../src/components/Tree';
import { Form } from '../src/components/Form';
import { Button } from '../src/components/Button';

// ===== Table 组件交互测试 =====
describe('Table 组件交互', () => {
  const testData = [
    { id: 1, name: '张三', age: 25, city: '北京' },
    { id: 2, name: '李四', age: 30, city: '上海' },
    { id: 3, name: '王五', age: 28, city: '广州' },
  ];

  const testColumns = [
    { prop: 'name', label: '姓名', sortable: true },
    { prop: 'age', label: '年龄', sortable: true },
    { prop: 'city', label: '城市' },
  ];

  it('应该正确初始化', () => {
    expect(Table).toBeDefined();
    expect(Table.name).toBe('LytTable');
  });

  it('应该定义必要的 props', () => {
    const props = Table.props;
    expect(props.data).toBeDefined();
    expect(props.columns).toBeDefined();
    expect(props.showSelection).toBeDefined();
    expect(props.stripe).toBeDefined();
    expect(props.border).toBeDefined();
  });

  it('应该有正确的默认值', () => {
    const props = Table.props;
    expect(props.showSelection.default).toBe(false);
    expect(props.stripe.default).toBe(false);
    expect(props.border.default).toBe(false);
    expect(props.highlightCurrentRow.default).toBe(false);
  });
});

// ===== Tree 组件交互测试 =====
describe('Tree 组件交互', () => {
  const testTreeData = [
    {
      id: 1,
      label: '节点1',
      children: [
        { id: 11, label: '节点1-1' },
        { id: 12, label: '节点1-2' },
      ],
    },
    {
      id: 2,
      label: '节点2',
      children: [
        { id: 21, label: '节点2-1' },
      ],
    },
  ];

  it('应该正确初始化', () => {
    expect(Tree).toBeDefined();
    expect(Tree.name).toBe('LytTree');
  });

  it('应该定义必要的 props', () => {
    const props = Tree.props;
    expect(props.data).toBeDefined();
    expect(props.checkable).toBeDefined();
    expect(props.draggable).toBeDefined();
    expect(props.showLine).toBeDefined();
  });

  it('应该有正确的默认值', () => {
    const props = Tree.props;
    expect(props.checkable.default).toBe(false);
    expect(props.draggable.default).toBe(false);
    expect(props.showLine.default).toBe(false);
    expect(props.showCheckbox.default).toBe(false);
  });
});

// ===== Form 组件交互测试 =====
describe('Form 组件交互', () => {
  it('应该正确初始化', () => {
    expect(Form).toBeDefined();
    expect(Form.name).toBe('LytForm');
  });

  it('应该定义必要的 props', () => {
    const props = Form.props;
    expect(props.model).toBeDefined();
    expect(props.labelWidth).toBeDefined();
    expect(props.labelPosition).toBeDefined();
    expect(props.rules).toBeDefined();
  });

  it('应该有正确的默认值', () => {
    const props = Form.props;
    expect(props.labelWidth.default).toBe('100px');
    expect(props.labelPosition.default).toBe('right');
    expect(typeof props.model.default).toBe('function');
    expect(typeof props.rules.default).toBe('function');
  });
});

// ===== Button 组件交互测试 =====
describe('Button 组件交互', () => {
  it('应该正确初始化', () => {
    expect(Button).toBeDefined();
    expect(Button.name).toBe('LytButton');
  });

  it('应该定义必要的 props', () => {
    const props = Button.props;
    expect(props.type).toBeDefined();
    expect(props.size).toBeDefined();
    expect(props.disabled).toBeDefined();
    expect(props.loading).toBeDefined();
  });

  it('应该有正确的默认值', () => {
    const props = Button.props;
    expect(props.type.default).toBe('default');
    expect(props.size.default).toBe('medium');
    expect(props.disabled.default).toBe(false);
    expect(props.loading.default).toBe(false);
  });
});

// ===== 组件集成测试 =====
describe('组件集成测试', () => {
  it('应该正确导出所有主要组件', () => {
    // 验证组件都已定义，并且可以正常导入
    expect(Table).toBeDefined();
    expect(Tree).toBeDefined();
    expect(Form).toBeDefined();
    expect(Button).toBeDefined();
  });

  it('所有组件都应该有正确的 name 属性', () => {
    expect(Table.name).toBe('LytTable');
    expect(Tree.name).toBe('LytTree');
    expect(Form.name).toBe('LytForm');
    expect(Button.name).toBe('LytButton');
  });

  it('所有组件都应该定义 props', () => {
    expect(Table.props).toBeDefined();
    expect(Tree.props).toBeDefined();
    expect(Form.props).toBeDefined();
    expect(Button.props).toBeDefined();
  });
});
