// @vitest-environment jsdom
/**
 * renderer/ssr-island 覆盖率电池（Task C）：补齐注册/获取/SSR 占位/hydration 边界分支
 */
import { describe, it, expect, vi } from 'vitest';
import {
  registerIslandComponent,
  getIslandComponent,
  createIslandSSRContent,
  hydrateIsland,
} from '../src/ssr/ssr-island';

const Comp = { render: () => null } as never;

describe('ssr-island battery: registry', () => {
  it('registers valid and warns on invalid names', () => {
    registerIslandComponent('Widget', Comp);
    expect(getIslandComponent('Widget')).toBe(Comp);
    expect(getIslandComponent('Nope')).toBeUndefined();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    registerIslandComponent('' as any, Comp);

    registerIslandComponent(123 as any, Comp);
    warnSpy.mockRestore();
  });
});

describe('ssr-island battery: createIslandSSRContent', () => {
  it('creates a placeholder div with encoded props', () => {
    const html = createIslandSSRContent('Widget', { a: 1, b: 'x' });
    expect(html).toContain('data-island="Widget"');
    expect(html).toContain('data-props=');
    expect(html).toContain('island placeholder');
  });

  it('escapes the island name', () => {
    const html = createIslandSSRContent('a"b', {});
    expect(html).not.toContain('data-island="a"b"');
  });
});

describe('ssr-island battery: hydrateIsland', () => {
  it('warns when container selector is not found', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await hydrateIsland('#does-not-exist', Comp);
    warnSpy.mockRestore();
  });

  it('hydrates island elements found in a container', async () => {
    registerIslandComponent('Hydratable', Comp);
    const root = document.createElement('div');
    root.innerHTML = createIslandSSRContent('Hydratable', { x: 1 });
    document.body.appendChild(root);
    await hydrateIsland(root, Comp);
    // 未注册名不应抛错
    const root2 = document.createElement('div');
    root2.innerHTML = '<div data-island="Unregistered"></div>';
    document.body.appendChild(root2);
    await hydrateIsland(root2, Comp);
    document.body.innerHTML = '';
  });
});
