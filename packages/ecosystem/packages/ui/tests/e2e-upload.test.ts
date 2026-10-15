// @vitest-environment jsdom
/**
 * 行为级判据：`Upload` 的交互与文件管理
 *
 * ## 为什么要有这条
 *
 * `Upload`（299 行）已随包发布，覆盖率实测仅 ~25%（225 条语句未覆盖）——
 * 选择添加 / limit / beforeUpload / 拖拽 / XHR 上传进度与成败 / 移除
 * 六条主路径均未被真挂载验证过。
 *
 * ⚠️ 已登记的设计怪癖（按真实行为断言，修复走单独决策，勿顺手改）：
 *  A) `inputRef = { current: null }`（:37）不符合 vdom setRef 协议
 *     （patch-element.ts:185 只认字符串 / 函数 / 含 `value` 键的对象）
 *     ⇒ ref 永不赋值、`inputRef.current` 恒 null
 *     ⇒ 点击 trigger 区**打不开文件选择框**（:170 空操作）。
 *  B) `xhr.onload` 里 `JSON.parse(xhr.responseText)`（:109-110）若遇非法 JSON
 *     会同步抛出——而 try/catch（:87-136）只包住**发起**阶段，回调里的异常
 *     无人捕获 ⇒ 状态卡在 `uploading`、`onError` 不触发。
 *  C) 达到 `limit` 时 `uploadFile` 静默 return（:56-58）——没有任何回调
 *     （无 onExceed / onError），调用方无从感知文件被拒。
 *  D) `handleRemove`（:139）不 abort 进行中的 XHR：文件从列表消失后，
 *     xhr 回调仍会改写该 file 对象并 `files.set([...files()])` 触发 onChange。
 *  E) `disabled` 只挡 `handleClick`（:169），`handleDrop` 不检查（:155）
 *     ⇒ 禁用态仍可拖拽上传。
 *  F) `multiple=false` 只透传到 input 属性（:268），`handleDrop` 不限制数量
 *     ⇒ 单选语义无拖拽守卫，拖入多文件会全部入列。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { Upload, type UploadFile } from '../src/components/Upload';

const hosts: HTMLElement[] = [];

/** 可控假 XHR：实例入列，测试手动驱动 progress/load/error */
class FakeXHR {
  static instances: FakeXHR[] = [];
  upload: {
    onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null;
  } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  status = 0;
  responseText = '';
  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn();
  constructor() {
    FakeXHR.instances.push(this);
  }
  progress(loaded: number, total: number): void {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total });
  }
  respond(status: number, body: string): void {
    this.status = status;
    this.responseText = body;
    this.onload?.();
  }
  fail(): void {
    this.onerror?.();
  }
}

beforeEach(() => {
  FakeXHR.instances = [];
  vi.stubGlobal('XMLHttpRequest', FakeXHR);
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const x of hosts.splice(0)) x.remove();
});

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function makeFile(name = 'a.txt', size = 4): File {
  return new File(['x'.repeat(size)], name, { type: 'text/plain' });
}

/** 触发 input change 选择文件（jsdom 无法构造 FileList，defineProperty 覆盖） */
function selectFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** 触发 drop；返回 preventDefault 的 spy 供断言 */
function dropFiles(trigger: HTMLElement, files: File[]): ReturnType<typeof vi.spyOn> {
  const e = new Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'dataTransfer', { value: { files } });
  const spy = vi.spyOn(e, 'preventDefault');
  trigger.dispatchEvent(e);
  return spy;
}

async function mountUpload(
  props: Record<string, unknown> = {},
  slots?: Record<string, (...args: never[]) => unknown>,
): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({
    setup() {
      return () => h(Upload as never, { ...props }, slots as never);
    },
  } as never).mount(host);
  await flush();
  return host;
}

const getInput = (host: HTMLElement): HTMLInputElement =>
  host.querySelector('input.lyt-upload__input')!;
const getTrigger = (host: HTMLElement): HTMLElement => host.querySelector('.lyt-upload__trigger')!;
const fileNames = (host: HTMLElement): string[] =>
  [...host.querySelectorAll('.lyt-upload__file-name')].map((x) => x.textContent ?? '');

