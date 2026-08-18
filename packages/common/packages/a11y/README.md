# @lytjs/common-a11y

轻量级无障碍访问工具，为常见组件生成 ARIA 属性、处理焦点管理和键盘导航。

## 安装

```bash
pnpm add @lytjs/common-a11y
```

## 使用示例

### 生成按钮 / 表单控件的 a11y 属性

```typescript
import { getButtonA11yProps, getFormControlA11yProps } from '@lytjs/common-a11y';

const buttonProps = getButtonA11yProps({ ariaLabel: '关闭', disabled: true });
const inputProps = getFormControlA11yProps({ id: 'name', required: true });
```

### 焦点管理

```typescript
import { focusTrap, manageFocus, getFocusableElements, isFocusable } from '@lytjs/common-a11y';

// 在容器内创建焦点陷阱，返回清理函数
const cleanup = focusTrap(modalEl, { initialFocus: firstEl });
cleanup(); // 解除焦点陷阱

// 移入焦点并返回恢复函数
const restore = manageFocus(dialogEl, triggerEl);
restore(); // 恢复到触发元素
```

### 键盘导航

```typescript
import { handleListKeydown, getNextEnabledIndex } from '@lytjs/common-a11y';

el.addEventListener('keydown', (event) => {
  handleListKeydown(
    event,
    currentIndex,
    totalItems,
    (i) => isEnabled(i),
    (i) => select(i),
  );
});
```

## API 说明

### 属性生成函数

以下函数返回将驼峰属性（如 `ariaLabel`）转换为 `aria-*` DOM 属性名的对象，供渲染层使用。

| 函数                             | 作用                                     |
| -------------------------------- | ---------------------------------------- |
| `getButtonA11yProps`             | 按钮组件 a11y 属性                       |
| `getFormControlA11yProps`        | 表单控件（输入框/选择框）a11y 属性       |
| `getInputControlA11yProps`       | 复选框/单选框 a11y 属性                  |
| `getSwitchA11yProps`             | 开关（switch）组件 a11y 属性             |
| `getComboboxA11yProps`           | 下拉选择（combobox）组件 a11y 属性       |
| `getOptionA11yProps`             | 列表框选项 a11y 属性                     |
| `getSliderA11yProps`             | 滑块（slider）组件 a11y 属性             |
| `getSpinbuttonA11yProps`         | 数字输入（spinbutton）组件 a11y 属性     |
| `getTablistA11yProps`            | 标签页列表 a11y 属性                     |
| `getTabA11yProps`                | 单个标签页 a11y 属性                     |
| `getTabpanelA11yProps`           | 标签面板 a11y 属性                       |
| `getDialogA11yProps`             | 对话框/模态框 a11y 属性                  |
| `getGroupA11yProps`              | 分组组件（radiogroup/group/listbox）属性 |
| `getTabIndex(disabled, custom?)` | 生成 tabindex 值（禁用返回 -1）          |

### 焦点与无障碍操作

| 函数/常量                          | 作用                               |
| ---------------------------------- | ---------------------------------- |
| `focusTrap(container, options?)`   | 在容器内创建焦点陷阱，返回清理函数 |
| `manageFocus(container, trigger?)` | 将焦点移入容器，返回恢复函数       |
| `getFocusableElements(container)`  | 获取容器内所有可聚焦元素           |
| `isFocusable(element)`             | 检查元素是否可聚焦                 |
| `getAriaProps(element)`            | 获取元素上所有 `aria-*` 属性       |
| `setAriaProps(element, props)`     | 批量设置 `aria-*` 属性             |
| `assertActiveElement(element)`     | 检查元素是否为当前活动元素         |
| `mergeA11yProps(...props)`         | 合并多个 a11y 属性对象，过滤空值   |

### 键盘导航辅助

| 函数                                         | 作用                                                |
| -------------------------------------------- | --------------------------------------------------- |
| `handleListKeydown(event, ...)`              | 处理列表组件的键盘导航（方向键/Home/End/Enter/Esc） |
| `getNextEnabledIndex(index, total, cb, dir)` | 在启用的选项间计算下一个索引                        |

### 类型与常量

- `A11yProps`：通用无障碍属性接口
- `FocusTrapOptions`：焦点陷阱配置项（`initialFocus` / `escapeDeactivates`）
- `ARIA_ROLES`：ARIA 角色到必需属性的映射

## 相关包

- [`@lytjs/common`](https://www.npmjs.com/package/@lytjs/common) 聚合包，统一导出各模块 API

## License

[MIT](../../../../LICENSE)
