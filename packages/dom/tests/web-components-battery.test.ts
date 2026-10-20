// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/dom` 的 **Web Components 支持**（`src/web-components.ts`，541 行）
 *
 * ## 为什么要有这条
 *
 * 实测该文件 **166/247 语句未覆盖（32.8%）** —— `AttributeReflector`、`createEnhancedElementClass`
 * 的属性同步与生命周期、桥接元数据几乎整段未测。这类"属性 ↔ attribute 双向同步"的逻辑
 * 出错时不会报错，只是**回调触发次数不对**或**值同步不上**，极难定位。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  StringConverter,
  NumberConverter,
  BooleanConverter,
  ObjectConverter,
  getConverterByType,
  AttributeReflector,
  createEnhancedElementClass,
  defineLytJSWebComponent,
  getBridgeMeta,
  supportsWebComponents,
  isDefined,
  whenDefined,
  upgradeAll,
} from '../src/web-components';
import type { EnhancedElementClass } from '../src/web-components';

let seq = 0;
const uniqueName = (prefix: string): string => `x-${prefix}-${++seq}`;

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ==================== 类型转换器 ====================

describe('类型转换器', () => {
  it('StringConverter', () => {
    expect(StringConverter.toAttribute(null)).toBeNull();
    expect(StringConverter.toAttribute(5)).toBe('5');
    expect(StringConverter.fromAttribute(null)).toBe('');
    expect(StringConverter.fromAttribute('x')).toBe('x');
  });

  it('NumberConverter：0 要能写出去，非法输入解析成 null', () => {
    expect(NumberConverter.toAttribute(null)).toBeNull();
    expect(NumberConverter.toAttribute('')).toBeNull();
    expect(NumberConverter.toAttribute(0)).toBe('0');
    expect(NumberConverter.fromAttribute('3.5')).toBe(3.5);
    expect(NumberConverter.fromAttribute('abc')).toBeNull();
    expect(NumberConverter.fromAttribute(null)).toBeNull();
  });

  it('BooleanConverter：存在即为 true', () => {
    expect(BooleanConverter.toAttribute(true)).toBe('');
    expect(BooleanConverter.toAttribute(false)).toBeNull();
    expect(BooleanConverter.fromAttribute('')).toBe(true);
    expect(BooleanConverter.fromAttribute(null)).toBe(false);
  });

  it('ObjectConverter：JSON 往返，非法/循环时降级为 null', () => {
    expect(ObjectConverter.toAttribute({ a: 1 })).toBe('{"a":1}');
    expect(ObjectConverter.toAttribute(null)).toBeNull();
    expect(ObjectConverter.fromAttribute('{"a":1}')).toEqual({ a: 1 });
    expect(ObjectConverter.fromAttribute('not-json')).toBeNull();
    expect(ObjectConverter.fromAttribute(null)).toBeNull();

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(ObjectConverter.toAttribute(circular)).toBeNull();
  });

  it('getConverterByType 的映射', () => {
    expect(getConverterByType('string')).toBe(StringConverter);
    expect(getConverterByType('number')).toBe(NumberConverter);
    expect(getConverterByType('boolean')).toBe(BooleanConverter);
    expect(getConverterByType('object')).toBe(ObjectConverter);
    expect(getConverterByType('array')).toBe(ObjectConverter);
    expect(getConverterByType('unknown' as never)).toBe(StringConverter);
  });
});

// ==================== AttributeReflector ====================

