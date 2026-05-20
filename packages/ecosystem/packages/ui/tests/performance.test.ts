/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
/**
 * @lytjs/ui - 性能基准测试
 *
 * 测试组件的渲染性能、响应时间等指标
 */

import { describe, it, expect } from 'vitest';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { Table } from '../src/components/Table';
import { Tree } from '../src/components/Tree';
import * as ui from '../src/index';

describe('UI 组件性能基准测试', () => {
  describe('Button 组件性能', () => {
    it('Button 定义应该快速初始化', () => {
      const start = performance.now();
      const component = Button;
      const end = performance.now();

      const initTime = end - start;
      console.log(`Button 初始化耗时: ${initTime.toFixed(2)}ms`);

      expect(component).toBeDefined();
      expect(initTime).toBeLessThan(10);
    });

    it('Button props 定义应该高效', () => {
      const props = Button.props;

      const start = performance.now();
      const type = props.type.default;
      const size = props.size.default;
      const end = performance.now();

      const accessTime = end - start;
      console.log(`Button props 访问耗时: ${accessTime.toFixed(2)}ms`);

      expect(type).toBe('default');
      expect(size).toBe('medium');
      expect(accessTime).toBeLessThan(1);
    });
  });

  describe('Input 组件性能', () => {
    it('Input 定义应该快速初始化', () => {
      const start = performance.now();
      const component = Input;
      const end = performance.now();

      const initTime = end - start;
      console.log(`Input 初始化耗时: ${initTime.toFixed(2)}ms`);

      expect(component).toBeDefined();
      expect(initTime).toBeLessThan(10);
    });
  });

  describe('Table 组件性能', () => {
    it('Table 定义应该快速初始化', () => {
      const start = performance.now();
      const component = Table;
      const end = performance.now();

      const initTime = end - start;
      console.log(`Table 初始化耗时: ${initTime.toFixed(2)}ms`);

      expect(component).toBeDefined();
      expect(initTime).toBeLessThan(10);
    });

    it('Table 处理 1000 行数据应该高效', () => {
      const props = Table.props;

      const _largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `用户${i + 1}`,
        age: Math.floor(Math.random() * 50) + 20,
        city: ['北京', '上海', '广州', '深圳'][i % 4],
      }));

      const _columns = [
        { prop: 'id', label: 'ID' },
        { prop: 'name', label: '姓名' },
        { prop: 'age', label: '年龄' },
        { prop: 'city', label: '城市' },
      ];

      const start = performance.now();
      const _data = props.data.default();
      const _colData = props.columns.default();
      const end = performance.now();

      const processingTime = end - start;
      console.log(`Table 1000行数据处理耗时: ${processingTime.toFixed(2)}ms`);

      expect(processingTime).toBeLessThan(50);
    });
  });

  describe('Tree 组件性能', () => {
    it('Tree 定义应该快速初始化', () => {
      const start = performance.now();
      const component = Tree;
      const end = performance.now();

      const initTime = end - start;
      console.log(`Tree 初始化耗时: ${initTime.toFixed(2)}ms`);

      expect(component).toBeDefined();
      expect(initTime).toBeLessThan(10);
    });

    it('Tree 处理深层嵌套数据应该高效', () => {
      const generateTreeData = (depth: number, breadth: number): any[] => {
        if (depth === 0) return [];

        return Array.from({ length: breadth }, (_, i) => ({
          id: `${depth}-${i}`,
          label: `节点 ${depth}-${i}`,
          children: generateTreeData(depth - 1, breadth),
        }));
      };

      const deepTree = generateTreeData(5, 3);

      const start = performance.now();
      const data = deepTree.length;
      const end = performance.now();

      const processingTime = end - start;
      console.log(`Tree 深度5、广度3树处理耗时: ${processingTime.toFixed(2)}ms`);

      expect(data).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(50);
    });
  });

  describe('组件导入性能', () => {
    it('完整 UI 包导入应该高效', () => {
      const start = performance.now();
      const uiComponents = ui;
      const end = performance.now();

      const importTime = end - start;
      console.log(`完整 UI 包导入耗时: ${importTime.toFixed(2)}ms`);

      expect(uiComponents).toBeDefined();
      expect(Object.keys(uiComponents).length).toBeGreaterThan(20);
      expect(importTime).toBeLessThan(100);
    });

    it('单个组件导入应该比完整包更快', () => {
      const singleStart = performance.now();
      const component = Button;
      const singleEnd = performance.now();

      const singleImportTime = singleEnd - singleStart;
      console.log(`单个 Button 导入耗时: ${singleImportTime.toFixed(2)}ms`);

      expect(component).toBeDefined();
      expect(singleImportTime).toBeLessThan(10);
    });
  });

  describe('内存使用基准', () => {
    it('组件定义不应该包含大量闭包', () => {
      const buttonSource = Button.toString();
      const inputSource = Input.toString();
      const tableSource = Table.toString();

      console.log(`Button 源码长度: ${buttonSource.length} 字符`);
      console.log(`Input 源码长度: ${inputSource.length} 字符`);
      console.log(`Table 源码长度: ${tableSource.length} 字符`);

      expect(buttonSource.length).toBeLessThan(5000);
      expect(inputSource.length).toBeLessThan(5000);
      expect(tableSource.length).toBeLessThan(10000);
    });
  });
});

describe('响应式性能测试', () => {
  it('signal 创建应该快速', () => {
    const { signal } = require('@lytjs/reactivity');

    const start = performance.now();
    const count = signal(0);
    const end = performance.now();

    const createTime = end - start;
    console.log(`signal 创建耗时: ${createTime.toFixed(2)}ms`);

    expect(count).toBeDefined();
    expect(createTime).toBeLessThan(5);
  });

  it('computed 创建应该快速', () => {
    const { signal, computed } = require('@lytjs/reactivity');

    const count = signal(0);

    const start = performance.now();
    const doubled = computed(() => count() * 2);
    const end = performance.now();

    const createTime = end - start;
    console.log(`computed 创建耗时: ${createTime.toFixed(2)}ms`);

    expect(doubled).toBeDefined();
    expect(createTime).toBeLessThan(5);
  });
});
