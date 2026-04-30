import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @lytjs/component 的 getCurrentInstance
const mockInstance = {
  slots: { default: vi.fn(() => []) },
  attrs: { class: "test", id: "app" },
  emit: vi.fn(),
  provides: {},
  parent: null,
  appContext: { components: {}, directives: {}, mixins: [], provides: {} },
} as any;

vi.mock("@lytjs/component", () => ({
  getCurrentInstance: () => mockInstance,
}));

import { useSlots, useAttrs, useModel } from "../composition";

describe("useSlots", () => {
  it("在组件实例中返回 slots 对象", () => {
    const slots = useSlots();
    expect(slots).toBeDefined();
    expect(typeof slots.default).toBe("function");
  });

  it("在无组件实例中返回空对象", () => {
    const { getCurrentInstance } = vi.mocked("@lytjs/component");
    getCurrentInstance.mockReturnValueOnce(null);
    const slots = useSlots();
    expect(slots).toEqual({});
  });
});

describe("useAttrs", () => {
  it("在组件实例中返回 attrs 对象", () => {
    const attrs = useAttrs();
    expect(attrs).toEqual({ class: "test", id: "app" });
  });

  it("在无组件实例中返回空对象", () => {
    const { getCurrentInstance } = vi.mocked("@lytjs/component");
    getCurrentInstance.mockReturnValueOnce(null);
    const attrs = useAttrs();
    expect(attrs).toEqual({});
  });

  it("返回的 attrs 不包含 props", () => {
    const attrs = useAttrs();
    expect(attrs).not.toHaveProperty("modelValue");
  });
});

describe("useModel", () => {
  it("读取 props 中的值", () => {
    const props = { count: 42 };
    const model = useModel(props, "count");
    expect(model.value).toBe(42);
  });

  it("设置值时触发 emit", () => {
    const props = { value: "hello" };
    const model = useModel(props, "value");
    model.value = "world";
    expect(mockInstance.emit).toHaveBeenCalledWith("update:value", "world");
  });

  it("在无组件实例中返回 undefined", () => {
    const { getCurrentInstance } = vi.mocked("@lytjs/component");
    getCurrentInstance.mockReturnValueOnce(null);
    const model = useModel({ count: 0 }, "count");
    expect(model.value).toBeUndefined();
  });

  it("支持泛型类型推导", () => {
    const props = { name: "lytjs", version: 1 };
    const nameModel = useModel<string>(props, "name");
    expect(nameModel.value).toBe("lytjs");

    const versionModel = useModel<number>(props, "version");
    expect(versionModel.value).toBe(1);
  });
});