describe('AttributeReflector', () => {
  it('register 默认把 prop 转成 kebab-case 的 attr 名', () => {
    const r = new AttributeReflector();
    r.register({ prop: 'itemCount' });

    expect(r.getAttributeName('itemCount')).toBe('item-count');
    expect(r.getObservedAttributes()).toEqual(['item-count']);
  });

  it('显式 attr 优先；registerAll 批量注册', () => {
    const r = new AttributeReflector();
    r.registerAll([{ prop: 'a', attr: 'data-a' }, { prop: 'b' }]);

    expect(r.getAttributeName('a')).toBe('data-a');
    expect(r.getAttributeName('b')).toBe('b');
  });

  it('reflectToAttribute：无配置不动作 / null 移除 / 有值写入', () => {
    const r = new AttributeReflector();
    r.register({ prop: 'n', converter: NumberConverter });
    const el = document.createElement('div');

    r.reflectToAttribute(el, 'unknown', 1);
    expect(el.getAttribute('unknown')).toBeNull();

    r.reflectToAttribute(el, 'n', 5);
    expect(el.getAttribute('n')).toBe('5');

    r.reflectToAttribute(el, 'n', null);
    expect(el.hasAttribute('n')).toBe(false);
  });

  it('reflectFromAttribute：按 attr 或 kebab 名匹配，未知返回 null', () => {
    const r = new AttributeReflector();
    r.register({ prop: 'itemCount', converter: NumberConverter });

    const el = document.createElement('div');
    el.setAttribute('item-count', '7');

    expect(r.reflectFromAttribute(el, 'item-count')).toEqual({ prop: 'itemCount', value: 7 });
    expect(r.reflectFromAttribute(el, 'nope')).toBeNull();
  });

  it('getPropertyName：已注册返回 prop，未注册回退 kebab→camel', () => {
    const r = new AttributeReflector();
    r.register({ prop: 'itemCount' });

    expect(r.getPropertyName('item-count')).toBe('itemCount');
    expect(r.getPropertyName('other-attr')).toBe('otherAttr');
  });
});

// ==================== 增强元素类 ====================

describe('createEnhancedElementClass', () => {
  const mount = (options: Parameters<typeof createEnhancedElementClass>[0], prefix = 'el') => {
    const name = uniqueName(prefix);
    customElements.define(name, createEnhancedElementClass(options) as never);
    const el = document.createElement(name) as EnhancedElementClass;
    document.body.appendChild(el);
    return el;
  };

  it('observedAttributes 合并 options 与反射属性', () => {
    const name = uniqueName('obs');
    const El = createEnhancedElementClass({
      observedAttributes: ['data-x'],
      properties: [{ name: 'itemCount', type: 'number' }],
    });
    customElements.define(name, El as never);

    expect((El as unknown as { observedAttributes: string[] }).observedAttributes).toEqual([
      'data-x',
      'item-count',
    ]);
  });

  it('shadow: true ⇒ 创建 open shadow root 并注入样式', () => {
    const el = mount({ shadow: true, styles: '.a{color:red}' }, 'shadow');

    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot!.querySelector('style')!.textContent).toBe('.a{color:red}');
  });

  it('shadow 对象形式 ⇒ 采用指定 mode', () => {
    const el = mount({ shadow: { mode: 'closed' } }, 'closed');

    expect(el.shadowRoot).toBeNull(); // closed 模式外部拿不到
  });

  it('构造函数应用属性默认值', () => {
    const el = mount({ properties: [{ name: 'count', type: 'number', default: 3 }] }, 'def');

    expect(el.getProperty('count')).toBe(3);
  });

  it('★ setProperty 只通知一次（反射到 attribute 不应回声再通知一次）', () => {
    const onChange = vi.fn();
    const onPropertyChanged = vi.fn();
    const el = mount(
      {
        properties: [{ name: 'count', type: 'number', reflect: true, onChange }],
      },
      'once',
    );
    el.onPropertyChanged = onPropertyChanged;

    el.setProperty('count', 5);

    expect(el.getProperty('count')).toBe(5);
    expect(el.getAttribute('count')).toBe('5');
    // 原实现：setProperty 通知一次；反射 setAttribute 又触发 attributeChangedCallback 再通知一次
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onPropertyChanged).toHaveBeenCalledTimes(1);
  });

  it('setProperty 值未变时不通知（Object.is / 对象深比较）', () => {
    const onChange = vi.fn();
    const el = mount({ properties: [{ name: 'n', type: 'number', onChange }] }, 'same');

    el.setProperty('n', 1);
    onChange.mockClear();
    el.setProperty('n', 1);
    expect(onChange).not.toHaveBeenCalled();

    // 对象：内容相同视为未变
    const objChange = vi.fn();
    const el2 = mount({ properties: [{ name: 'o', type: 'object', onChange: objChange }] }, 'obj');
    el2.setProperty('o', { a: 1 });
    objChange.mockClear();
    el2.setProperty('o', { a: 1 });
    expect(objChange).not.toHaveBeenCalled();
  });

  it('循环引用对象也不抛错（跳过深比较继续更新）', () => {
    const el = mount({ properties: [{ name: 'o', type: 'object' }] }, 'circ');
    const a: Record<string, unknown> = {};
    a.self = a;

    expect(() => el.setProperty('o', a)).not.toThrow();
    expect(el.getProperty('o')).toBe(a);
  });

  it('attributeChangedCallback：同步属性值并触发回调', () => {
    const onChange = vi.fn();
    const el = mount({ properties: [{ name: 'count', type: 'number', onChange }] }, 'attr');
    const onPropertyChanged = vi.fn();
    el.onPropertyChanged = onPropertyChanged;

    el.setAttribute('count', '9');

    expect(el.getProperty('count')).toBe(9);
    expect(onChange).toHaveBeenCalledWith(9, undefined);
    expect(onPropertyChanged).toHaveBeenCalled();
  });

  it('attribute 值未变时 attributeChangedCallback 直接返回', () => {
    const onAttr = vi.fn();
    const el = mount({ properties: [{ name: 'count', type: 'number' }] }, 'noop');
    el.onAttributeChanged = onAttr;

    el.setAttribute('count', '1');
    onAttr.mockClear();
    el.setAttribute('count', '1'); // 同名同值 ⇒ 浏览器不会触发；显式调用验证守卫

    expect(onAttr).not.toHaveBeenCalled();
  });

  it('reflect: false 时 setProperty 不写 attribute', () => {
    const el = mount({ properties: [{ name: 'secret', type: 'string', reflect: false }] }, 'noref');

    el.setProperty('secret', 'v');

    expect(el.hasAttribute('secret')).toBe(false);
  });

  it('connected / disconnected 生命周期与 isConnectedToDOM', () => {
    const onConnected = vi.fn();
    const onDisconnected = vi.fn();
    const el = mount({}, 'life');
    el.onConnected = onConnected;
    el.onDisconnected = onDisconnected;

    // 已在 beforeEach 之后 append ⇒ connectedCallback 已执行过一次
    expect(el.isConnectedToDOM).toBe(true);

    el.remove();
    expect(el.isConnectedToDOM).toBe(false);
    expect(onDisconnected).toHaveBeenCalledTimes(1);
  });
});

