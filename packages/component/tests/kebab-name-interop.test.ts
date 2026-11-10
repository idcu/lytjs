/**
 * N28：模板属性名与 props/emit 的 kebab↔camel 互通。
 *
 * ## 为什么单独一块
 *
 * `@lytjs/compiler` **不**把模板属性名 camelize（`@sort-change` 生成的键就是
 * `onSort-change`、`:sort-key` 生成的键就是 `sort-key`），而 Vue 用户会按 Vue
 * 习惯写 kebab-case。此前的行为是：
 *   · `:sort-key` —— prop 静默停在默认值，`sort-key` 反被当普通 attr 落到根元素；
 *   · `@sort-change` —— 永远送不到处理器。
 * 两者都**不报错、不警告**，属于最难排查的一类缺陷。
 *
 * 修法落在运行时（编译器无法静态区分「组件 prop」与「原生元素属性」，
 * `<div :data-foo-bar>` 必须保持 kebab）：`initProps` 增加 kebab 回退并把已消费的
 * kebab 键从 attrs 里排除；`emit` 增加「on + 首字母大写的原始事件名」回退。
 *
 * ⚠️ 反向不能被破坏：**未声明的 kebab 属性必须照旧留在 attrs**
 * （`data-id` / `aria-label` / `data-testid` 依赖这一点）。
 */
import { describe, it, expect, vi } from 'vitest';
import { createComponentInstance, setupComponent, defineComponent, emit } from '../src/index';
import type { ComponentOptions } from '../src/types';

function createAndSetup(options: ComponentOptions, rawProps: Record<string, any> = {}) {
  const vnode = { type: options, props: rawProps, children: null };
  const instance = createComponentInstance(vnode, null);
  setupComponent(instance);
  return instance;
}

describe('N28 · kebab-case 属性与 props/emit 互通', () => {
  it(':sort-key（kebab）能填到 sortKey prop', () => {
    const options = defineComponent({
      name: 'KebabProp',
      props: { sortKey: { type: String, default: '' } },
    });
    const instance = createAndSetup(options, { 'sort-key': 'amount' });
    expect(instance.props.sortKey).toBe('amount');
  });

  it('已作为 prop 消费的 kebab 键不再落到 attrs', () => {
    const options = defineComponent({
      name: 'KebabPropAttr',
      props: { sortKey: { type: String, default: '' } },
    });
    const instance = createAndSetup(options, { 'sort-key': 'amount' });
    expect(instance.attrs['sort-key']).toBeUndefined();
  });

  it(':sortKey（camel）仍然有效，且优先级高于 kebab 同名键', () => {
    const options = defineComponent({
      name: 'CamelProp',
      props: { sortKey: { type: String, default: '' } },
    });
    expect(createAndSetup(options, { sortKey: 'camel' }).props.sortKey).toBe('camel');
    expect(createAndSetup(options, { sortKey: 'camel', 'sort-key': 'kebab' }).props.sortKey).toBe(
      'camel',
    );
  });

  it('kebab 回退不吃掉未声明的属性（data-id / aria-label 必须照旧进 attrs）', () => {
    const options = defineComponent({
      name: 'Passthrough',
      props: { sortKey: { type: String, default: '' } },
    });
    const instance = createAndSetup(options, {
      'data-id': 'row-1',
      'aria-label': '排序',
      'sort-key': 'amount',
    });
    expect(instance.attrs['data-id']).toBe('row-1');
    expect(instance.attrs['aria-label']).toBe('排序');
    expect(instance.props.sortKey).toBe('amount');
  });

  it('@sort-change 编译出的 onSort-change 键能收到 emit', () => {
    const handler = vi.fn();
    const options = defineComponent({ name: 'KebabEmit', emits: ['sortChange'] });
    const instance = createAndSetup(options, { 'onSort-change': handler });

    emit(instance, 'sort-change', 'amount');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('amount');
  });

  it('onSortChange（Vue 写法）仍然有效', () => {
    const handler = vi.fn();
    const options = defineComponent({ name: 'CamelEmit', emits: ['sortChange'] });
    const instance = createAndSetup(options, { onSortChange: handler });

    emit(instance, 'sortChange', 42);
    expect(handler).toHaveBeenCalledWith(42);
  });

  it('emit 在两种绑定都缺失时不抛错（无监听器是合法情形）', () => {
    const options = defineComponent({ name: 'NoListener', emits: ['sortChange'] });
    const instance = createAndSetup(options, {});
    expect(() => emit(instance, 'sort-change')).not.toThrow();
  });
});
