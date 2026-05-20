 
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from '@lytjs/reactivity';
import { defineVaporComponent, createVaporApp } from '../src/vapor/vapor-app';
import { clearCompileCache } from '@lytjs/compiler';
import type { VaporComponentDefinition, VaporContext } from '../src/vapor/vapor-app';

describe('Vapor App API', () => {
  let container: HTMLElement;

  beforeEach(() => {
    clearCompileCache();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  // ==================== defineVaporComponent ====================

  describe('defineVaporComponent', () => {
    it('should return a valid component definition', () => {
      const component = defineVaporComponent({
        name: 'TestComponent',
        template: '<div>hello</div>',
      });

      expect(component).toBeDefined();
      expect(component.name).toBe('TestComponent');
      expect(component.template).toBe('<div>hello</div>');
    });

    it('should compile the template and cache the result', () => {
      const component = defineVaporComponent({
        name: 'CompiledComponent',
        template: '<span>{{ message }}</span>',
      });

      expect(component.compiledCode).toBeDefined();
      expect(typeof component.compiledCode).toBe('string');
      expect(component.compiledCode!.length).toBeGreaterThan(0);
    });

    it('should store props definition', () => {
      const component = defineVaporComponent({
        name: 'PropsComponent',
        props: {
          title: { type: 'string', required: true },
          count: { type: 'number', default: 0 },
        },
        template: '<div>{{ title }}</div>',
      });

      expect(component.props).toBeDefined();
      expect(component.props!['title']).toBeDefined();
      expect(component.props!['title']!.required).toBe(true);
      expect(component.props!['count']!.default).toBe(0);
    });

    it('should store setup function', () => {
      const setupFn = (_props: Record<string, unknown>, _ctx: VaporContext) => {
        return { count: 0 };
      };

      const component = defineVaporComponent({
        name: 'SetupComponent',
        setup: setupFn,
        template: '<div>{{ count }}</div>',
      });

      expect(component.setup).toBe(setupFn);
    });

    it('should handle component without name', () => {
      const component = defineVaporComponent({
        template: '<div>anonymous</div>',
      });

      expect(component.name).toBeUndefined();
      expect(component.template).toBe('<div>anonymous</div>');
    });

    it('should handle component without setup', () => {
      const component = defineVaporComponent({
        name: 'NoSetupComponent',
        template: '<div>static</div>',
      });

      expect(component.setup).toBeUndefined();
    });

    it('should return VaporComponentDefinition type', () => {
      const component: VaporComponentDefinition = defineVaporComponent({
        name: 'TypedComponent',
        template: '<div>typed</div>',
      });

      expect(component).toHaveProperty('template');
      expect(component).toHaveProperty('compiledCode');
    });
  });

  // ==================== createVaporApp ====================

  describe('createVaporApp', () => {
    it('should create a VaporApp instance', () => {
      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<div>app</div>',
      });

      const app = createVaporApp(rootComponent);

      expect(app).toBeDefined();
      expect(typeof app.mount).toBe('function');
      expect(typeof app.unmount).toBe('function');
      expect(typeof app.provide).toBe('function');
      expect(typeof app.component).toBe('function');
    });

    it('should mount and render to a container element', () => {
      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<div><span>hello vapor</span></div>',
      });

      console.log('compiledCode:', rootComponent.compiledCode);

      const app = createVaporApp(rootComponent);
      app.mount(container);

      expect(container.innerHTML).toContain('hello vapor');
      const span = container.querySelector('span');
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe('hello vapor');

      app.unmount();
    });

    it('should mount to a CSS selector string', () => {
      container.id = 'vapor-app';
      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<p>selector mount</p>',
      });

      const app = createVaporApp(rootComponent);
      app.mount('#vapor-app');

      expect(container.innerHTML).toContain('selector mount');

      app.unmount();
    });

    it('should throw if container is not found', () => {
      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<div>test</div>',
      });

      const app = createVaporApp(rootComponent);
      expect(() => app.mount('#nonexistent-container')).toThrow(/cannot find element matching/);
    });

    it('should throw if mounting after unmount', () => {
      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<div>test</div>',
      });

      const app = createVaporApp(rootComponent);
      app.mount(container);
      app.unmount();

      expect(() => app.mount(container)).toThrow(/has been unmounted and cannot be remounted/);
    });

    it('should throw if mounting twice without unmounting', () => {
      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<div>test</div>',
      });

      const app = createVaporApp(rootComponent);
      app.mount(container);

      expect(() => app.mount(container)).toThrow(/is already mounted/);

      app.unmount();
    });
  });

  // ==================== unmount ====================

  describe('unmount', () => {
    it('should clean up on unmount', () => {
      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<div>{{ message }}</div>',
        setup() {
          return { message: ref('before unmount') };
        },
      });

      const app = createVaporApp(rootComponent);
      app.mount(container);

      expect(container.innerHTML).toContain('before unmount');

      app.unmount();

      // After unmount, updating the ref should not cause errors
      // (the effect should have been stopped)
    });

    it('should allow creating a new app after unmount', () => {
      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<div>content</div>',
      });

      const app1 = createVaporApp(rootComponent);
      app1.mount(container);
      app1.unmount();

      // Create and mount a new app
      const app2 = createVaporApp(rootComponent);
      app2.mount(container);

      expect(container.innerHTML).toContain('content');

      app2.unmount();
    });
  });

  // ==================== provide ====================

  describe('provide', () => {
    it('should register provides before mounting', () => {
      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<div>app</div>',
      });

      const app = createVaporApp(rootComponent);

      // Should not throw
      app.provide('key1', 'value1');
      app.provide(Symbol.for('key2'), { data: 42 });

      app.mount(container);
      app.unmount();
    });

    it('should warn when providing after mount', () => {
      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<div>app</div>',
      });

      const app = createVaporApp(rootComponent);
      app.mount(container);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      app.provide('late-key', 'late-value');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('cannot be called after the app has been mounted'),
      );
      warnSpy.mockRestore();

      app.unmount();
    });
  });

  // ==================== component registration ====================

  describe('component registration', () => {
    it('should register child components', () => {
      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<div>root</div>',
      });

      const childComponent = defineVaporComponent({
        name: 'ChildComponent',
        template: '<span>child</span>',
      });

      const app = createVaporApp(rootComponent);

      // component() should return the app for chaining
      const returnedApp = app.component('ChildComponent', childComponent);
      expect(returnedApp).toBe(app);

      app.mount(container);
      app.unmount();
    });
  });

  // ==================== setup integration ====================

  describe('setup integration', () => {
    it('should execute setup function and merge context', () => {
      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<div>{{ message }}</div>',
        setup() {
          return { message: 'from setup' };
        },
      });

      console.log('compiledCode for message:', rootComponent.compiledCode);

      const app = createVaporApp(rootComponent);
      app.mount(container);

      const div = container.querySelector('div');
      expect(div!.textContent).toBe('from setup');

      app.unmount();
    });

    it('should pass props and context to setup', () => {
      let receivedProps: Record<string, unknown> | undefined;
      let receivedContext: VaporContext | undefined;

      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<div>app</div>',
        setup(props, context) {
          receivedProps = props;
          receivedContext = context;
          return {};
        },
      });

      const app = createVaporApp(rootComponent, {
        rootProps: { title: 'hello' },
      });
      app.mount(container);

      expect(receivedProps).toBeDefined();
      expect(receivedProps!['title']).toBe('hello');
      expect(receivedContext).toBeDefined();
      expect(receivedContext!.attrs).toBeDefined();
      expect(receivedContext!.emit).toBeDefined();
      expect(typeof receivedContext!.emit).toBe('function');

      app.unmount();
    });

    it('should handle setup returning void', () => {
      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<div>static content</div>',
        setup() {
          // setup returns void
        },
      });

      const app = createVaporApp(rootComponent);
      app.mount(container);

      expect(container.innerHTML).toContain('static content');

      app.unmount();
    });
  });

  // ==================== VaporContext ====================

  describe('VaporContext', () => {
    it('should provide emit function that logs in dev mode', () => {
      let contextRef: VaporContext | undefined;

      const rootComponent = defineVaporComponent({
        name: 'App',
        template: '<div>app</div>',
        setup(_props, context) {
          contextRef = context;
          return {};
        },
      });

      const app = createVaporApp(rootComponent);
      app.mount(container);

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      contextRef!.emit('test-event', 'arg1', 'arg2');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-event'),
        expect.arrayContaining(['arg1', 'arg2']),
      );
      logSpy.mockRestore();

      app.unmount();
    });
  });
});
