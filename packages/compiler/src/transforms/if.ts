// src/transforms/v-if.ts
// v-if / v-else-if / v-else 转换逻辑

import { NodeTypes } from '../constants';
import type {
  RootNode,
  TemplateChildNode,
  ElementNode,
  TransformContext,
  ExpressionNode,
  JSConditionalExpression,
  VNodeCall,
  JSChildNode,
} from '../types';
import { createSimpleExpression, createConditionalExpression } from '../ast';
import { getExpContent, findDirective } from './helpers';
import { transformElement } from './transform-element';

/**
 * 类型守卫：检查节点是否为 JSConditionalExpression。
 * FIX: P2-8 添加类型守卫函数，替代不安全的 as unknown as 类型断言链
 */
function isJSConditionalExpression(node: unknown): node is JSConditionalExpression {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as JSConditionalExpression).type === NodeTypes.JS_CONDITIONAL_EXPRESSION
  );
}

export function transformIf(
  node: RootNode | TemplateChildNode,
  context: TransformContext,
): void | (() => void) {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  const ifDir = findDirective(element, 'if');
  if (!ifDir && !findDirective(element, 'else-if') && !findDirective(element, 'else')) return;

  const parent = context.parent;
  if (!parent) return;

  // 推迟到 exit 回调执行：v-if 链的分支元素若在 transform 阶段就被移出 children，
  // 分支内部的子节点永远不会被遍历 —— 它们的 codegenNode 不会生成，
  // `<div v-if="ok"><span>{{ msg }}</span></div>` 的 children 会整片丢失。
  return () => {
    const parentRef = parent;

    const siblings = parentRef.children;
    const currentIndex = siblings.indexOf(node as TemplateChildNode);

    // 查找链中的第一个 v-if
    // FIX: 只有 v-else-if 和 v-else 可以和前面的 v-if 组成链
    // 独立的 v-if（没有 v-else-if/v-else）应该是一个新链的开始
    let chainStart = currentIndex;
    for (let i = currentIndex - 1; i >= 0; i--) {
      const sibling = siblings[i];
      // 跳过**纯空白**的 TEXT（模板缩进）—— 与下面正向扫描的规则一致。
      // ⚠️ 2026-10-28：不跳过时，`<i v-if>…</i>\n<i v-else>…</i>`（多行书写，
      //   实际模板几乎都是这样）会让反向扫描在换行处 `break` ⇒ 链尾找不到链首
      //   ⇒ v-else 被当成「独立分支」构造成 `(true ? 分支 : null)`
      //   ⇒ **v-if 的条件与另一分支一起丢失**（实测 slots demo 的用例变红）。
      if (sibling && sibling.type === NodeTypes.TEXT) {
        const text = (sibling as { content?: unknown }).content;
        if (typeof text !== 'string' || !text.trim()) continue;
        break;
      }
      if (sibling && sibling.type === NodeTypes.ELEMENT) {
        const sibElement = sibling as ElementNode;
        const hasIf = !!findDirective(sibElement, 'if');
        const hasElseIf = !!findDirective(sibElement, 'else-if');
        const hasElse = !!findDirective(sibElement, 'else');

        // 只有 v-else-if 可以继续链（表示这是链的中间部分）
        // v-else 表示链的结束
        // 独立的 v-if 表示新链的开始，应该停止向前查找
        if (hasElseIf) {
          chainStart = i;
        } else if (hasElse) {
          // v-else 后面不应该有 v-if，这是错误用法，但停止查找
          break;
        } else if (hasIf) {
          // 遇到 v-if ⇒ 它就是链首。
          //
          // ⚠️ 2026-10-28：此前这里只 `break`、不改 chainStart —— 因为链是由
          //   **v-if 节点自己**在 exit 时构建的，它天然知道自己在链首。
          //   现在改为「由链尾构建」（见下面的 chainEnd），链尾必须能找回链首，
          //   所以这里要显式记下来。
          chainStart = i;
          break;
        } else {
          // 没有条件指令，停止查找
          break;
        }
      } else {
        break;
      }
    }

    // 计算链尾：从 chainStart 向后，连续收集 v-else-if / v-else 的兄弟。
    //
    // ⚠️ 2026-10-28 修（P0）：此前链是由**链首（v-if 节点）**在它自己的 exit 里构建的，
    //   而那时后面的分支兄弟**还没被遍历** ⇒ 它们的 `codegenNode` 尚未生成 ⇒
    //   `transformElement` 只能靠手调兜底，而手调时**分支内部的子元素也没有 codegenNode**
    //   ⇒ 整片丢失。实测：
    //     <p v-if="ok"><b>A</b></p><p v-else><i>B</i></p>
    //       → createElementVNode("p", null, createElementVNode("b", …)) : createElementVNode("p", null)
    //   即 **v-else 分支里的元素子节点被静默丢弃**（文本子节点侥幸存活，
    //   因为字符串不需要子节点 codegen）—— 又一次「一半能用」。
    //
    //   修法：把构建时机推到**链尾**。链尾的 exit 一定发生在所有前序兄弟的 exit 之后，
    //   此时每个分支的 codegenNode 都已就绪，直接取用即可，无需手调 transformElement。
    let chainEnd = chainStart;
    for (let i = chainStart + 1; i < siblings.length; i++) {
      const sib = siblings[i];
      if (!sib) break;
      if (sib.type === NodeTypes.TEXT) {
        const text = (sib as { content?: unknown }).content;
        if (typeof text !== 'string' || !text.trim()) continue;
        break;
      }
      if (sib.type !== NodeTypes.ELEMENT) break;
      const el = sib as ElementNode;
      if (!findDirective(el, 'else-if') && !findDirective(el, 'else')) break;
      chainEnd = i;
    }

    // 还没走到链尾 ⇒ 交给链尾那次 exit 统一构建
    if (currentIndex !== chainEnd) return;

    // 构建条件链
    let conditional: JSConditionalExpression | undefined;
    // 链尾游标：下钻时**只移动 cursor**，而让 `conditional` 始终指向**链首**。
    // 此前循环里直接 `conditional = conditional.alternate` 下钻，导致最后
    // `siblings.splice(chainStart, 0, conditional)` 插入的是链的**最内层**节点，
    // 整条链其余分支（含 v-if 分支）都被静默丢弃。
    let cursor: JSConditionalExpression | undefined;

    const toRemove: number[] = [];

    for (let i = chainStart; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (!sibling) break;

      // 跳过**纯空白**的 TEXT 节点（模板的缩进 / 换行）。
      // 若不跳过：v-if 与 v-else 之间只因一个换行就会被判定为“链结束”，
      // 于是 v-else 退化成独立的 `test=true` 分支而**恒渲染** ——
      // 实际模板几乎都是多行书写的，这个缺陷影响面很大（由 slots demo 首次暴露）。
      if (sibling.type === NodeTypes.TEXT) {
        const text = (sibling as { content?: unknown }).content;
        if (typeof text !== 'string' || !text.trim()) continue;
        break;
      }

      if (sibling.type !== NodeTypes.ELEMENT) break;

      const sibElement = sibling as ElementNode;
      const sibIf = findDirective(sibElement, 'if');
      const sibElseIf = findDirective(sibElement, 'else-if');
      const sibElse = findDirective(sibElement, 'else');

      // FIX: 独立的 v-if（不在链首）表示新链的开始，停止收集
      if (sibIf && i !== chainStart) {
        break;
      }

      if (!sibIf && !sibElseIf && !sibElse) break;

      // 从 props 中移除 v-if/v-else-if/v-else 指令
      sibElement.props = sibElement.props.filter(
        (p) =>
          !(
            p.type === NodeTypes.DIRECTIVE &&
            (p.name === 'if' || p.name === 'else-if' || p.name === 'else')
          ),
      );

      // 分支元素此时应已有 codegenNode（链尾的 exit 晚于所有前序兄弟）。
      // 兜底：万一遍历顺序变了，仍手动转一次（对纯文本分支有效）。
      if (!sibElement.codegenNode) {
        const savedParent = context.parent;
        context.parent = parent;
        try {
          transformElement(sibElement, context, { sync: true });
        } finally {
          context.parent = savedParent;
        }
      }

      if (!sibElement.codegenNode) continue;
      const branchNode = sibElement.codegenNode as VNodeCall;

      if (sibIf || sibElseIf) {
        const testExpr = sibIf?.exp ?? sibElseIf?.exp;
        const testContent = testExpr ? getExpContent(testExpr as ExpressionNode) : undefined;
        const test = testContent
          ? createSimpleExpression(testContent, false, sibElement.loc, false)
          : createSimpleExpression('true', true, sibElement.loc, true);

        if (!conditional) {
          conditional = createConditionalExpression(
            test,
            branchNode as JSChildNode,
            undefined,
            true,
          );
          cursor = conditional;
        } else {
          cursor!.alternate = createConditionalExpression(
            test,
            branchNode as JSChildNode,
            undefined,
            true,
          );
          cursor = cursor!.alternate as JSConditionalExpression;
        }
      } else {
        // v-else
        if (!conditional) {
          conditional = createConditionalExpression(
            createSimpleExpression('true', true, sibElement.loc, true),
            branchNode as JSChildNode,
            undefined,
            true,
          );
          cursor = conditional;
        } else {
          cursor!.alternate = branchNode as JSChildNode;
        }
      }

      // 收集要移除的索引
      toRemove.push(i);
    }

    // 按逆序移除收集的兄弟节点以保持索引有效
    for (let i = toRemove.length - 1; i >= 0; i--) {
      siblings.splice(toRemove[i]!, 1);
    }

    if (conditional) {
      // FIX: P2-8 使用类型守卫验证后再插入，替代不安全的 as unknown as 断言
      // JSConditionalExpression 具有 type 属性，在 AST 转换阶段可作为 TemplateChildNode
      // 插入到父节点的 children 数组中
      if (isJSConditionalExpression(conditional)) {
        siblings.splice(chainStart, 0, conditional as TemplateChildNode);
      }
    }
  };
}