describe('Upload · 渲染', () => {
  it('默认渲染：根类 / file input / trigger 默认文案与图标', async () => {
    const host = await mountUpload();
    expect(host.querySelector('.lyt-upload')).toBeTruthy();
    const input = getInput(host);
    expect(input.type).toBe('file');
    expect(host.textContent).toContain('点击上传或拖拽文件');
    expect(host.querySelector('.lyt-upload__icon')).toBeTruthy();
  });

  it('accept / multiple 透传到 input 属性', async () => {
    const host = await mountUpload({ accept: '.png', multiple: true });
    const input = getInput(host);
    expect(input.getAttribute('accept')).toBe('.png');
    expect(input.multiple).toBe(true);
  });

  it('disabled 落 is-disabled 根类；class 透传', async () => {
    const host = await mountUpload({ disabled: true, class: 'my-up' });
    const root = host.querySelector('.lyt-upload')!;
    expect(root.className).toContain('lyt-upload--disabled');
    expect(root.className).toContain('my-up');
  });

  it('trigger 插槽优先于 default 插槽', async () => {
    const host = await mountUpload(
      {},
      {
        trigger: (() => [h('em', {}, 'TRIG')]) as never,
        default: (() => [h('b', {}, 'DEF')]) as never,
      },
    );
    expect(host.textContent).toContain('TRIG');
    expect(host.textContent).not.toContain('DEF');
  });

  it('default 插槽在无 trigger 时使用', async () => {
    const host = await mountUpload({}, { default: (() => [h('b', {}, 'DEF')]) as never });
    expect(host.textContent).toContain('DEF');
    expect(host.textContent).not.toContain('点击上传或拖拽文件');
  });

  it('tip 插槽渲染 .lyt-upload__tip', async () => {
    const host = await mountUpload({}, { tip: (() => [h('i', {}, 'TIP')]) as never });
    expect(host.querySelector('.lyt-upload__tip')?.textContent).toContain('TIP');
  });

  it('无文件时不渲染 .lyt-upload__list，有文件后出现', async () => {
    const onChange = vi.fn();
    const host = await mountUpload({ autoUpload: false, onChange });
    expect(host.querySelector('.lyt-upload__list')).toBeNull();
    selectFiles(getInput(host), [makeFile()]);
    await flush();
    expect(host.querySelector('.lyt-upload__list')).toBeTruthy();
  });
});

