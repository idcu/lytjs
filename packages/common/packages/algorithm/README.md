# @lytjs/common-algorithm

算法工具，提供最长递增子序列（LIS）等算法实现。

## 安装

```bash
pnpm add @lytjs/common-algorithm
```

## API

### `getSequence(arr: number[]): number[]`

求最长递增子序列，返回原数组中构成 LIS 的元素索引数组。

时间复杂度：O(n log n)

```typescript
import { getSequence } from '@lytjs/common-algorithm'

const indices = getSequence([10, 9, 2, 5, 3, 7, 101, 18])
// indices = [2, 4, 5, 6]
// 对应值 = [2, 3, 7, 101]

const arr = [10, 9, 2, 5, 3, 7, 101, 18]
const lis = indices.map(i => arr[i])
// lis = [2, 3, 7, 101]
```

## License

MIT
