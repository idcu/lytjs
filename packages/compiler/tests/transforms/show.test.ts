// tests/transforms/show.test.ts
// transformShow 独立单元测试

import { describe, it, expect } from "vitest";
import { transformShow } from "../../src/transforms/show";
import { NodeTypes } from "../../src/constants";
import type { DirectiveNode } from "../../src/types";
import { createMockContext, createShowDirective } from "./helpers";
import { createElement } from "../../src/ast";

describe("transformShow", () => {
  describe("基本 v-show 转换", () => {
    it("应该为 v-show 生成 style prop", () => {
      const context = createMockContext();
      const dir = createShowDirective("visible");
      const node = createElement("div");
      const result = transformShow(dir, node, context);

      expect(result.props).toHaveLength(1);
      expect(result.props[0]).toEqual({
        key: "style",
        value: "visible ? undefined : { display: 'none' }",
      });
    });

    it("应该正确处理布尔表达式", () => {
      const context = createMockContext();
      const dir = createShowDirective("isActive");
      const node = createElement("span");
      const result = transformShow(dir, node, context);

      expect(result.props).toHaveLength(1);
      expect(result.props[0].key).toBe("style");
      expect(result.props[0].value).toContain("isActive");
      expect(result.props[0].value).toContain("display: 'none'");
    });
  });

  describe("复杂表达式", () => {
    it("应该处理带逻辑运算符的表达式", () => {
      const context = createMockContext();
      const dir = createShowDirective("a && b");
      const node = createElement("div");
      const result = transformShow(dir, node, context);

      expect(result.props).toHaveLength(1);
      expect(result.props[0].value).toBe(
        "a && b ? undefined : { display: 'none' }",
      );
    });

    it("应该处理带比较运算符的表达式", () => {
      const context = createMockContext();
      const dir = createShowDirective("count > 0");
      const node = createElement("div");
      const result = transformShow(dir, node, context);

      expect(result.props).toHaveLength(1);
      expect(result.props[0].value).toBe(
        "count > 0 ? undefined : { display: 'none' }",
      );
    });

    it("应该处理带方法调用的表达式", () => {
      const context = createMockContext();
      const dir = createShowDirective("isVisible()");
      const node = createElement("div");
      const result = transformShow(dir, node, context);

      expect(result.props).toHaveLength(1);
      expect(result.props[0].value).toBe(
        "isVisible() ? undefined : { display: 'none' }",
      );
    });

    it("应该处理带属性访问的表达式", () => {
      const context = createMockContext();
      const dir = createShowDirective("user.loggedIn");
      const node = createElement("div");
      const result = transformShow(dir, node, context);

      expect(result.props).toHaveLength(1);
      expect(result.props[0].value).toBe(
        "user.loggedIn ? undefined : { display: 'none' }",
      );
    });

    it("应该处理三元表达式", () => {
      const context = createMockContext();
      const dir = createShowDirective("condition ? true : false");
      const node = createElement("div");
      const result = transformShow(dir, node, context);

      expect(result.props).toHaveLength(1);
      expect(result.props[0].value).toContain("condition ? true : false");
    });
  });

  describe("边界条件", () => {
    it("当 exp 为 undefined 时应返回空 props", () => {
      const context = createMockContext();
      const dir: DirectiveNode = {
        type: NodeTypes.DIRECTIVE,
        name: "show",
        arg: undefined,
        exp: undefined,
        modifiers: [],
        loc: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
          source: "",
        },
      };
      const node = createElement("div");
      const result = transformShow(dir, node, context);

      expect(result.props).toHaveLength(0);
    });

    it("当 exp 为非 SIMPLE_EXPRESSION 类型时应返回空 props", () => {
      const context = createMockContext();
      const dir: DirectiveNode = {
        type: NodeTypes.DIRECTIVE,
        name: "show",
        arg: undefined,
        exp: {
          type: NodeTypes.COMPOUND_EXPRESSION,
          children: ["a", " + ", "b"],
          isConstant: false,
          loc: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 1, offset: 0 },
            source: "",
          },
        },
        modifiers: [],
        loc: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
          source: "",
        },
      };
      const node = createElement("div");
      const result = transformShow(dir, node, context);

      expect(result.props).toHaveLength(0);
    });

    it("应该正确处理空字符串表达式", () => {
      const context = createMockContext();
      const dir = createShowDirective("");
      const node = createElement("div");
      const result = transformShow(dir, node, context);

      // 空字符串应返回空 props，避免生成无效代码
      expect(result.props).toHaveLength(0);
    });
  });

  describe("返回值结构", () => {
    it("返回值应包含 props 数组", () => {
      const context = createMockContext();
      const dir = createShowDirective("show");
      const node = createElement("div");
      const result = transformShow(dir, node, context);

      expect(Array.isArray(result.props)).toBe(true);
    });

    it("返回值默认 needRuntime 应为 undefined", () => {
      const context = createMockContext();
      const dir = createShowDirective("show");
      const node = createElement("div");
      const result = transformShow(dir, node, context);

      expect(result.needRuntime).toBeUndefined();
    });

    it("style prop 的 value 应包含条件表达式格式", () => {
      const context = createMockContext();
      const dir = createShowDirective("flag");
      const node = createElement("div");
      const result = transformShow(dir, node, context);

      const styleValue = result.props[0].value;
      // 验证三元表达式结构
      expect(styleValue).toMatch(
        /^\S+\s*\?\s*undefined\s*:\s*\{ display: 'none' \}$/,
      );
    });
  });
});