describe('Upload · 文件添加（autoUpload=false）', () => {
  it('change 选择文件：pending 状态入列、文件名展示、onChange 带 files', async () => {
    const onChange = vi.fn();
    const host = await mountUpload({ autoUpload: false, onChange });
    selectFiles(getInput(host), [makeFile('hello.txt', 6)]);
    await flush();
    expect(fileNames(host)).toEqual(['hello.txt']);
    const item = host.querySelector('.lyt-upload__file')!;
    expect(item.className).toContain('lyt-upload__file--pending');
    expect(onChange).toHaveBeenCalledTimes(1);
    const list = onChange.mock.calls[0]![0] as UploadFile[];
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: 'hello.txt', size: 6, status: 'pending' });
  });

  it('选择后 input.value 被清空（不抛错且保持空）', async () => {
    const host = await mountUpload({ autoUpload: false });
    const input = getInput(host);
    selectFiles(input, [makeFile()]);
    await flush();
    expect(input.value).toBe('');
  });

  it('一次选择多个文件全部入列', async () => {
    const host = await mountUpload({ autoUpload: false, multiple: true });
    selectFiles(getInput(host), [makeFile('a.txt'), makeFile('b.txt'), makeFile('c.txt')]);
    await flush();
    expect(fileNames(host)).toEqual(['a.txt', 'b.txt', 'c.txt']);
  });

  it('怪癖 C：达到 limit 静默拒绝 —— 文件不入列且无任何回调', async () => {
    const onChange = vi.fn();
    const onError = vi.fn();
    const host = await mountUpload({ autoUpload: false, limit: 1, onChange, onError });
    selectFiles(getInput(host), [makeFile('a.txt')]);
    await flush();
    selectFiles(getInput(host), [makeFile('b.txt')]);
    await flush();
    expect(fileNames(host)).toEqual(['a.txt']);
    expect(onChange).toHaveBeenCalledTimes(1); // 第二次无 onChange
    expect(onError).not.toHaveBeenCalled(); // 也没有任何拒绝通知
  });

  it('beforeUpload 返回 false 阻止添加', async () => {
    const beforeUpload = vi.fn().mockResolvedValue(false);
    const host = await mountUpload({ autoUpload: false, beforeUpload });
    selectFiles(getInput(host), [makeFile()]);
    await flush();
    expect(beforeUpload).toHaveBeenCalledTimes(1);
    expect(fileNames(host)).toEqual([]);
  });

  it('beforeUpload 返回 true 放行', async () => {
    const beforeUpload = vi.fn().mockResolvedValue(true);
    const host = await mountUpload({ autoUpload: false, beforeUpload });
    selectFiles(getInput(host), [makeFile('ok.txt')]);
    await flush();
    expect(fileNames(host)).toEqual(['ok.txt']);
  });

  it('移除 ×：onRemove + onChange，DOM 同步消失', async () => {
    const onRemove = vi.fn();
    const onChange = vi.fn();
    const host = await mountUpload({ autoUpload: false, onRemove, onChange });
    selectFiles(getInput(host), [makeFile('a.txt'), makeFile('b.txt')]);
    await flush();
    onChange.mockClear();
    host.querySelector<HTMLElement>('.lyt-upload__remove')!.click();
    await flush();
    expect(fileNames(host)).toEqual(['b.txt']);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect((onRemove.mock.calls[0]![0] as UploadFile).name).toBe('a.txt');
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('Upload · trigger 点击（怪癖 A）', () => {
  it('怪癖 A：点击 trigger 不触发 input.click —— inputRef 协议不匹配恒 null', async () => {
    const host = await mountUpload();
    const input = getInput(host);
    const clickSpy = vi.spyOn(input, 'click');
    getTrigger(host).click();
    await flush();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('disabled 时点击 trigger 同样不触发（handleClick 直接 return）', async () => {
    const host = await mountUpload({ disabled: true });
    const clickSpy = vi.spyOn(getInput(host), 'click');
    getTrigger(host).click();
    await flush();
    expect(clickSpy).not.toHaveBeenCalled();
  });
});

describe('Upload · 拖拽', () => {
  it('dragover：preventDefault + 落 is-dragover 类', async () => {
    const host = await mountUpload();
    const trigger = getTrigger(host);
    const e = new Event('dragover', { bubbles: true, cancelable: true });
    const spy = vi.spyOn(e, 'preventDefault');
    trigger.dispatchEvent(e);
    await flush();
    expect(spy).toHaveBeenCalled();
    expect(host.querySelector('.lyt-upload')!.className).toContain('lyt-upload--dragover');
  });

  it('dragleave：去除 is-dragover 类', async () => {
    const host = await mountUpload();
    const trigger = getTrigger(host);
    trigger.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    await flush();
    trigger.dispatchEvent(new Event('dragleave', { bubbles: true }));
    await flush();
    expect(host.querySelector('.lyt-upload')!.className).not.toContain('lyt-upload--dragover');
  });

  it('drop：preventDefault + 文件入列 + 去除 dragover 类', async () => {
    const onChange = vi.fn();
    const host = await mountUpload({ autoUpload: false, onChange });
    const trigger = getTrigger(host);
    trigger.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    await flush();
    const spy = dropFiles(trigger, [makeFile('d.txt')]);
    await flush();
    expect(spy).toHaveBeenCalled();
    expect(fileNames(host)).toEqual(['d.txt']);
    expect(host.querySelector('.lyt-upload')!.className).not.toContain('lyt-upload--dragover');
    expect(onChange).toHaveBeenCalled();
  });

  it('怪癖 E：disabled 时 drop 仍然上传（只挡点击不挡拖拽）', async () => {
    const host = await mountUpload({ autoUpload: false, disabled: true });
    dropFiles(getTrigger(host), [makeFile('evil.txt')]);
    await flush();
    expect(fileNames(host)).toEqual(['evil.txt']);
  });

  it('怪癖 F：multiple=false 时 drop 多文件仍全部入列', async () => {
    const host = await mountUpload({ autoUpload: false, multiple: false });
    dropFiles(getTrigger(host), [makeFile('a.txt'), makeFile('b.txt')]);
    await flush();
    expect(fileNames(host)).toEqual(['a.txt', 'b.txt']);
  });
});

describe('Upload · XHR 上传', () => {
  it('autoUpload + action：POST 到 action、headers 与 data 透传、状态转 uploading', async () => {
    const host = await mountUpload({
      action: '/up',
      headers: { 'X-Token': 't1' },
      data: { extra: 'v1' },
    });
    selectFiles(getInput(host), [makeFile('f.txt')]);
    await flush();
    expect(FakeXHR.instances).toHaveLength(1);
    const xhr = FakeXHR.instances[0]!;
    expect(xhr.open).toHaveBeenCalledWith('POST', '/up');
    expect(xhr.setRequestHeader).toHaveBeenCalledWith('X-Token', 't1');
    const fd = xhr.send.mock.calls[0]![0] as FormData;
    expect((fd.get('file') as File).name).toBe('f.txt');
    expect(fd.get('extra')).toBe('v1');
    expect(host.querySelector('.lyt-upload__file')!.className).toContain(
      'lyt-upload__file--uploading',
    );
    expect(host.querySelector('.lyt-upload__progress')).toBeTruthy();
  });

  it('progress 事件：percentage 更新、onProgress 回调、进度条 width', async () => {
    const onProgress = vi.fn();
    const host = await mountUpload({ action: '/up', onProgress });
    selectFiles(getInput(host), [makeFile()]);
    await flush();
    FakeXHR.instances[0]!.progress(50, 100);
    await flush();
    expect(onProgress).toHaveBeenCalledWith(50, expect.objectContaining({ status: 'uploading' }));
    const bar = host.querySelector<HTMLElement>('.lyt-upload__progress-bar')!;
    expect(bar.style.width).toBe('50%');
    expect(host.querySelector('.lyt-upload__percentage')!.textContent).toContain('50%');
  });

  it('2xx 响应：success 状态、onSuccess 带解析 JSON 与 url、类名切换', async () => {
    const onSuccess = vi.fn();
    const onChange = vi.fn();
    const host = await mountUpload({ action: '/up', onSuccess, onChange });
    selectFiles(getInput(host), [makeFile()]);
    await flush();
    FakeXHR.instances[0]!.respond(200, '{"url":"http://cdn/f.txt"}');
    await flush();
    expect(onSuccess).toHaveBeenCalledWith(
      { url: 'http://cdn/f.txt' },
      expect.objectContaining({ status: 'success', url: 'http://cdn/f.txt', percentage: 100 }),
    );
    expect(host.querySelector('.lyt-upload__file')!.className).toContain(
      'lyt-upload__file--success',
    );
    expect(host.querySelector('.lyt-upload__progress')).toBeNull();
    expect(onChange).toHaveBeenCalled();
  });

  it('非 2xx 响应：error 状态 + onError(Upload failed)', async () => {
    const onError = vi.fn();
    const host = await mountUpload({ action: '/up', onError });
    selectFiles(getInput(host), [makeFile()]);
    await flush();
    FakeXHR.instances[0]!.respond(500, '{}');
    await flush();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Upload failed' }),
      expect.objectContaining({ status: 'error' }),
    );
    expect(host.querySelector('.lyt-upload__file')!.className).toContain('lyt-upload__file--error');
  });

  it('网络错误：onerror → error 状态 + onError(Network error)', async () => {
    const onError = vi.fn();
    await mountUpload({ action: '/up', onError });
    const host = hosts[0]!;
    selectFiles(getInput(host), [makeFile()]);
    await flush();
    FakeXHR.instances[0]!.fail();
    await flush();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Network error' }),
      expect.objectContaining({ status: 'error' }),
    );
  });

  it('怪癖 B：2xx 但非法 JSON ⇒ onload 同步抛错、状态卡 uploading、onError 不调', async () => {
    const onError = vi.fn();
    const onSuccess = vi.fn();
    const host = await mountUpload({ action: '/up', onError, onSuccess });
    selectFiles(getInput(host), [makeFile()]);
    await flush();
    const xhr = FakeXHR.instances[0]!;
    expect(() => xhr.respond(200, 'not-json')).toThrow();
    await flush();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(host.querySelector('.lyt-upload__file')!.className).toContain(
      'lyt-upload__file--uploading',
    );
  });

  it('怪癖 D：移除上传中的文件不 abort XHR —— 回调仍触发 onChange', async () => {
    const onChange = vi.fn();
    const onRemove = vi.fn();
    const host = await mountUpload({ action: '/up', onChange, onRemove });
    selectFiles(getInput(host), [makeFile()]);
    await flush();
    host.querySelector<HTMLElement>('.lyt-upload__remove')!.click();
    await flush();
    expect(fileNames(host)).toEqual([]);
    expect(onRemove).toHaveBeenCalled();
    onChange.mockClear();
    FakeXHR.instances[0]!.respond(200, '{"url":"u"}');
    await flush();
    // XHR 未被 abort：成功回调照常跑，原地改 file 并再次广播 onChange
    expect(onChange).toHaveBeenCalled();
  });

  it('autoUpload=false 不发 XHR；无 action 也不发', async () => {
    const h1 = await mountUpload({ autoUpload: false, action: '/up' });
    selectFiles(getInput(h1), [makeFile()]);
    await flush();
    const h2 = await mountUpload({ autoUpload: true, action: '' });
    selectFiles(getInput(h2), [makeFile()]);
    await flush();
    expect(FakeXHR.instances).toHaveLength(0);
  });
});
