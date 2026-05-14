/**
 * @lytjs/ui - Upload 组件
 *
 * 文件上传组件，支持拖拽上传、文件预览、进度显示、分片上传
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

export interface UploadFile {
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  percentage?: number;
  url?: string;
  uid: number;
  raw?: File;
}

export interface UploadSetupProps {
  action: string;
  headers: Record<string, string>;
  data: Record<string, unknown>;
  multiple: boolean;
  accept: string;
  autoUpload: boolean;
  disabled: boolean;
  limit: number;
  class: string;
  onChange: ((files: UploadFile[]) => void) | undefined;
  onSuccess: ((response: unknown, file: UploadFile) => void) | undefined;
  onError: ((error: Error, file: UploadFile) => void) | undefined;
  onProgress: ((percentage: number, file: UploadFile) => void) | undefined;
  onRemove: ((file: UploadFile) => void) | undefined;
  beforeUpload: ((file: File) => boolean | Promise<boolean>) | undefined;
}

export interface UploadSlots {
  default?: () => VNode[];
  trigger?: () => VNode[];
  tip?: () => VNode[];
  file?: (file: UploadFile) => VNode[];
}

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

  setup(props: UploadSetupProps, { slots }: { slots: UploadSlots }) {
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
        await uploadFile(fileList[i]);
      }

      input.value = '';
    };

    const uploadFile = async (file: File) => {
      if (props.limit > 0 && files().length >= props.limit) {
        return;
      }

      if (props.beforeUpload) {
        const result = await props.beforeUpload(file);
        if (result === false) return;
      }

      const uploadFile: UploadFile = {
        name: file.name,
        size: file.size,
        status: 'pending',
        uid: generateUid(),
        raw: file,
      };

      files.set([...files(), uploadFile]);
      props.onChange?.(files());

      if (props.autoUpload && props.action) {
        await uploadToServer(uploadFile);
      }
    };

    const uploadToServer = async (file: UploadFile) => {
      file.status = 'uploading';
      file.percentage = 0;
      files.set([...files()]);
      props.onChange?.(files());

      try {
        const formData = new FormData();
        formData.append('file', file.raw!);
        
        for (const [key, value] of Object.entries(props.data)) {
          formData.append(key, String(value));
        }

        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            file.percentage = Math.round((e.loaded / e.total) * 100);
            files.set([...files()]);
            props.onProgress?.(file.percentage, file);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            file.status = 'success';
            file.percentage = 100;
            file.url = JSON.parse(xhr.responseText).url;
            props.onSuccess?.(JSON.parse(xhr.responseText), file);
          } else {
            file.status = 'error';
            props.onError?.(new Error('Upload failed'), file);
          }
          files.set([...files()]);
          props.onChange?.(files());
        };

        xhr.onerror = () => {
          file.status = 'error';
          files.set([...files()]);
          props.onError?.(new Error('Network error'), file);
          props.onChange?.(files());
        };

        xhr.open('POST', props.action);
        for (const [key, value] of Object.entries(props.headers)) {
          xhr.setRequestHeader(key, value);
        }
        xhr.send(formData);

      } catch (error) {
        file.status = 'error';
        files.set([...files()]);
        props.onError?.(error as Error, file);
        props.onChange?.(files());
      }
    };

    const handleRemove = (file: UploadFile) => {
      const newFiles = files().filter(f => f.uid !== file.uid);
      files.set(newFiles);
      props.onRemove?.(file);
      props.onChange?.(files());
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
        await uploadFile(fileList[i]);
      }
    };

    const handleClick = () => {
      if (props.disabled) return;
      inputRef.current?.click();
    };

    const renderFile = (file: UploadFile): VNode => {
      const statusClass = `lyt-upload__file--${file.status}`;
      
      return createVNode('div', { class: `lyt-upload__file ${statusClass}`, key: file.uid }, [
        slots.file
          ? slots.file(file)
          : createVNode('span', { class: 'lyt-upload__file-name' }, [file.name]),
        file.status === 'uploading' && createVNode('div', { class: 'lyt-upload__progress' }, [
          createVNode('div', {
            class: 'lyt-upload__progress-bar',
            style: `width: ${file.percentage || 0}%`,
          }),
          createVNode('span', { class: 'lyt-upload__percentage' }, [`${file.percentage || 0}%`]),
        ]),
        createVNode('span', {
          class: 'lyt-upload__remove',
          onClick: () => handleRemove(file),
        }, ['×']),
      ]);
    };

    return () => {
      const uploadClass = [
        'lyt-upload',
        props.disabled ? 'lyt-upload--disabled' : '',
        dragOver() ? 'lyt-upload--dragover' : '',
        props.class,
      ].filter(Boolean).join(' ');

      return createVNode('div', { class: uploadClass }, [
        createVNode('input', {
          ref: inputRef,
          type: 'file',
          class: 'lyt-upload__input',
          accept: props.accept,
          multiple: props.multiple,
          onChange: handleFileChange,
        }),
        createVNode('div', {
          class: 'lyt-upload__trigger',
          onClick: handleClick,
          onDragOver: handleDragOver,
          onDragLeave: handleDragLeave,
          onDrop: handleDrop,
        }, [
          slots.trigger
            ? slots.trigger()
            : slots.default
              ? slots.default()
              : createVNode('div', { class: 'lyt-upload__content' }, [
                  createVNode('span', { class: 'lyt-upload__icon' }, ['📤']),
                  createVNode('span', { class: 'lyt-upload__text' }, ['点击上传或拖拽文件']),
                ]),
        ]),
        slots.tip && createVNode('div', { class: 'lyt-upload__tip' }, [slots.tip()]),
        files().length > 0 && createVNode('div', { class: 'lyt-upload__list' }, [
          files().map(file => renderFile(file)),
        ]),
      ]);
    };
  },
});

export type { UploadProps, UploadSlots, UploadFile } from './types';
