import { test, expect } from '@playwright/test';
import { getText, getHTML, unmount, evaluateInBrowser, nextTick } from './helpers/mount';

test.describe('模板编译', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    await unmount(page)
  })

  test('compile 函数应该存在且可调用', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;
      return {
        isFunction: typeof compile === 'function',
      };
    }`)

    expect(result.isFunction).toBe(true)
  })

  test('compile 编译简单模板生成渲染函数', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<div>Hello Template</div>');
        return {
          success: true,
          hasRender: typeof compiled === 'function' || (compiled && typeof compiled.render === 'function'),
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    // compile 函数存在且可调用（具体返回格式取决于实现）
    expect(result.success).toBe(true)
  })

  test('compile 编译带插值的模板', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<span>{{ message }}</span>');
        return {
          success: true,
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
  })

  test('compile 编译带条件指令的模板', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<div><p v-if="show">Visible</p><p v-else>Hidden</p></div>');
        return {
          success: true,
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
  })

  test('compile 编译带列表指令的模板', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<ul><li v-for="item in items" :key="item.id">{{ item.name }}</li></ul>');
        return {
          success: true,
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
  })

  test('compile 编译带事件绑定的模板', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<button @click="handleClick">Click Me</button>');
        return {
          success: true,
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
  })

  test('compile 编译带组件引用的模板', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<my-component :prop="value" @event="handler"></my-component>');
        return {
          success: true,
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
  })

  test('compile 编译带 v-model 的模板', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<input v-model="text" type="text" />');
        return {
          success: true,
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
  })

  test('compile 编译带 slot 的模板', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;

      try {
        const compiled = compile('<template><slot>Default Content</slot></template>');
        return {
          success: true,
          type: typeof compiled,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
  })

  // ============================================================
  // 以下是改进的测试：验证 compile 输出的代码可以执行并产生正确的 VNode
  // ============================================================

  test('compile 返回的 code 字段应包含 render 函数定义', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;
      const compiled = compile('<div>Hello</div>');
      return {
        hasCode: typeof compiled.code === 'string',
        codeLength: compiled.code.length,
        containsRenderFunction: compiled.code.includes('function render'),
        containsCreateVNode: compiled.code.includes('createVNode') || compiled.code.includes('CREATE_VNODE'),
      };
    }`)

    expect(result.hasCode).toBe(true)
    expect(result.codeLength).toBeGreaterThan(0)
    expect(result.containsRenderFunction).toBe(true)
  })

  test('compile 返回的 preamble 应包含必要的 import 声明', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;
      const compiled = compile('<div>Hello</div>');
      return {
        hasPreamble: typeof compiled.preamble === 'string',
        preambleContent: compiled.preamble,
      };
    }`)

    expect(result.hasPreamble).toBe(true)
    // preamble 应包含 import 声明
    expect(result.preambleContent).toContain('import')
    expect(result.preambleContent).toContain('createVNode')
  })

  test('compile 返回的 ast 应包含正确的根节点信息', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile } = window.LytJS;
      const compiled = compile('<div>Hello</div>');
      return {
        hasAst: compiled.ast != null,
        astType: compiled.ast.type,
        astChildrenCount: compiled.ast.children ? compiled.ast.children.length : 0,
      };
    }`)

    expect(result.hasAst).toBe(true)
    expect(result.astType).toBeDefined()
  })

  test('compile 编译简单模板后，生成的 render 函数可以执行', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile, h, createVNode } = window.LytJS;
      const compiled = compile('<div>Hello World</div>');

      // 将 preamble 中的 import 替换为 window.LytJS 上的实际引用
      // preamble 格式: import { createVNode } from 'lytjs';
      // 我们需要将 createVNode 映射到 window.LytJS.createVNode
      const preamble = compiled.preamble;
      const code = compiled.code;

      // 提取 preamble 中 import 的名称
      const importMatch = preamble.match(/import\\s*\\{([^}]+)\\}\\s*from/);
      const importNames = importMatch ? importMatch[1].split(',').map(n => n.trim()) : [];

      // 构建参数映射
      const argValues = importNames.map(name => {
        if (window.LytJS[name]) return window.LytJS[name];
        return undefined;
      });

      try {
        // 使用 new Function 执行编译后的 render 函数
        const renderFn = new Function(...importNames, code + '\\nreturn render;');
        const render = renderFn(...argValues);

        // 执行 render 函数，传入空上下文
        const vnode = render({}, []);

        return {
          success: true,
          vnodeType: vnode ? vnode.type : null,
          vnodeTag: vnode && vnode.type === 'div' ? 'div' : (typeof vnode.type),
          hasChildren: vnode && vnode.children != null,
          childrenContent: vnode && vnode.children ? String(vnode.children) : null,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
          preamble: preamble,
          code: code,
        };
      }
    }`)

    expect(result.success).toBe(true)
    // VNode 的 type 应该是 'div' 标签
    expect(result.vnodeTag).toBe('div')
    expect(result.hasChildren).toBe(true)
    expect(result.childrenContent).toContain('Hello World')
  })

  test('compile 编译带插值的模板后，render 函数应正确引用上下文变量', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile, h, createVNode } = window.LytJS;
      const compiled = compile('<span>{{ message }}</span>');

      const preamble = compiled.preamble;
      const code = compiled.code;

      const importMatch = preamble.match(/import\\s*\\{([^}]+)\\}\\s*from/);
      const importNames = importMatch ? importMatch[1].split(',').map(n => n.trim()) : [];
      const argValues = importNames.map(name => window.LytJS[name] || undefined);

      try {
        const renderFn = new Function(...importNames, code + '\\nreturn render;');
        const render = renderFn(...argValues);

        // 传入包含 message 的上下文
        const vnode = render({ message: 'Hello from context' }, []);

        return {
          success: true,
          vnodeTag: vnode ? vnode.type : null,
          childrenContent: vnode && vnode.children ? String(vnode.children) : null,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
    expect(result.vnodeTag).toBe('span')
    // 插值应引用上下文中的 message 变量
    expect(result.childrenContent).toContain('Hello from context')
  })

  test('compile 编译带属性绑定的模板后，render 函数应正确生成 props', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile, h, createVNode } = window.LytJS;
      const compiled = compile('<a href="/home" class="link">Home</a>');

      const preamble = compiled.preamble;
      const code = compiled.code;

      const importMatch = preamble.match(/import\\s*\\{([^}]+)\\}\\s*from/);
      const importNames = importMatch ? importMatch[1].split(',').map(n => n.trim()) : [];
      const argValues = importNames.map(name => window.LytJS[name] || undefined);

      try {
        const renderFn = new Function(...importNames, code + '\\nreturn render;');
        const render = renderFn(...argValues);
        const vnode = render({}, []);

        return {
          success: true,
          vnodeTag: vnode ? vnode.type : null,
          hasProps: vnode && vnode.props != null,
          props: vnode ? vnode.props : null,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
    expect(result.vnodeTag).toBe('a')
    expect(result.hasProps).toBe(true)
    expect(result.props.href).toBe('/home')
    expect(result.props.class).toBe('link')
  })

  test('compile 编译带条件渲染的模板后，render 函数应支持条件分支', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile, h, createVNode } = window.LytJS;
      const compiled = compile('<div><p v-if="show">Visible</p><p v-else>Hidden</p></div>');

      const preamble = compiled.preamble;
      const code = compiled.code;

      const importMatch = preamble.match(/import\\s*\\{([^}]+)\\}\\s*from/);
      const importNames = importMatch ? importMatch[1].split(',').map(n => n.trim()) : [];
      const argValues = importNames.map(name => window.LytJS[name] || undefined);

      try {
        const renderFn = new Function(...importNames, code + '\\nreturn render;');
        const render = renderFn(...argValues);

        // 条件为 true
        const vnodeTrue = render({ show: true }, []);
        const childrenTrue = vnodeTrue.children || [];
        const textTrue = childrenTrue.map(c => c.children).filter(Boolean).join(',');

        // 条件为 false
        const vnodeFalse = render({ show: false }, []);
        const childrenFalse = vnodeFalse.children || [];
        const textFalse = childrenFalse.map(c => c.children).filter(Boolean).join(',');

        return {
          success: true,
          trueContainsVisible: textTrue.includes('Visible'),
          trueContainsHidden: textTrue.includes('Hidden'),
          falseContainsVisible: textFalse.includes('Visible'),
          falseContainsHidden: textFalse.includes('Hidden'),
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
    // show=true 时应显示 "Visible"
    expect(result.trueContainsVisible).toBe(true)
    expect(result.trueContainsHidden).toBe(false)
    // show=false 时应显示 "Hidden"
    expect(result.falseContainsVisible).toBe(false)
    expect(result.falseContainsHidden).toBe(true)
  })

  test('compile 编译带动态属性绑定的模板后，render 函数应正确引用上下文', async ({ page }) => {
    const result = await evaluateInBrowser(page, `(args) => {
      const { compile, h, createVNode } = window.LytJS;
      const compiled = compile('<div :id="dynamicId" :class="dynamicClass">Content</div>');

      const preamble = compiled.preamble;
      const code = compiled.code;

      const importMatch = preamble.match(/import\\s*\\{([^}]+)\\}\\s*from/);
      const importNames = importMatch ? importMatch[1].split(',').map(n => n.trim()) : [];
      const argValues = importNames.map(name => window.LytJS[name] || undefined);

      try {
        const renderFn = new Function(...importNames, code + '\\nreturn render;');
        const render = renderFn(...argValues);

        const vnode = render({
          dynamicId: 'my-div',
          dynamicClass: 'active highlighted'
        }, []);

        return {
          success: true,
          props: vnode ? vnode.props : null,
          idValue: vnode && vnode.props ? vnode.props.id : null,
          classValue: vnode && vnode.props ? vnode.props.class : null,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
        };
      }
    }`)

    expect(result.success).toBe(true)
    expect(result.idValue).toBe('my-div')
    expect(result.classValue).toBe('active highlighted')
  })
})
