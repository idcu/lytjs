/**
 * ecosystem/plugin registry 覆盖率电池（Task C）：补齐 semver 前缀比较
 * （'', '=', '^', '~', '>', '>=', '<', '<='）、非法版本号、以及事件/清理的
 * 异常吞噬分支。
 */
import { describe, it, expect, vi } from 'vitest';
import { PluginRegistry } from '../src/registry';

function consumer(range: string, depName = 'dep') {
  return {
    name: 'consumer',
    version: '1.0.0',
    dependencies: [{ name: depName, version: range }],
  } as never;
}

describe('plugin registry battery: version ranges', () => {
  function setup() {
    const registry = new PluginRegistry();
    registry.register({ name: 'dep', version: '1.5.0' } as never);
    return registry;
  }

  it('supports exact (empty / =) prefixes', () => {
    const r = setup();
    expect(r.checkDependencies(consumer('1.5.0')).satisfied).toBe(true);
    expect(r.checkDependencies(consumer('1.4.0')).versionMismatch.length).toBe(1);
    expect(r.checkDependencies(consumer('=1.5.0')).satisfied).toBe(true);
  });

  it('supports ^ ~ > >= < <= prefixes', () => {
    const r = setup();
    expect(r.checkDependencies(consumer('^1.0.0')).satisfied).toBe(true);
    expect(r.checkDependencies(consumer('~1.5.0')).satisfied).toBe(true);
    expect(r.checkDependencies(consumer('>1.0.0')).satisfied).toBe(true);
    expect(r.checkDependencies(consumer('>=1.5.0')).satisfied).toBe(true);
    expect(r.checkDependencies(consumer('<2.0.0')).satisfied).toBe(true);
    expect(r.checkDependencies(consumer('<=1.5.0')).satisfied).toBe(true);

    // 不满足的分支
    expect(r.checkDependencies(consumer('^2.0.0')).versionMismatch.length).toBe(1);
    expect(r.checkDependencies(consumer('~1.4.0')).versionMismatch.length).toBe(1);
    expect(r.checkDependencies(consumer('>2.0.0')).versionMismatch.length).toBe(1);
    expect(r.checkDependencies(consumer('<1.0.0')).versionMismatch.length).toBe(1);
  });

  it('treats unparsable versions as unsatisfied', () => {
    const r = setup();
    expect(r.checkDependencies(consumer('not-a-version')).versionMismatch.length).toBe(1);

    const r2 = new PluginRegistry();
    r2.register({ name: 'bad', version: 'nope' } as never);
    expect(r2.checkDependencies(consumer('1.0.0', 'bad')).versionMismatch.length).toBe(1);
  });

  it('reports missing required and optional dependencies', () => {
    const r = setup();
    const result = r.checkDependencies({
      name: 'c',
      version: '1.0.0',
      dependencies: [{ name: 'ghost', version: '1.0.0' }],
      optionalDependencies: [{ name: 'ghost2', version: '1.0.0' }],
    } as never);
    expect(result.satisfied).toBe(false);
    expect(result.missing.length).toBe(1);
    expect(result.missingOptional.length).toBe(1);
  });

  it('returns early for a plugin without a string name', () => {
    const r = setup();
    const result = r.checkDependencies({ install() {} } as never);
    expect(result.satisfied).toBe(true);
  });
});

describe('plugin registry battery: events / cleanup error swallowing', () => {
  it('swallows throwing event handlers', () => {
    const registry = new PluginRegistry();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    registry.on('after:register', () => {
      throw new Error('handler boom');
    });
    expect(() => registry.register({ name: 'p1', version: '1.0.0' } as never)).not.toThrow();
    errSpy.mockRestore();
  });

  it('swallows throwing cleanup during clear()', () => {
    const registry = new PluginRegistry();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    registry.register({
      name: 'p2',
      version: '1.0.0',
      cleanup: () => {
        throw new Error('cleanup boom');
      },
    } as never);
    registry.markInstalled('p2');
    expect(() => registry.clear()).not.toThrow();
    errSpy.mockRestore();
  });

  it('supports unregister / off / emit round-trip', () => {
    const registry = new PluginRegistry();
    registry.register({ name: 'p3', version: '1.0.0' } as never);
    const handler = vi.fn();
    const off = registry.on('after:install', handler);
    registry.emit('after:install', { name: 'p3' });
    expect(handler).toHaveBeenCalled();
    off();
    registry.off('after:install', handler);
    expect(registry.unregister('p3')).toBe(true);
    expect(registry.unregister('p3')).toBe(false);
  });
});
