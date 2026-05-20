/**
 * @lytjs/ui - Upload 组件
 *
 * 文件上传组件，支持拖拽上传、文件预览、进度显示、分片上传
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { UploadFile, UploadSetupProps, UploadSlots } from './types';

export const Upload = defineComponent({
  name: 'LytUpload',

  props: {
    action: { type: String, default: '' },
    headers: { type: Object, default: (): Record<string, string> => ({}) },
    data: { type: Object, default: (): Record<string, unknown> => ({}) },
    multiple: { type: Boolean, default: false },
    accept: { type: String, default: '' },
    autoUpload: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    limit: { type: Number, default: 0 },
    class: { type: String, default: '' },
    onChange: { type: Function, default: undefined },
    onSuccess: { type: Function, default: undefined },
    onError: { type: Function, default: undefined },
    onProgress: { type: Function, default: undefined },
    onRemove: { type: Function, default: undefined },
    beforeUpload: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: UploadSlots }) {
    const p = props as UploadSetupProps;
    const files = signal<UploadFile[]>([]);
    const dragOver = signal(false);
    const inputRef = { current: null as HTMLInputElement | null };

    let uid = 0;
    const generateUid = () => ++uid;

    const handleFileChange = async (event: Event) => {
      const input = event.target as HTMLInputElement;
      const fileList = input.files;
      if (!fileList) return;

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file) await uploadFile(file);
      }

      input.value = '';
    };

    const uploadFile = async (file: File) => {
      if (p.limit > 0 && files().length >= p.limit) {
        return;
      }

      if (p.beforeUpload) {
        const result = await p.beforeUpload(file);
        if (result === false) return;
      }

      const newFile: UploadFile = {
        name: file.name,
        size: file.size,
        status: 'pending',
        uid: generateUid(),
        raw: file,
      };

      files.set([...files(), newFile]);
      p.onChange?.(files());

      if (p.autoUpload && p.action) {
        await uploadToServer(newFile);
      }
    };

    const uploadToServer = async (file: UploadFile) => {
      file.status = 'uploading';
      file.percentage = 0;
      files.set([...files()]);
      p.onChange?.(files());

      try {
        const formData = new FormData();
        formData.append('file', file.raw!);

        for (const [key, value] of Object.entries(p.data)) {
          formData.append(key, String(value));
        }

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            file.percentage = Math.round((e.loaded / e.total) * 100);
            files.set([...files()]);
            p.onProgress?.(file.percentage!, file);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            file.status = 'success';
            file.percentage = 100;
            file.url = JSON.parse(xhr.responseText).url;
            p.onSuccess?.(JSON.parse(xhr.responseText), file);
          } else {
            file.status = 'error';
            p.onError?.(new Error('Upload failed'), file);
          }
          files.set([...files()]);
          p.onChange?.(files());
        };

        xhr.onerror = () => {
          file.status = 'error';
          files.set([...files()]);
          p.onError?.(new Error('Network error'), file);
          p.onChange?.(files());
        };

        xhr.open('POST', p.action);
        for (const [key, value] of Object.entries(p.headers)) {
          xhr.setRequestHeader(key, value);
        }
        xhr.send(formData);
      } catch (error) {
        file.status = 'error';
        files.set([...files()]);
        p.onError?.(error as Error, file);
        p.onChange?.(files());
      }
    };

    const handleRemove = (file: UploadFile) => {
      const newFiles = files().filter((f) => f.uid !== file.uid);
      files.set(newFiles);
      p.onRemove?.(file);
      p.onChange?.(files());
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      dragOver.set(true);
    };

    const handleDragLeave = () => {
      dragOver.set(false);
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragOver.set(false);

      const fileList = e.dataTransfer?.files;
      if (!fileList) return;

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file) await uploadFile(file);
      }
    };

    const handleClick = () => {
      if (p.disabled) return;
      inputRef.current?.click();
    };

    const renderFile = (file: UploadFile): VNode => {
      const statusClass = `lyt-upload__file--${file.status}`;
      const fileChildren: VNode[] = [];

      if (slots.file) {
        fileChildren.push(...slots.file(file));
      } else {
        fileChildren.push(
          createVNode('span', { class: 'lyt-upload__file-name' }, [
            createVNode('span', {}, String(file.name)),
          ]),
        );
      }

      if (file.status === 'uploading') {
        fileChildren.push(
          createVNode('div', { class: 'lyt-upload__progress' }, [
            createVNode(
              'div',
              {
                class: 'lyt-upload__progress-bar',
                style: `width: ${file.percentage || 0}%`,
              },
              [],
            ),
            createVNode('span', { class: 'lyt-upload__percentage' }, [
              createVNode('span', {}, `${file.percentage || 0}%`),
            ]),
          ]),
        );
      }

      fileChildren.push(
        createVNode(
          'span',
          {
            class: 'lyt-upload__remove',
            onClick: () => handleRemove(file),
          },
          [createVNode('span', {}, '×')],
        ),
      );

      return createVNode(
        'div',
        { class: `lyt-upload__file ${statusClass}`, key: file.uid },
        fileChildren,
      );
    };

    return () => {
      const uploadClass = [
        'lyt-upload',
        p.disabled ? 'lyt-upload--disabled' : '',
        dragOver() ? 'lyt-upload--dragover' : '',
        p.class,
      ]
        .filter(Boolean)
        .join(' ');

      const triggerContent: VNode[] = [];

      if (slots.trigger) {
        triggerContent.push(...slots.trigger());
      } else if (slots.default) {
        triggerContent.push(...slots.default());
      } else {
        triggerContent.push(
          createVNode('div', { class: 'lyt-upload__content' }, [
            createVNode('span', { class: 'lyt-upload__icon' }, [createVNode('span', {}, '📤')]),
            createVNode('span', { class: 'lyt-upload__text' }, [
              createVNode('span', {}, '点击上传或拖拽文件'),
            ]),
          ]),
        );
      }

      const tipContent: VNode[] = [];
      if (slots.tip) {
        tipContent.push(...slots.tip());
      }

      const fileListContent: VNode[] = [];
      if (files().length > 0) {
        fileListContent.push(...files().map((file) => renderFile(file)));
      }

      const children: VNode[] = [
        createVNode(
          'input',
          {
            ref: inputRef,
            type: 'file',
            class: 'lyt-upload__input',
            accept: p.accept,
            multiple: p.multiple,
            onChange: handleFileChange,
          },
          [],
        ),
        createVNode(
          'div',
          {
            class: 'lyt-upload__trigger',
            onClick: handleClick,
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: handleDrop,
          },
          triggerContent,
        ),
      ];

      if (tipContent.length > 0) {
        children.push(createVNode('div', { class: 'lyt-upload__tip' }, tipContent));
      }

      if (fileListContent.length > 0) {
        children.push(createVNode('div', { class: 'lyt-upload__list' }, fileListContent));
      }

      return createVNode('div', { class: uploadClass }, children);
    };
  },
});

export type { UploadProps, UploadSlots, UploadFile, UploadSetupProps } from './types';
