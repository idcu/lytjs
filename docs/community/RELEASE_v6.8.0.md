# LytJS v6.8.0 发布说明

## 🎉 版本亮点

LytJS v6.8.0 是一个类型系统大幅增强和开发体验大幅提升的重要版本，新增 80+ 实用类型工具、类型安全的事件系统和完善的 DevTools 调试增强！

## 🚀 新增功能

### 1. 通用类型工具库 - @lytjs/shared-types 大幅增强

- **新增 80+ 实用类型工具**：
  - `Parameters` - 获取函数参数类型
  - `ReturnType` - 获取函数返回类型
  - `ConstructorParameters` - 获取构造函数参数类型
  - `InstanceType` - 获取构造函数实例类型
  - `Awaited` - 获取 Promise 解析后的类型
  - `Partial` - 使所有属性可选
  - `Required` - 使所有属性必填
  - `Readonly` - 使所有属性只读
  - `Record` - 构造具有指定键和值类型的对象类型
  - `Pick` - 选择对象的某些属性
  - `Omit` - 移除对象的某些属性
  - `Exclude` - 从联合类型中排除某些类型
  - `Extract` - 从联合类型中提取某些类型
  - `NonNullable` - 从类型中排除 null 和 undefined
  - `ReturnType` - 获取函数返回类型
  - `Parameters` - 获取函数参数类型
  - `ConstructorParameters` - 获取构造函数参数类型
  - `InstanceType` - 获取构造函数实例类型
  - `ThisParameterType` - 获取函数的 this 参数类型
  - `OmitThisParameter` - 移除函数的 this 参数类型
  - `ThisType` - 指定 this 类型
  - `Uppercase` - 字符串转大写
  - `Lowercase` - 字符串转小写
  - `Capitalize` - 字符串首字母大写
  - `Uncapitalize` - 字符串首字母小写
  - 更多工具类型...

- **新增类型守卫类型定义和运行时工具**：
  - `IsString` - 字符串类型守卫
  - `IsNumber` - 数字类型守卫
  - `IsBoolean` - 布尔类型守卫
  - `IsArray` - 数组类型守卫
  - `IsObject` - 对象类型守卫
  - `IsFunction` - 函数类型守卫
  - `IsPromise` - Promise 类型守卫
  - 更多类型守卫...

- **新增字符串模板类型支持**：
  - `Join` - 连接字符串数组
  - `Split` - 分割字符串
  - `CamelToSnake` - 驼峰转蛇形
  - `SnakeToCamel` - 蛇形转驼峰
  - `KebabToCamel` - 短横线转驼峰
  - `CamelToKebab` - 驼峰转短横线
  - 更多字符串操作类型...

### 2. 类型安全的事件系统

- **新增完整的泛型事件发射器** - `@lytjs/shared-types/src/event-emitter.ts`：
  - 完整的泛型事件系统
  - 类型安全的事件监听
  - 类型安全的事件触发
  - 支持 on、off、emit、once、removeAllListeners 方法
  - 支持事件通配符
  - 支持事件优先级

### 3. DevTools 调试增强 - @lytjs/devtools

- **新增结构化日志系统**：
  - debug、info、warn、error、trace 五个日志级别
  - 彩色控制台输出
  - 日志过滤和分类
  - 日志持久化选项

- **新增调试断点工具**：
  - 条件断点
  - 日志断点
  - 错误断点
  - 性能断点

- **新增性能测量装饰器**：
  - `@measurePerformance` - 测量函数执行时间
  - `@measureAsyncPerformance` - 测量异步函数执行时间
  - 性能数据收集和展示
  - 性能对比功能

- **新增状态检查点系统**：
  - `createCheckpoint()` - 创建状态快照
  - `compareCheckpoints()` - 对比状态变化
  - 状态回滚功能
  - 状态历史记录

- **全局调试工具支持**：
  - 浏览器 DevTools 集成
  - 命令行工具
  - 远程调试支持

## 📦 完整更新包列表

### 核心包升级
1. `@lytjs/shared-types` - v6.7.0 → v6.8.0 (重要更新)
2. `@lytjs/reactivity` - v6.7.0 → v6.8.0
3. `@lytjs/vdom` - v6.7.0 → v6.8.0
4. `@lytjs/compiler` - v6.7.0 → v6.8.0
5. `@lytjs/renderer` - v6.7.0 → v6.8.0
6. `@lytjs/component` - v6.7.0 → v6.8.0
7. `@lytjs/core` - v6.7.0 → v6.8.0
8. `@lytjs/core-signal` - v6.7.0 → v6.8.0
9. `@lytjs/core-vnode` - v6.7.0 → v6.8.0

