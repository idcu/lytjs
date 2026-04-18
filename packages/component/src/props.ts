/**
 * Lyt.js Props 系统
 *
 * 提供 props 声明标准化、验证与初始化能力。
 * 支持数组形式和对象形式的 props 声明，
 * 支持类型检查、默认值（值 / 工厂函数）、required 校验。
 * 纯原生实现，零外部依赖。
 */

// ============================================================
// 类型定义
// ============================================================

/** 支持的 prop 原始类型构造器 */
export type PropType =
  | typeof String
  | typeof Number
  | typeof Boolean
  | typeof Array
  | typeof Object
  | typeof Function
  | (() => any);

/** 单个 prop 的声明选项 */
export interface PropOptions {
  /** 期望类型，可以是单个类型或类型数组 */
  type?: PropType | PropType[] | null;
  /** 是否必传，默认 false */
  required?: boolean;
  /** 默认值，可以是静态值或返回默认值的工厂函数 */
  default?: any;
  /** 自定义验证函数，返回 true 表示通过 */
  validator?: (value: any) => boolean;
}

/** 标准化后的 props 选项映射 */
export type NormalizedPropsOptions = Record<string, PropOptions>;

/** 标准化后的 props 选项（保留原始 key 顺序） */
export type NormalizedProps = {
  /** 标准化后的选项映射 */
  options: NormalizedPropsOptions;
  /** 原始 key 列表（保持声明顺序） */
  keys: string[];
};

// ============================================================
// 内部工具
// ============================================================

/**
 * 判断值是否为普通对象（非数组、非 null）
 */
function isPlainObject(val: unknown): val is Record<string, any> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * 判断值是否为函数
 */
function isFunction(val: unknown): val is Function {
  return typeof val === 'function';
}

/**
 * 判断值是否为字符串
 */
function isString(val: unknown): val is string {
  return typeof val === 'string';
}

/**
 * 判断值是否为布尔值
 */
function isBoolean(val: unknown): val is boolean {
  return typeof val === 'boolean';
}

/**
 * 判断值是否为数字（排除 NaN）
 */
function isNumber(val: unknown): val is number {
  return typeof val === 'number' && !isNaN(val);
}

/**
 * 判断值是否为数组
 */
function isArray(val: unknown): val is any[] {
  return Array.isArray(val);
}

/**
 * 判断值是否为对象（非 null）
 */
function isObject(val: unknown): val is object {
  return val !== null && typeof val === 'object';
}

/**
 * 将值转为布尔值（用于 Boolean 类型的 prop 转换）
 * - 空字符串 '' → false
 * - 字符串 'false' / '0' → false
 * - 其他 → true
 */
function toBoolean(val: unknown): boolean {
  if (val === '' || val === 'false' || val === '0') {
    return false;
  }
  return !!val;
}

/**
 * 获取值的实际类型名称，用于错误提示
 */
function getTypeName(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (isArray(val)) return 'array';
  if (isBoolean(val)) return 'boolean';
  if (isNumber(val)) return 'number';
  if (isString(val)) return 'string';
  if (isFunction(val)) return 'function';
  return 'object';
}

/**
 * 获取 PropType 构造器对应的类型名称
 */
function getPropTypeName(type: PropType): string {
  if (type === String) return 'String';
  if (type === Number) return 'Number';
  if (type === Boolean) return 'Boolean';
  if (type === Array) return 'Array';
  if (type === Object) return 'Object';
  if (type === Function) return 'Function';
  return 'unknown';
}

// ============================================================
// 核心函数
// ============================================================

/**
 * 标准化 props 声明
 *
 * 支持两种形式：
 * - 数组形式：['title', 'count']  → 每个元素转为 { type: null }
 * - 对象形式：{ title: String, count: { type: Number, default: 0 } }
 *
 * @param props - 组件 options 中传入的 props 声明
 * @returns 标准化后的 props 结构（options + keys）
 */
export function normalizePropsOptions(
  props: string[] | Record<string, PropOptions | PropType | PropType[]> | undefined | null
): NormalizedProps {
  if (!props) {
    return { options: {}, keys: [] };
  }

  // 数组形式：['name', 'age']
  if (isArray(props)) {
    const options: NormalizedPropsOptions = {};
    const keys: string[] = [];
    for (let i = 0; i < props.length; i++) {
      const key = props[i];
      options[key] = { type: null };
      keys.push(key);
    }
    return { options, keys };
  }

  // 对象形式：{ name: String, age: { type: Number, default: 0 } }
  const options: NormalizedPropsOptions = {};
  const keys: string[] = [];
  const propKeys = Object.keys(props);

  for (let i = 0; i < propKeys.length; i++) {
    const key = propKeys[i];
    const raw = props[key];

    if (raw === null || raw === undefined) {
      // { name: null } → 无类型约束
      options[key] = { type: null };
    } else if (
      raw === String ||
      raw === Number ||
      raw === Boolean ||
      raw === Array ||
      raw === Object ||
      raw === Function
    ) {
      // { name: String } → 简写形式
      options[key] = { type: raw as PropType };
    } else if (isPlainObject(raw)) {
      // { name: { type: String, default: '' } } → 完整形式
      options[key] = { ...raw } as PropOptions;
    } else if (isArray(raw)) {
      // { name: [String, Number] } → 多类型简写
      options[key] = { type: raw as PropType[] };
    } else {
      // 未知形式，作为无类型约束处理
      options[key] = { type: null };
    }

    keys.push(key);
  }

  return { options, keys };
}

