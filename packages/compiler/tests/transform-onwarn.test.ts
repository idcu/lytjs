// C-14e：TransformOptions.onWarn 必须真正送达调用方
//
// 此前 onWarn 只声明、从未接线，变换期告警（v-for 等）只走全局 warn()。
// 这里用一条确定的告警做负控：三元 v-for 变量在修改前不会回调。

import { describe, it, expect } from 'vitest';
import { compile } from '../src';

describe('TransformOptions.onWarn', () => {
  it('v-for 三元变量告警会送达 onWarn', () => {
    const warnings: string[] = [];
    compile('<div><li v-for="(a, b, c) in items">{{ a }}</li></div>', {
      onWarn: (message) => warnings.push(message),
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('more than 2 variables');
  });
});
