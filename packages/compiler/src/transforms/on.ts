// src/transforms/v-on.ts
// v-on 指令转换逻辑

import type { DirectiveTransform, ExpressionNode, JSProperty, JSChildNode } from '../types';
import { getExpContent } from './helpers';
import { capitalize } from '@lytjs/common-string';
import {
  createSimpleExpression,
  createCallExpression,
  createArrayExpression,
  createObjectProperty,
} from '../ast';

export const transformOn: DirectiveTransform = (dir, _node, _context) => {
  const { arg, exp, modifiers } = dir;
  const props: Array<JSProperty | { key: string; value: string }> = [];

  const argContent = arg ? getExpContent(arg as ExpressionNode) : undefined;
  const expContent = getExpContent(exp);

  if (argContent && expContent) {
    const eventName = argContent;

    let handler: JSChildNode = createSimpleExpression(expContent, false, dir.loc, false);

    if (modifiers.length > 0) {
      // 生成运行时事件处理器包装: withModifiers(handler, ["stop", "prevent", ...])
      handler = createCallExpression(
        'withModifiers',
        [
          handler,
          createArrayExpression(
            modifiers.map((m) => createSimpleExpression(`"${m}"`, true, dir.loc, true)),
            dir.loc,
          ),
        ],
        dir.loc,
      );
    }

    props.push(
      createObjectProperty(
        createSimpleExpression(`"on${capitalize(eventName)}"`, true, dir.loc, true),
        handler,
      ),
    );
  }

  return { props };
};
