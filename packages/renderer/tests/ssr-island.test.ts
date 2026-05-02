import { describe, it, expect, beforeEach } from 'vitest';
import { createVNode } from '@lytjs/vdom';
import {
  registerIslandComponent,
  getIslandComponent,
  createIslandSSRContent,
  hydrateIsland,
} from '../src/ssr/ssr-island';
import type { ComponentOptions } from '../src/ssr/ssr-island';

describe('SSR Island Architecture', () => {
  describe('registerIslandComponent', () => {
    it('should register a component and retrieve it by name', () => {
      const component: ComponentOptions = {
        name: 'MyWidget',
        render() {
          return createVNode('div', null, 'widget');
        },
      };
      registerIslandComponent('MyWidget', component);
      const retrieved = getIslandComponent('MyWidget');
      expect(retrieved).toBe(component);
    });

    it('should return undefined for unregistered component', () => {
      const retrieved = getIslandComponent('NonExistent');
      expect(retrieved).toBeUndefined();
    });

    it('should overwrite a previously registered component with the same name', () => {
      const comp1: ComponentOptions = { name: 'OverwriteTest' };
      const comp2: ComponentOptions = { name: 'OverwriteTest' };
      registerIslandComponent('OverwriteTest', comp1);
      registerIslandComponent('OverwriteTest', comp2);
      expect(getIslandComponent('OverwriteTest')).toBe(comp2);
    });
  });

  describe('createIslandSSRContent', () => {
    it('should generate correct HTML with data-island and data-props attributes', () => {
      const html = createIslandSSRContent('Counter', { count: 0, label: 'Clicks' });
      expect(html).toContain('data-island="Counter"');
      expect(html).toContain('data-props="');
      expect(html).toContain('<!-- island placeholder -->');
      expect(html).toMatch(/^<div /);
      expect(html).toMatch(/<\/div>$/);
    });

    it('should encode props as base64', () => {
      const html = createIslandSSRContent('TestIsland', { value: 42 });
      // Extract the data-props value
      const match = html.match(/data-props="([^"]+)"/);
      expect(match).not.toBeNull();
      const encoded = match![1]!;
      // Should be base64-encoded JSON
      const decoded = JSON.parse(atob(encoded));
      expect(decoded).toEqual({ value: 42 });
    });

    it('should handle empty props', () => {
      const html = createIslandSSRContent('EmptyIsland', {});
      const match = html.match(/data-props="([^"]+)"/);
      expect(match).not.toBeNull();
      const decoded = JSON.parse(atob(match![1]!));
      expect(decoded).toEqual({});
    });

    it('should handle props with special characters', () => {
      const html = createIslandSSRContent('SpecialIsland', { text: '<script>alert(1)</script>' });
      // Props are base64 encoded, so raw script tag should NOT appear in HTML
      expect(html).not.toContain('<script>alert(1)</script>');
      // But the decoded value should be correct
      const match = html.match(/data-props="([^"]+)"/);
      expect(match).not.toBeNull();
      const decoded = JSON.parse(atob(match![1]!));
      expect(decoded.text).toBe('<script>alert(1)</script>');
    });
  });

  describe('hydrateIsland', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    it('should hydrate an island element with a component', async () => {
      // Create island placeholder HTML
      const islandHTML = createIslandSSRContent('TestWidget', { message: 'Hello Island' });
      container.innerHTML = islandHTML;

      // Register the component
      const component: ComponentOptions = {
        name: 'TestWidget',
        render() {
          return createVNode('span', null, 'Hello Island');
        },
      };
      registerIslandComponent('TestWidget', component);

      // Hydrate
      await hydrateIsland(container, component);

      // The island element should now have the rendered content
      const islandEl = container.querySelector('[data-island]');
      expect(islandEl).not.toBeNull();
      expect(islandEl!.innerHTML).toContain('<span>Hello Island</span>');
    });

    it('should work with a CSS selector string as container', async () => {
      const wrapper = document.createElement('div');
      wrapper.id = 'island-root';
      wrapper.innerHTML = createIslandSSRContent('SelectorTest', { x: 1 });
      document.body.appendChild(wrapper);

      const component: ComponentOptions = {
        name: 'SelectorTest',
        render() {
          return createVNode('p', null, 'hydrated');
        },
      };
      registerIslandComponent('SelectorTest', component);

      await hydrateIsland('#island-root', component);

      const islandEl = wrapper.querySelector('[data-island]');
      expect(islandEl!.innerHTML).toContain('<p>hydrated</p>');

      document.body.removeChild(wrapper);
    });

    it('should handle container not found gracefully', async () => {
      const component: ComponentOptions = {
        name: 'NoContainer',
        render() {
          return createVNode('div', null, 'nope');
        },
      };

      // Should not throw
      await expect(hydrateIsland('#nonexistent-container', component)).resolves.toBeUndefined();
    });
  });
});
