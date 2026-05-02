import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineCustomElement, useShadowRoot, useHost, injectChildStyles } from '../src/web-component';
import type { DefineCustomElementOptions } from '../src/web-component';

describe('defineCustomElement', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should return a valid CustomElementConstructor', () => {
    const MyComponent = {
      name: 'my-component',
      render() {
        return null;
      },
    };

    const ctor = defineCustomElement(MyComponent, { name: 'test-my-element' });
    expect(ctor).toBeInstanceOf(Function);
    expect(ctor.prototype).toBeInstanceOf(HTMLElement);
  });

  it('should register the custom element with customElements', () => {
    const MyComponent = {
      name: 'reg-component',
      render() {
        return null;
      },
    };

    const tagName = 'test-reg-element';
    const ctor = defineCustomElement(MyComponent, { name: tagName });
    expect(customElements.get(tagName)).toBe(ctor);
  });

  it('should create shadow DOM by default', () => {
    const MyComponent = {
      name: 'shadow-component',
      render() {
        return null;
      },
    };

    defineCustomElement(MyComponent, {
      name: 'test-shadow-element',
    });

    const el = document.createElement('test-shadow-element');
    container.appendChild(el);

    // Shadow DOM should be created
    expect(el.shadowRoot).not.toBeNull();
  });

  it('should not create shadow DOM when shadowRoot option is false', () => {
    const MyComponent = {
      name: 'no-shadow-component',
      render() {
        return null;
      },
    };

    defineCustomElement(MyComponent, {
      name: 'test-no-shadow-element',
      shadowRoot: false,
    });

    const el = document.createElement('test-no-shadow-element');
    container.appendChild(el);

    // No Shadow DOM
    expect(el.shadowRoot).toBeNull();
  });

  it('should inject CSS into shadow DOM', () => {
    const MyComponent = {
      name: 'css-component',
      render() {
        return null;
      },
    };

    const css = '.test { color: red; }';
    defineCustomElement(MyComponent, {
      name: 'test-css-element',
      css,
    });

    const el = document.createElement('test-css-element');
    container.appendChild(el);

    expect(el.shadowRoot).not.toBeNull();
    const styleEl = el.shadowRoot!.querySelector('style');
    expect(styleEl).not.toBeNull();
    expect(styleEl!.textContent).toBe(css);
  });

  it('should call connectedCallback and disconnectedCallback', () => {
    const connected = vi.fn();
    const disconnected = vi.fn();

    class TestElement extends HTMLElement {
      connectedCallback() {
        connected();
      }
      disconnectedCallback() {
        disconnected();
      }
    }

    const tagName = 'test-callback-element';
    customElements.define(tagName, TestElement);

    const el = document.createElement(tagName);
    container.appendChild(el);
    expect(connected).toHaveBeenCalled();

    container.removeChild(el);
    expect(disconnected).toHaveBeenCalled();
  });

  it('should extract observedAttributes from component props', () => {
    const MyComponent = {
      name: 'props-component',
      props: {
        msg: { type: String },
        count: { type: Number },
        active: { type: Boolean },
      },
      render() {
        return null;
      },
    };

    const ctor = defineCustomElement(MyComponent, {
      name: 'test-observed-el',
    });

    expect(ctor.observedAttributes).toContain('msg');
    expect(ctor.observedAttributes).toContain('count');
    expect(ctor.observedAttributes).toContain('active');
  });

  it('should convert camelCase props to kebab-case observedAttributes', () => {
    const MyComponent = {
      name: 'camel-component',
      props: {
        maxLength: { type: Number },
        isActive: { type: Boolean },
      },
      render() {
        return null;
      },
    };

    const ctor = defineCustomElement(MyComponent, {
      name: 'test-camel-el',
    });

    expect(ctor.observedAttributes).toContain('max-length');
    expect(ctor.observedAttributes).toContain('is-active');
  });

  it('should use component name for tag when no name option provided', () => {
    const MyComponent = {
      name: 'my-auto-named-comp',
      render() {
        return null;
      },
    };

    const ctor = defineCustomElement(MyComponent);
    expect(customElements.get('my-auto-named-comp')).toBe(ctor);
  });

  it('should default to lyt-component when no name is provided', () => {
    const MyComponent = {
      render() {
        return null;
      },
    };

    const ctor = defineCustomElement(MyComponent);
    expect(customElements.get('lyt-component')).toBe(ctor);
  });

  it('should not re-register if custom element already registered', () => {
    const MyComponent = {
      name: 'dup-component',
      render() {
        return null;
      },
    };

    const ctor1 = defineCustomElement(MyComponent, { name: 'test-dup-el' });
    const ctor2 = defineCustomElement(MyComponent, { name: 'test-dup-el' });
    // Each call creates a new class, but the registered element should be the first one
    expect(customElements.get('test-dup-el')).toBe(ctor1);
    expect(ctor2).not.toBe(ctor1);
  });

  it('should have empty observedAttributes when component has no props', () => {
    const MyComponent = {
      name: 'no-props-component',
      render() {
        return null;
      },
    };

    const ctor = defineCustomElement(MyComponent, {
      name: 'test-no-props-el',
    });

    expect(ctor.observedAttributes).toEqual([]);
  });
});

describe('useShadowRoot', () => {
  it('should return null when called outside Custom Element context', () => {
    const result = useShadowRoot();
    expect(result).toBeNull();
  });
});

describe('useHost', () => {
  it('should return null when called outside Custom Element context', () => {
    const result = useHost();
    expect(result).toBeNull();
  });
});

describe('injectChildStyles', () => {
  it('should not throw when called outside Custom Element context', () => {
    expect(() => injectChildStyles('.test { color: red; }')).not.toThrow();
  });
});
