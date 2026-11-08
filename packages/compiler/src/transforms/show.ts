// src/transforms/v-show.ts
// v-show 指令转换逻辑

import type { DirectiveTransform } from '../types';
import { getExpContent } from './helpers';

export const transformShow: DirectiveTransform = (dir, _node, _context) => {
  const { exp } = dir;
  const props: Array<{ key: string; value: string }> = [];

  const expContent = getExpContent(exp);

  if (!expContent) {
    return { props: [] };
  }

  props.push({
    key: 'style',
    // 必须加括号：exp 可能是三元 / 逻辑表达式，直接拼会让 `?:` 右结合改变语义
    value: `(${expContent}) ? undefined : { display: 'none' }`,
  });

  return { props };
};