// ==================== 桥接 ====================

describe('桥接与工具函数', () => {
  it('defineLytJSWebComponent 注册元素并写入桥接元数据', () => {
    const name = uniqueName('bridge');
    const component = { name: 'Counter' };

    defineLytJSWebComponent(
      name,
      { component, propMapping: { 'item-count': 'count' }, eventMapping: { change: 'update' } },
      { properties: [{ name: 'extra', type: 'string' }] },
    );

    expect(isDefined(name)).toBe(true);

    const el = document.createElement(name);
    const meta = getBridgeMeta(el)!;

    expect(meta.component).toBe(component);
    expect(meta.propMapping).toEqual({ 'item-count': 'count' });
    expect(meta.eventMapping).toEqual({ change: 'update' });
    expect(meta.slotMapping).toEqual({});
  });

  it('未桥接的元素 getBridgeMeta 返回 null', () => {
    expect(getBridgeMeta(document.createElement('div'))).toBeNull();
  });

  it('supportsWebComponents / isDefined / whenDefined', async () => {
    expect(supportsWebComponents()).toBe(true);

    const name = uniqueName('when');
    expect(isDefined(name)).toBe(false);

    customElements.define(name, class extends HTMLElement {});

    await expect(whenDefined(name)).resolves.toBeDefined();
    expect(isDefined(name)).toBe(true);
  });

  it('upgradeAll 不抛错', () => {
    expect(() => upgradeAll()).not.toThrow();
  });
});
