# @lytjs/common-raf

跨平台 `requestAnimationFrame` 工具集，提供 raf/caf 封装及节流、防抖、下一帧 Promise 能力。

## 安装

```bash
pnpm add @lytjs/common-raf
```

## 使用示例

```typescript
import { raf, caf, nextFrame, rafThrottle, rafDebounce } from '@lytjs/common-raf';

const id = raf(() => console.log('下一帧执行'));
caf(id); // 取消

await nextFrame(); // 等待下一帧

const throttled = rafThrottle(() => console.log('最多每帧执行一次'));
const debounced = rafDebounce(() => console.log('防抖后执行'), 3); // 3 帧后执行
```

## API 说明

### 基础封装

| 函数            | 说明                                              |
| --------------- | ------------------------------------------------- |
| `raf(callback)` | `requestAnimationFrame` 跨平台封装，返回帧回调 ID |
| `caf(id)`       | `cancelAnimationFrame` 跨平台封装，取消回调       |
| `nextFrame()`   | 返回一个 Promise，在下一帧时 resolve              |

在缺少 `requestAnimationFrame` 的环境（如 Node.js）中，`raf` 自动回退为 `setTimeout`（约 16ms），`caf` 回退为 `clearTimeout`。

### 高阶封装

| 函数                      | 说明                                                       |
| ------------------------- | ---------------------------------------------------------- |
| `rafThrottle(fn)`         | 节流：最多每个动画帧执行一次（保留最后一次调用的参数）     |
| `rafDebounce(fn, delay?)` | 防抖：在连续调用停止后再执行，`delay` 为延迟帧数（默认 1） |

```typescript
// 适合高频滚动、resize 等场景
const onScroll = rafThrottle(() => updateLayout());
window.addEventListener('scroll', onScroll);
```

## 相关包

本包为 [`@lytjs/common`](../common/) 聚合包的成员。

## 许可证

[MIT](../../../../LICENSE)
