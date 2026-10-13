// src/transforms/v-on.ts
// v-on 指令转换逻辑

import type { DirectiveTransform, ExpressionNode, JSChildNode, Property } from '../types';
import { getExpContent } from './helpers';
import { capitalize } from '@lytjs/common-string';
import {
  createSimpleExpression,
  createCallExpression,
  createArrayExpression,
  createObjectProperty,
} from '../ast';

export const transformOn: DirectiveTransform = (dir, _node, context) => {
  const { arg, exp, modifiers } = dir;
  const props: Property[] = [];

  const argContent = arg ? getExpContent(arg as ExpressionNode) : undefined;
  const expContent = getExpContent(exp);

  if (argContent && expContent) {
    const eventName = argContent;

    let handler: JSChildNode = createSimpleExpression(expContent, false, dir.loc, false);

    if (modifiers.length > 0) {
      // 生成运行时事件处理器包装: withModifiers(handler, ["stop", "prevent", ...])
      //
      // ⚠️ 必须走 `context.helper()` 而非裸名字：helper 只有登记进 `ast.helpers`，
      //    codegen 的 preamble 才会产出对应 `import`（module 模式）/ 运行时注入面才认得它。
      //    此前用裸 'withModifiers' ⇒ 产物既不 import 也不注入，`@click.stop` 直接
      //    ReferenceError（2026-10-10 修复；同批给守卫补了含修饰符的样本）。
      handler = createCallExpression(
        context.helper('WITH_MODIFIERS'),
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
