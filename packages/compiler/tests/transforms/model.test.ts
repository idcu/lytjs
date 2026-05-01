// tests/transforms/model.test.ts
// transformModel 独立单元测试

import { describe, it, expect } from "vitest";
import { transformModel } from "../../src/transforms/model";
import { NodeTypes } from "../../src/constants";
import type { DirectiveNode } from "../../src/types";
import { createMockContext, createModelDirective } from "./helpers";
import { createElement } from "../../src/ast";

describe("transformModel", () => {
  describe("基本双向绑定转换", () => {
    it("应该为 v-model 生成 modelValue 和 onUpdate:modelValue props", () => {
      const context = createMockContext();
      const dir = createModelDirective("message");
      const node = createElement("input");
      const result = transformModel(dir, node, context);

      expect(result.props).toHaveLength(2);
      expect(result.props[0]).toEqual({ key: "modelValue", value: "message" });
      expect(result.props[1]).toEqual({
        key: "onUpdate:modelValue",
        value: "$event => (message = $event)",
      });
    });

    it("应该正确处理带点号路径的表达式", () => {
      const context = createMockContext();
      const dir = createModelDirective("form.name");
      const node = createElement("input");
      const result = transformModel(dir, node, context);

      expect(result.props[0]).toEqual({
        key: "modelValue",
        value: "form.name",
      });
      expect(result.props[1]).toEqual({
        key: "onUpdate:modelValue",
        value: "$event => (form.name = $event)",
      });
    });

    it("应该正确处理带方括号的表达式", () => {
      const context = createMockContext();
      const dir = createModelDirective("items[0]");
      const node = createElement("input");
      const result = transformModel(dir, node, context);

      expect(result.props[0]).toEqual({ key: "modelValue", value: "items[0]" });
      expect(result.props[1]).toEqual({
        key: "onUpdate:modelValue",
        value: "$event => (items[0] = $event)",
      });
    });
  });

  describe("修饰符处理", () => {
    it("应该接受 .trim 修饰符（当前实现忽略修饰符）", () => {
      const context = createMockContext();
      const dir = createModelDirective("text", ["trim"]);
      const node = createElement("input");
      const result = transformModel(dir, node, context);

      // 当前实现不处理修饰符，但不应报错
      expect(result.props).toHaveLength(2);
      expect(result.props[0]).toEqual({ key: "modelValue", value: "text" });
    });

    it("应该接受 .number 修饰符（当前实现忽略修饰符）", () => {
      const context = createMockContext();
      const dir = createModelDirective("count", ["number"]);
      const node = createElement("input");
      const result = transformModel(dir, node, context);

      expect(result.props).toHaveLength(2);
      expect(result.props[0]).toEqual({ key: "modelValue", value: "count" });
    });

    it("应该接受 .lazy 修饰符（当前实现忽略修饰符）", () => {
      const context = createMockContext();
      const dir = createModelDirective("search", ["lazy"]);
      const node = createElement("input");
      const result = transformModel(dir, node, context);

      expect(result.props).toHaveLength(2);
      expect(result.props[0]).toEqual({ key: "modelValue", value: "search" });
    });

    it("应该接受多个修饰符组合", () => {
      const context = createMockContext();
      const dir = createModelDirective("value", ["trim", "number", "lazy"]);
      const node = createElement("input");
      const result = transformModel(dir, node, context);

      expect(result.props).toHaveLength(2);
    });
  });

  describe("边界条件", () => {
    it("当 exp 为 undefined 时应返回空 props", () => {
      const context = createMockContext();
      const dir: DirectiveNode = {
        type: NodeTypes.DIRECTIVE,
        name: "model",
        arg: undefined,
        exp: undefined,
        modifiers: [],
        loc: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
          source: "",
        },
      };
      const node = createElement("input");
      const result = transformModel(dir, node, context);

      expect(result.props).toHaveLength(0);
    });

    it("当 exp 为非 SIMPLE_EXPRESSION 类型时应返回空 props", () => {
      const context = createMockContext();
      const dir: DirectiveNode = {
        type: NodeTypes.DIRECTIVE,
        name: "model",
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
      const node = createElement("input");
      const result = transformModel(dir, node, context);

      expect(result.props).toHaveLength(0);
    });

    it("应该正确处理空字符串表达式", () => {
      const context = createMockContext();
      const dir = createModelDirective("");
      const node = createElement("input");
      const result = transformModel(dir, node, context);

      // 空字符串仍然是有效的 expContent
      expect(result.props).toHaveLength(2);
      expect(result.props[0]).toEqual({ key: "modelValue", value: "" });
    });
  });

  describe("组件 v-model", () => {
    it("应该为组件元素上的 v-model 生成正确的 props", () => {
      const context = createMockContext();
      const dir = createModelDirective("visible");
      const node = createElement("MyDialog");
      const result = transformModel(dir, node, context);

      expect(result.props).toHaveLength(2);
      expect(result.props[0]).toEqual({ key: "modelValue", value: "visible" });
      expect(result.props[1]).toEqual({
        key: "onUpdate:modelValue",
        value: "$event => (visible = $event)",
      });
    });
  });

  describe("返回值结构", () => {
    it("返回值应包含 props 数组", () => {
      const context = createMockContext();
      const dir = createModelDirective("val");
      const node = createElement("input");
      const result = transformModel(dir, node, context);

      expect(Array.isArray(result.props)).toBe(true);
    });

    it("返回值默认 needRuntime 应为 undefined", () => {
      const context = createMockContext();
      const dir = createModelDirective("val");
      const node = createElement("input");
      const result = transformModel(dir, node, context);

      expect(result.needRuntime).toBeUndefined();
    });
  });
});