/**
 * 验证单个 prop 值是否符合声明约束
 *
 * 检查顺序：
 * 1. required 校验
 * 2. type 校验（如果声明了 type）
 * 3. 自定义 validator 校验
 *
 * @param propName - prop 名称
 * @param propOptions - 该 prop 的标准化选项
 * @param value - 传入的 prop 值
 * @returns 验证是否通过
 */
export function validateProp(
  propName: string,
  propOptions: PropOptions,
  value: unknown
): boolean {
  const { type, required, validator } = propOptions;

  // 1. required 校验：值缺失且没有默认值时，必须传入
  if (value === undefined || value === null) {
    if (required) {
      console.warn(`[Lyt Props] 缺少必填 prop: "${propName}"`);
      return false;
    }
    // 非必填且无值，跳过后续校验
    return true;
  }

  // 2. type 校验
  if (type !== null && type !== undefined) {
    const types = isArray(type) ? type : [type];
    let valid = false;

    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      let expected = false;

      if (t === String) {
        expected = isString(value);
      } else if (t === Number) {
        expected = isNumber(value);
      } else if (t === Boolean) {
        expected = isBoolean(value);
      } else if (t === Function) {
        expected = isFunction(value);
      } else if (t === Array) {
        expected = isArray(value);
      } else if (t === Object) {
        expected = isObject(value);
      }

      if (expected) {
        valid = true;
        break;
      }
    }

    if (!valid) {
      const typeNames = types.map(getPropTypeName).join(' | ');
      console.warn(
        `[Lyt Props] 无效的 prop: "${propName}"。` +
          `期望类型 ${typeNames}，实际得到 ${getTypeName(value)}。`
      );
      return false;
    }
  }

  // 3. 自定义 validator 校验
  if (validator && isFunction(validator)) {
    try {
      const result = validator(value);
      if (!result) {
        console.warn(
          `[Lyt Props] 自定义验证失败: prop "${propName}" 的值未通过 validator 校验。`
        );
        return false;
      }
    } catch (err) {
      console.warn(
        `[Lyt Props] validator 执行出错: prop "${propName}"`,
        err
      );
      return false;
    }
  }

  return true;
}

/**
 * 获取 prop 的默认值
 *
 * 如果 default 是工厂函数则调用并返回结果，
 * 否则直接返回 default 值。
 *
 * @param propOptions - 该 prop 的标准化选项
 * @param propName - prop 名称（用于错误提示）
 * @returns 默认值
 */
export function getPropDefaultValue(
  propOptions: PropOptions,
  propName: string
): any {
  const { default: defaultValue } = propOptions;

  // 没有声明 default，返回 undefined
  if (defaultValue === undefined) {
    return undefined;
  }

  // default 是函数且不是 PropType（排除 Function 类型 prop 的工厂函数歧义）
  // 判断依据：如果 type 中包含 Function，则 default 函数视为静态值
  if (isFunction(defaultValue)) {
    const type = propOptions.type;
    const isFuncType =
      type === Function ||
      (isArray(type) && type.indexOf(Function) !== -1);

    if (!isFuncType) {
      // 工厂函数，调用获取默认值
      return defaultValue();
    }
  }

  return defaultValue;
}

/**
 * 初始化组件 props
 *
 * 流程：
 * 1. 遍历标准化后的 props keys
 * 2. 从 rawProps 中取值，没有则取默认值
 * 3. 对 Boolean 类型做特殊转换
 * 4. 执行 validateProp 校验
 * 5. 将最终值写入 instance.props
 *
 * @param instance - 组件内部实例（需有 props 和 propsOptions 属性）
 * @param rawProps - 父组件传入的原始 props
 * @returns 初始化后的 props 对象
 */
export function initProps(
  instance: { props: Record<string, any>; propsOptions: NormalizedProps },
  rawProps: Record<string, any> | null | undefined
): Record<string, any> {
  const { options, keys } = instance.propsOptions;
  const props: Record<string, any> = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const opt = options[key];
    let value = rawProps ? rawProps[key] : undefined;

    // 如果外部没有传值，尝试取默认值
    if (value === undefined) {
      value = getPropDefaultValue(opt, key);
    }

    // Boolean 类型特殊处理：
    // - 如果 prop 类型为 Boolean 且未传值，默认为 false
    // - 如果传入了非布尔值，尝试转换
    if (opt.type !== null && opt.type !== undefined) {
      const types = isArray(opt.type) ? opt.type : [opt.type];
      if (types.indexOf(Boolean) !== -1 && value === undefined) {
        value = false;
      }
    }

    // 执行校验
    validateProp(key, opt, value);

    // 将值写入 props 对象
    props[key] = value;
  }

  // 将初始化好的 props 挂载到实例上
  instance.props = props;

  return props;
}
