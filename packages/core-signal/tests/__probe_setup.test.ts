// @vitest-environment jsdom
import { describe, it } from 'vitest';
import { createApp, ref } from '../src/index';

async function run(name, opts) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  try {
    await createApp(opts).mount(host);
    console.log('[' + name + '] -> ' + (host.innerHTML.replace(/\s+/g, ' ').trim() || '(空)'));
  } catch (e) {
    console.log('[' + name + '] FAIL -> ' + String(e.message).slice(0, 110));
  }
  host.remove();
}

describe('probe', () => {
  it('setup 返回值在模板中的表现', async () => {
    // 1. 纯字符串
    await run('1 字符串', { setup: () => ({ msg: 'world' }), template: '<div>{{ msg }}</div>' });
    // 2. 纯数字
    await run('2 数字', { setup: () => ({ n: 42 }), template: '<div>{{ n }}</div>' });
    // 3. 字符串 + 数字（同模板）
    await run('3 两者', {
      setup: () => ({ msg: 'world', n: 42 }),
      template: '<div>{{ msg }}|{{ n }}</div>',
    });
    // 4. ref
    await run('4 ref', { setup: () => ({ msg: ref('world') }), template: '<div>{{ msg }}</div>' });
    // 5. 静态文本对照
    await run('5 静态', { setup: () => ({}), template: '<div>STATIC</div>' });
    // 6. 单插值（无其他）
    await run('6 单独插值', { setup: () => ({ msg: 'world' }), template: '<div>{{ msg }}</div>' });
  });
});
