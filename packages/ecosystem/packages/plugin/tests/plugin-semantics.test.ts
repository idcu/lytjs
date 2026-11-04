import { describe, it, expect, vi } from 'vitest';
import { PluginRegistry, PluginValidator } from '../src/index';
import type { EnhancedPlugin } from '../src/index';

/**
 * 插件语义回归（2026-11-05）
 *
 * 这一组钉的是「**两条安装入口必须一致**」以及版本范围的语义。
 * 它们此前全是绿的 —— 因为 85 个既有用例里**没有任何一个调用 `registry.install()`**，
 * 而那正是生命周期钩子与依赖检查缺失的地方。
 */
const mk = () => new PluginRegistry();

describe('install()：生命周期与依赖（与 app.use 对齐）', () => {
  it('★ 顺序：beforeInstall → install → afterInstall', async () => {
    const registry = mk();
    const log: string[] = [];
    registry.register({ name: 'base', version: '1.0.0', install: () => log.push('base') });
    registry.register({
      name: 'dep',
      version: '1.0.0',
      install: () => log.push('install'),
      dependencies: [{ name: 'base', version: '^1.0.0' }],
      beforeInstall: () => {
        log.push('before');
        return true;
      },
      afterInstall: () => log.push('after'),
    });

    const ok = await registry.install('dep', {});
    expect(ok).toBe(true);
    expect(log).toEqual(['before', 'install', 'after']);
    expect(registry.get('dep')?.installed).toBe(true);
  });

  it('★ beforeInstall 返回 false ⇒ 取消安装，但仍留在注册表', async () => {
    const registry = mk();
    const install = vi.fn();
    registry.register({
      name: 'p',
      install,
      beforeInstall: () => false,
    });

    const ok = await registry.install('p', {});
    expect(ok).toBe(false);
    expect(install).not.toHaveBeenCalled();
    expect(registry.get('p')?.installed).toBe(false);
    expect(registry.has('p')).toBe(true);
  });

  it('异步 beforeInstall 可被 await（app.use 做不到）', async () => {
    const registry = mk();
    const log: string[] = [];
    registry.register({
      name: 'async-hook',
      install: () => log.push('install'),
      beforeInstall: async () => {
        await Promise.resolve();
        log.push('before');
        return true;
      },
    });
    await registry.install('async-hook', {});
    expect(log).toEqual(['before', 'install']);
  });

  it('★ 缺必需依赖 ⇒ 拒绝安装', async () => {
    const registry = mk();
    const install = vi.fn();
    registry.register({ name: 'a', install, dependencies: [{ name: 'missing-dep' }] });

    const ok = await registry.install('a', {});
    expect(ok).toBe(false);
    expect(install).not.toHaveBeenCalled();
    expect(registry.get('a')?.installed).toBe(false);
  });

  it('必需依赖版本不符 ⇒ 拒绝安装；可选依赖版本不符 ⇒ 放行', async () => {
    const hard = mk();
    hard.register({ name: 'lib', version: '1.0.0', install: () => {} });
    hard.register({
      name: 'needs-v2',
      install: () => {},
      dependencies: [{ name: 'lib', version: '^2.0.0' }],
    });
    expect(await hard.install('needs-v2', {})).toBe(false);

    const soft = mk();
    soft.register({ name: 'opt', version: '9.0.0', install: () => {} });
    soft.register({
      name: 'soft',
      install: () => {},
      optionalDependencies: [{ name: 'opt', version: '^1.0.0' }],
    });
    const dep = soft.checkDependencies(soft.get('soft')!.plugin);
    expect(dep.satisfied).toBe(true);
    expect(dep.versionMismatch).toHaveLength(1);
    expect(dep.requiredVersionMismatch).toHaveLength(0);
    expect(await soft.install('soft', {})).toBe(true);
  });
});

