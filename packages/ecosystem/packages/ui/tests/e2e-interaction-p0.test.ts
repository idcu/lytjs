// @vitest-environment jsdom
/**
 * UI 交互 P0 回归电池（2026-10-27）
 *
 * 六条都是「组件能渲染、但交互静默失效」的形态 —— 只看快照或断言「渲染出了某个 class」
 * 永远发现不了，必须**真的点一下**：
 *
 * | 组件 | 缺陷 | 症状 |
 * |---|---|---|
 * | Modal / Drawer | 内容区不阻止冒泡 | 点正文/输入框 → 弹层关闭，输入丢失 |
 * | Modal / Drawer / Dialog | 从不回写 `v-model` | 点 × / 遮罩 / Esc → 弹层不消失 |
 * | Cascader | 选项点击冒泡到根再次 toggle | 单选不关 / 多选每选即关 |
 * | Popconfirm | hover 挂在 reference 上，气泡是兄弟节点 | 鼠标移进气泡就消失，点不到「确认」 |
 * | Upload / RichTextEditor | 用 `{ current }` 形态的 ref | 渲染器不识别 ⇒ 点上传不弹框、富文本读空串 |
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { Modal } from '../src/components/Modal';
import { Drawer } from '../src/components/Drawer';
import { Dialog } from '../src/components/Dialog';
import { Cascader } from '../src/components/Cascader';
import { Popconfirm } from '../src/components/Popconfirm';
import { Upload } from '../src/components/Upload';
import { RichTextEditor } from '../src/components/RichTextEditor';

const hosts: HTMLElement[] = [];

const tick = (n = 30): Promise<void> => new Promise((r) => setTimeout(r, n));

/**
 * 挂载辅助。
 *
 * ⚠️ 必须用 `createApp({ setup() { return () => vnode } })` 并 **await mount** ——
 *   `mount` 是异步的，且首帧渲染在微任务里；直接 `{ render }` + 同步断言会拿到空 DOM。
 */
async function mount(render: () => unknown): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({
    setup() {
      return render as () => never;
    },
  } as never).mount(host);
  await tick();
  return host;
}

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
  vi.restoreAllMocks();
});

const click = (el: Element | null): void => {
  expect(el).toBeTruthy();
  el!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

const hover = (el: Element | null, type: 'mouseenter' | 'mouseleave'): void => {
  expect(el).toBeTruthy();
  el!.dispatchEvent(new MouseEvent(type, { bubbles: false }));
};

describe('Modal 交互（P0 回归）', () => {
  it('点击内容区不得关闭弹层', async () => {
    const onClose = vi.fn();
    const host = await mount(() =>
      h(
        Modal,
        { modelValue: true, title: 'T', closeOnClickModal: true, onClose },
        {
          default: () => h('input', { class: 'inner' }),
        },
      ),
    );

    click(host.querySelector('.lyt-modal__body'));
    expect(onClose).not.toHaveBeenCalled();

    // 遮罩本身仍然可以关闭
    click(host.querySelector('.lyt-modal__overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('关闭时必须回写 v-model（否则受控弹层关不掉）', async () => {
    const onUpdate = vi.fn();
    const host = await mount(() =>
      h(Modal, {
        modelValue: true,
        title: 'T',
        closeOnClickModal: true,
        'onUpdate:modelValue': onUpdate,
      }),
    );

    click(host.querySelector('.lyt-modal__overlay'));
    await tick();
    expect(onUpdate).toHaveBeenCalledWith(false);
  });
});

describe('Drawer 交互（P0 回归）', () => {
  // 注：Drawer 的 overlay 与 container 是**兄弟节点**（不像 Modal 那样包裹），
  // 所以「点内容触发遮罩关闭」在 Drawer 上本来就不成立 —— 这里只断言真正的缺陷：
  // 关闭时不回写 v-model。
  it('关闭时必须回写 v-model', async () => {
    const onClose = vi.fn();
    const onUpdate = vi.fn();
    const host = await mount(() =>
      h(Drawer, {
        modelValue: true,
        title: 'D',
        closeOnClickModal: true,
        onClose,
        'onUpdate:modelValue': onUpdate,
      }),
    );

    click(host.querySelector('.lyt-drawer__overlay'));
    await tick();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(false);
  });
});

describe('Dialog 交互（P0 回归）', () => {
  it('关闭时必须回写 v-model', async () => {
    const onUpdate = vi.fn();
    const host = await mount(() =>
      h(Dialog, {
        modelValue: true,
        title: 'T',
        closeOnClickModal: true,
        'onUpdate:modelValue': onUpdate,
      }),
    );

    click(host.querySelector('.lyt-dialog__overlay'));
    await tick();
    expect(onUpdate).toHaveBeenCalledWith(false);
  });
});

describe('Cascader 交互（P0 回归）', () => {
  const OPTIONS = [{ label: '浙江', value: 'zj', isLeaf: true }];

  it('单选选中叶子后应关闭，且不被冒泡重新打开', async () => {
    const host = await mount(() => h(Cascader, { options: OPTIONS }));

    click(host.querySelector('.lyt-cascader'));
    await tick();
    expect(host.querySelector('.lyt-cascader--open')).toBeTruthy();

    click(host.querySelector('.lyt-cascader__option'));
    await tick();
    expect(host.querySelector('.lyt-cascader--open')).toBeFalsy();
  });

  it('多选选中后应保持打开', async () => {
    const host = await mount(() => h(Cascader, { options: OPTIONS, multiple: true }));

    click(host.querySelector('.lyt-cascader'));
    await tick();
    click(host.querySelector('.lyt-cascader__option'));
    await tick();

    expect(host.querySelector('.lyt-cascader--open')).toBeTruthy();
  });
});

describe('Popconfirm 交互（P0 回归）', () => {
  it('鼠标从触发元素移入气泡时不得消失', async () => {
    const host = await mount(() =>
      h(
        Popconfirm,
        { title: '确定删除？' },
        {
          reference: () => h('button', { class: 'trigger' }, '删'),
        },
      ),
    );

    hover(host.querySelector('.lyt-popconfirm__reference'), 'mouseenter');
    await tick();
    expect(host.querySelector('.lyt-popconfirm__popup')).toBeTruthy();

    // 离开 reference（进入气泡的必经动作）—— 此时不应隐藏
    hover(host.querySelector('.lyt-popconfirm__reference'), 'mouseleave');
    await tick();
    expect(host.querySelector('.lyt-popconfirm__popup')).toBeTruthy();

    // 离开整个组件区域才隐藏
    hover(host.querySelector('.lyt-popconfirm'), 'mouseleave');
    await tick();
    expect(host.querySelector('.lyt-popconfirm__popup')).toBeFalsy();
  });
});

describe('Upload 交互（P0 回归）', () => {
  it('点击触发区应真的打开文件选择框（{ current } ref 曾导致恒为 null）', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const host = await mount(() => h(Upload));

    click(host.querySelector('.lyt-upload__trigger'));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});

describe('RichTextEditor 交互（P0 回归）', () => {
  it('输入后 onChange 必须拿到真实内容（{ current } ref 曾导致恒读空串）', async () => {
    const onChange = vi.fn();
    const host = await mount(() => h(RichTextEditor, { modelValue: '', onChange }));

    const content = host.querySelector('.lyt-rich-text-editor__content') as HTMLElement | null;
    expect(content).toBeTruthy();
    content!.innerHTML = '<b>hello</b>';
    content!.dispatchEvent(new Event('input', { bubbles: true }));

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1)?.[0];
    expect(String(lastCall)).toContain('hello');
  });
});
