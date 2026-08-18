# @lytjs/common-memory

内存优化工具集，提供对象池、内存泄漏检测与内存压力监控能力。

## 安装

```bash
pnpm add @lytjs/common-memory
```

## API

### `ObjectPool<T>`

通用对象池，通过复用对象减少 GC 压力。

```typescript
import { ObjectPool } from '@lytjs/common-memory';

const pool = new ObjectPool({
  maxSize: 100,
  create: () => ({ x: 0, y: 0 }),
  reset: (obj) => {
    obj.x = 0;
    obj.y = 0;
  },
});

const obj = pool.acquire();
// 使用 obj...
pool.release(obj);
```

常用方法：

| 方法            | 说明                                       |
| --------------- | ------------------------------------------ |
| `acquire()`     | 从池中获取对象，池空或校验失败时创建新对象 |
| `release()`     | 归还对象到池中（超过 maxSize 时丢弃）      |
| `releaseMany()` | 批量归还对象                               |
| `warmup()`      | 预分配对象到池中                           |
| `getStats()`    | 获取池的统计数据（命中率等）               |
| `clear()`       | 清空池                                     |
| `resize()`      | 调整池容量，超出部分被丢弃                 |

### `MemoryLeakDetector`

内存泄漏检测器，跟踪对象滞留情况（仅在 `__DEV__` 模式下生效）。

```typescript
import { startMemoryLeakDetection } from '@lytjs/common-memory';

startMemoryLeakDetection({ checkInterval: 5000, warningThreshold: 100 });
```

也可直接实例化使用：

```typescript
import { MemoryLeakDetector } from '@lytjs/common-memory';

const detector = new MemoryLeakDetector();
detector.start();
detector.track('MyObject', obj);
detector.release('MyObject');
const report = detector.generateReport(); // 生成内存报告
detector.stop();
```

### 全局内存泄漏检测

提供一组便捷的全局函数：

```typescript
import {
  getMemoryLeakDetector,
  startMemoryLeakDetection,
  stopMemoryLeakDetection,
  trackObject,
  releaseObject,
} from '@lytjs/common-memory';

trackObject('MyObject', obj); // 记录对象分配
releaseObject('MyObject'); // 记录对象释放
```

### `MemoryPressureMonitor`

内存压力监控，在内存占用超过阈值时触发回调。

```typescript
import { MemoryPressureMonitor } from '@lytjs/common-memory';

const monitor = new MemoryPressureMonitor(80); // 80% 阈值
monitor.onHighPressure((usage) => {
  console.warn('内存压力过高:', usage);
});
monitor.start(10000); // 每 10 秒检查一次
monitor.stop();
```

### `estimateObjectSize(obj)`

估算一个对象占用的内存字节数（粗略近似）。

### `forceGC()`

尽可能强制触发垃圾回收（需运行环境提供 `gc`）。

## 相关包

本包为 [`@lytjs/common`](../common/) 聚合包的成员。

## 许可证

[MIT](../../../../LICENSE)