describe('install()：失败必须留下 error 事件', () => {
  it('★ 同步抛错：补 error 事件后仍抛给调用方', async () => {
    const registry = mk();
    const events: string[] = [];
    registry.on('error', (event, data) => events.push(String((data as { name: string }).name)));
    registry.on('before:install', () => events.push('before:install'));
    registry.on('after:install', () => events.push('after:install'));
    registry.register({
      name: 'boom',
      install: () => {
        throw new Error('kaboom');
      },
    });

    await expect(registry.install('boom', {})).rejects.toThrow('kaboom');
    expect(events).toContain('boom');
    expect(events).toContain('before:install');
    expect(events).not.toContain('after:install');
    expect(registry.get('boom')?.installed).toBe(false);
  });

  it('异步 reject：同样抛给调用方并留下 error 事件', async () => {
    const registry = mk();
    const errors: string[] = [];
    registry.on('error', (event, data) =>
      errors.push(String((data as { error?: string }).error ?? '')),
    );
    registry.register({
      name: 'reject',
      install: async () => {
        throw new Error('async-kaboom');
      },
    });

    await expect(registry.install('reject', {})).rejects.toThrow('async-kaboom');
    expect(errors.some((line) => line.includes('async-kaboom'))).toBe(true);
  });

  it('afterInstall 抛错：插件仍算装好，但必须留痕', async () => {
    const registry = mk();
    const errors: string[] = [];
    registry.on('error', (event, data) =>
      errors.push(String((data as { error?: string }).error ?? '')),
    );
    registry.register({
      name: 'bad-after',
      install: () => {},
      afterInstall: () => {
        throw new Error('after-boom');
      },
    });

    expect(await registry.install('bad-after', {})).toBe(true);
    expect(registry.get('bad-after')?.installed).toBe(true);
    expect(errors.some((line) => line.includes('after-boom'))).toBe(true);
  });

  it('重复 install 只执行一次', async () => {
    const registry = mk();
    const install = vi.fn();
    registry.register({ name: 'once', install });
    await registry.install('once', {});
    await registry.install('once', {});
    expect(install).toHaveBeenCalledTimes(1);
  });
});

describe('冲突检查：与注册顺序无关', () => {
  it('★ 先注册声明方，再注册被声明方 ⇒ 也要拒绝', () => {
    const registry = mk();
    registry.register({ name: 'b', install: () => {}, conflicts: ['a'] });
    const result = registry.register({ name: 'a', install: () => {} });
    expect(result.success).toBe(false);
    expect(result.error).toContain('b');
  });

  it('先注册被声明方，再注册声明方 ⇒ 拒绝（原有方向）', () => {
    const registry = mk();
    registry.register({ name: 'a', install: () => {} });
    const result = registry.register({ name: 'b', install: () => {}, conflicts: ['a'] });
    expect(result.success).toBe(false);
  });
});

describe('版本范围语义', () => {
  const satisfies = (actual: string, range: string): boolean => {
    const registry = mk();
    registry.register({ name: 'x', version: actual, install: () => {} });
    return registry.checkDependencies({
      name: 'y',
      install: () => {},
      dependencies: [{ name: 'x', version: range }],
    }).satisfied;
  };

  it('★ 缺省段的 caret / tilde / 精确写法（此前全部判成不满足）', () => {
    expect(satisfies('1.2.3', '^1.0')).toBe(true);
    expect(satisfies('1.2.3', '~1.2')).toBe(true);
    expect(satisfies('1.2.3', '1.2')).toBe(true);
    expect(satisfies('1.4.0', '1')).toBe(true);
    expect(satisfies('2.0.0', '1')).toBe(false);
  });

  it('★ `*` 匹配任意版本', () => {
    expect(satisfies('1.2.3', '*')).toBe(true);
    expect(satisfies('0.0.1', '*')).toBe(true);
  });

  it('★ 空格分隔是交集（此前 `>=1.0.0 <2.0.0` 会放行 3.0.0）', () => {
    expect(satisfies('1.5.0', '>=1.0.0 <2.0.0')).toBe(true);
    expect(satisfies('3.0.0', '>=1.0.0 <2.0.0')).toBe(false);
    expect(satisfies('0.9.0', '>=1.0.0 <2.0.0')).toBe(false);
  });

  it('`||` 分隔是并集', () => {
    expect(satisfies('2.5.0', '^1.0.0 || ^2.0.0')).toBe(true);
    expect(satisfies('3.0.0', '^1.0.0 || ^2.0.0')).toBe(false);
  });

  it('^0.x 的语义（^0.2.3 不允许 0.3.0）', () => {
    expect(satisfies('0.2.5', '^0.2.3')).toBe(true);
    expect(satisfies('0.3.0', '^0.2.3')).toBe(false);
    expect(satisfies('0.0.3', '^0.0.3')).toBe(true);
    expect(satisfies('0.0.4', '^0.0.3')).toBe(false);
  });

  it('三段精确匹配', () => {
    expect(satisfies('1.2.3', '1.2.3')).toBe(true);
    expect(satisfies('1.2.4', '1.2.3')).toBe(false);
  });
});