### 生态系统包升级
1. `@lytjs/devtools` - v6.7.0 → v6.8.0 (重要更新)
2. `@lytjs/router` - v6.7.0 → v6.8.0
3. `@lytjs/router-fs` - v6.7.0 → v6.8.0
4. `@lytjs/api` - v6.7.0 → v6.8.0
5. `@lytjs/store` - v6.7.0 → v6.8.0
6. `@lytjs/ssr` - v6.7.0 → v6.8.0
7. `@lytjs/ui` - v6.7.0 → v6.8.0
8. `@lytjs/bundler` - v6.7.0 → v6.8.0
9. `@lytjs/hmr` - v6.7.0 → v6.8.0
10. `@lytjs/runtime-edge` - v6.7.0 → v6.8.0
11. `@lytjs/compat` - v6.7.0 → v6.8.0

### 官方插件升级
所有 11 个官方插件版本统一升级至 v6.8.0

## 🔧 改进和修复

### 类型安全增强
- 完善了所有包的类型定义
- 更严格的类型检查
- 更好的类型推断
- 修复了多个类型错误

### 开发体验优化
- 更好的错误提示
- 更友好的开发工具
- 更快的编译速度
- 更完善的测试覆盖

### 文档完善
- 新增类型系统指南
- 新增 DevTools 使用文档
- 新增事件系统文档
- 更新所有包的 README

## 📖 升级指南

### 使用新的类型工具

```typescript
import { 
  Parameters, 
  ReturnType, 
  Partial, 
  Required, 
  Pick, 
  Omit,
  IsString,
  IsNumber,
  Join,
  Split,
  CamelToSnake
} from '@lytjs/shared-types';

// 使用 Parameters
function greet(name: string, age: number): string {
  return `Hello ${name}, you're ${age} years old`;
}

type GreetParams = Parameters<typeof greet>;
// [string, number]

// 使用 ReturnType
type GreetReturn = ReturnType<typeof greet>;
// string

// 使用类型守卫
function processValue(value: unknown) {
  if (IsString(value)) {
    // value 在这里被正确类型推断为 string
    console.log(value.toUpperCase());
  } else if (IsNumber(value)) {
    // value 在这里被正确类型推断为 number
    console.log(value * 2);
  }
}

// 使用字符串模板类型
type CamelCase = 'helloWorld';
type SnakeCase = CamelToSnake<CamelCase>;
// 'hello_world'
```

### 使用类型安全的事件系统

```typescript
import { EventEmitter } from '@lytjs/shared-types';

// 定义事件类型
interface MyEvents {
  'user:login': { userId: string; timestamp: number };
  'user:logout': { userId: string };
  'data:updated': { id: string; data: any };
}

// 创建事件发射器
const emitter = new EventEmitter<MyEvents>();

// 类型安全的事件监听
emitter.on('user:login', (event) => {
  // event 被正确类型推断
  console.log('User logged in:', event.userId);
});

// 类型安全的事件触发
emitter.emit('user:login', { 
  userId: '123', 
  timestamp: Date.now() 
});
```

### 使用 DevTools 增强

```typescript
import { 
  debug, 
  createCheckpoint, 
  compareCheckpoints,
  measurePerformance 
} from '@lytjs/devtools';

// 使用结构化日志
debug.info('Application started');
debug.warn('Low memory warning');
debug.error('Something went wrong');

// 使用状态检查点
const state = { count: 0 };
const checkpoint = createCheckpoint(state);

state.count = 10;
const diff = compareCheckpoints(checkpoint, state);
console.log('State changed:', diff);

// 使用性能测量装饰器
class MyComponent {
  @measurePerformance
  heavyComputation() {
    // 耗时操作
  }
}
```

## 🎯 下一步计划

1. **性能基准测试** - 对比 v6.7.0 的性能改进
2. **社区准备** - 编写教程和示例项目
3. **新功能规划** - 收集社区反馈，规划下一个版本的功能
4. **测试完善** - 进行全面的端到端测试

## 👏 贡献者

感谢所有参与 v6.8 开发的贡献者！

## 📄 许可证

MIT