describe('加载顺序与卸载', () => {
  it('拓扑排序：依赖先装', () => {
    const registry = mk();
    registry.register({ name: 'app', install: () => {}, dependencies: [{ name: 'db' }] });
    registry.register({ name: 'db', install: () => {}, dependencies: [{ name: 'core' }] });
    registry.register({ name: 'core', install: () => {} });
    expect(registry.resolveLoadOrder().map((p) => p.name)).toEqual(['core', 'db', 'app']);
  });

  it('循环依赖抛错', () => {
    const registry = mk();
    registry.register({ name: 'a', install: () => {}, dependencies: [{ name: 'b' }] });
    registry.register({ name: 'b', install: () => {}, dependencies: [{ name: 'a' }] });
    expect(() => registry.resolveLoadOrder()).toThrow(/Circular/);
  });

  it('★ 缺依赖时给出告警（此前静默）', () => {
    const registry = mk();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registry.register({ name: 'needy', install: () => {}, dependencies: [{ name: 'ghost' }] });
    registry.resolveLoadOrder();
    const lines = warnSpy.mock.calls.map((args) => args.map(String).join(' '));
    warnSpy.mockRestore();
    expect(lines.some((line) => line.includes('ghost'))).toBe(true);
  });

  it('可选依赖在场时也参与排序', () => {
    const registry = mk();
    registry.register({ name: 'app', install: () => {}, optionalDependencies: [{ name: 'opt' }] });
    registry.register({ name: 'opt', install: () => {} });
    expect(registry.resolveLoadOrder().map((p) => p.name)).toEqual(['opt', 'app']);
  });

  it('★ 卸载被依赖的插件时告警并点名依赖方', () => {
    const registry = mk();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registry.register({ name: 'base', install: () => {} });
    registry.register({ name: 'user', install: () => {}, dependencies: [{ name: 'base' }] });
    registry.unregister('base');
    const lines = warnSpy.mock.calls.map((args) => args.map(String).join(' '));
    warnSpy.mockRestore();
    expect(registry.has('base')).toBe(false);
    expect(lines.some((line) => line.includes('user'))).toBe(true);
  });

  it('无人依赖时不产生告警', () => {
    const registry = mk();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registry.register({ name: 'lonely', install: () => {} });
    registry.unregister('lonely');
    const calls = warnSpy.mock.calls.length;
    warnSpy.mockRestore();
    expect(calls).toBe(0);
  });
});

describe('PluginValidator.registerKnownPlugins 真的生效', () => {
  const plugin: EnhancedPlugin = {
    name: 'p',
    install: () => {},
    dependencies: [{ name: 'ghost' }],
  };

  it('★ 登记后依赖不在已知列表 ⇒ warning 点名 ghost', () => {
    const validator = new PluginValidator();
    validator.registerKnownPlugins(['real-plugin']);
    const report = validator.validate(plugin);
    expect(report.warningCount).toBe(1);
    expect(report.issues.some((i) => i.message.includes('ghost'))).toBe(true);
    expect(report.valid).toBe(true);
  });

  it('未登记过已知插件时保持既有行为（不产生告警）', () => {
    const validator = new PluginValidator();
    expect(validator.validate(plugin).warningCount).toBe(0);
  });

  it('把依赖登记进已知列表后不再告警', () => {
    const validator = new PluginValidator();
    validator.registerKnownPlugins(['ghost']);
    expect(validator.validate(plugin).warningCount).toBe(0);
  });
});
