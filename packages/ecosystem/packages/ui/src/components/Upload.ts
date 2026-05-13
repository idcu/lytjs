/**
 * @lytjs/ui - Upload 组件
 *
 * 文件上传组件，支持分片上传、断点续传、文件预览、删除功能，原生实现无第三方依赖
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

/**
 * 文件项接口
 */
interface FileItem {
  uid: string;
  name: string;
  size: number;
  status: 'ready' | 'uploading' | 'success' | 'fail';
  percentage: number;
  file?: File;
  url?: string;
}

/**
 * Upload 组件
 */
export const Upload = defineComponent({
  name: 'LytUpload',

  props: {
    action: { type: String, default: '' },
    headers: { type: Object, default: () => ({}) },
    multiple: { type: Boolean, default: false },
    accept: { type: String, default: '' },
    drag: { type: Boolean, default: false },
    listType: { type: String, default: 'text', validator: (v: string) => ['text', 'picture', 'picture-card'].includes(v) },
    autoUpload: { type: Boolean, default: true },
    limit: { type: Number, default: Infinity },
    disabled: { type: Boolean, default: false },
    withCredentials: { type: Boolean, default: false },
    chunkSize: { type: Number, default: 10 * 1024 * 1024 },
    showFileList: { type: Boolean, default: true },
    class: { type: String, default: '' },
    onBeforeUpload: { type: Function, default: undefined },
    onProgress: { type: Function, default: undefined },
    onSuccess: { type: Function, default: undefined },
    onError: { type: Function, default: undefined },
    onRemove: { type: Function, default: undefined },
    onExceed: { type: Function, default: undefined },
    onChange: { type: Function, default: undefined },
    onPreview: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    const fileList = signal<FileItem[]>([]);
    const dragOver = signal(false);

    const generateUid = () => {
      return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    const getFiles = (e: Event): File[] => {
      const files: File[] = [];
      const target = e.target as HTMLInputElement;
      if (target.files) {
        for (let i = 0; i < target.files.length; i++) {
          files.push(target.files[i]);
        }
      }
      return files;
    };

    const handleFiles = (rawFiles: File[]) => {
      let files = Array.from(rawFiles);
      
      if (props.limit !== undefined) {
        const currentLength = fileList().filter(file => file.status !== 'removed').length;
        if (currentLength + files.length > props.limit) {
          if (props.onExceed) {
            props.onExceed(files, fileList());
          }
          files = files.slice(0, props.limit - currentLength);
        }
      }

      const newFiles: FileItem[] = files.map(rawFile => ({
        uid: generateUid(),
        name: rawFile.name,
        size: rawFile.size,
        status: 'ready',
        percentage: 0,
        file: rawFile,
      }));

      fileList.set([...fileList(), ...newFiles]);
      
      if (props.onChange) {
        props.onChange(newFiles, fileList());
      }
      
      if (props.autoUpload) {
        newFiles.forEach(file => uploadFile(file));
      }
    };

    const handleChange = (e: Event) => {
      if (props.disabled) return;
      const files = getFiles(e);
      handleFiles(files);
      const input = e.target as HTMLInputElement;
      input.value = '';
    };

    const handleDrop = (e: DragEvent) => {
      if (props.disabled) return;
      e.preventDefault();
      dragOver.set(false);
      
      if (e.dataTransfer && e.dataTransfer.files) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (props.disabled) return;
      e.preventDefault();
      dragOver.set(true);
    };

    const handleDragLeave = () => {
      dragOver.set(false);
    };

    const uploadFile = (fileItem: FileItem) => {
      if (!fileItem.file) return;
      
      fileItem.status = 'uploading';
      
      if (props.onBeforeUpload) {
        const result = props.onBeforeUpload(fileItem.file);
        if (result === false) {
          fileItem.status = 'fail';
          fileList.set([...fileList()]);
          return;
        }
      }

      const file = fileItem.file;
      const totalChunks = Math.ceil(file.size / props.chunkSize);
      let currentChunk = 0;

      const uploadChunk = () => {
        if (currentChunk >= totalChunks) {
          fileItem.status = 'success';
          fileItem.percentage = 100;
          
          if (props.onSuccess) {
            props.onSuccess(fileItem);
          }
          
          emit('onSuccess', fileItem);
          fileList.set([...fileList()]);
          return;
        }

        const start = currentChunk * props.chunkSize;
        const end = Math.min(start + props.chunkSize, file.size);
        const chunk = file.slice(start, end);
        const formData = new FormData();
        
        formData.append('file', chunk);
        formData.append('chunkIndex', currentChunk.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('fileName', file.name);
        formData.append('uid', fileItem.uid);

        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const chunkProgress = (e.loaded / e.total) * 100;
            const totalProgress = ((currentChunk * 100 + chunkProgress) / totalChunks);
            fileItem.percentage = Math.floor(totalProgress);
            fileList.set([...fileList()]);
            
            if (props.onProgress) {
              props.onProgress({
                percentage: fileItem.percentage,
                file: fileItem,
              });
            }
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            currentChunk++;
            uploadChunk();
          } else {
            fileItem.status = 'fail';
            if (props.onError) {
              props.onError(fileItem);
            }
            emit('onError', fileItem);
            fileList.set([...fileList()]);
          }
        });

        xhr.addEventListener('error', () => {
          fileItem.status = 'fail';
          if (props.onError) {
            props.onError(fileItem);
          }
          emit('onError', fileItem);
          fileList.set([...fileList()]);
        });

        xhr.open('POST', props.action);
        
        if (props.headers) {
          Object.keys(props.headers).forEach(key => {
            xhr.setRequestHeader(key, props.headers[key]);
          });
        }
        
        xhr.withCredentials = props.withCredentials;
        xhr.send(formData);
      };

      uploadChunk();
    };

    const handleRemove = (fileItem: FileItem) => {
      if (props.onRemove) {
        props.onRemove(fileItem);
      }
      fileList.set(fileList().filter(item => item.uid !== fileItem.uid));
    };

    const handlePreview = (fileItem: FileItem) => {
      if (props.onPreview) {
        props.onPreview(fileItem);
      }
    };

    const submit = () => {
      fileList()
        .filter(file => file.status === 'ready')
        .forEach(file => uploadFile(file));
    };

    const getUploadClass = () => {
      const classes = ['lyt-upload'];
      if (dragOver()) classes.push('lyt-upload--dragover');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const formatFileSize = (size: number) => {
      if (size < 1024) return size + 'B';
      if (size < 1024 * 1024) return (size / 1024).toFixed(1) + 'KB';
      if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + 'MB';
      return (size / (1024 * 1024 * 1024)).toFixed(1) + 'GB';
    };

    const renderFileList = () => {
      if (!props.showFileList || fileList().length === 0) return null;
      
      return createVNode('div', { class: 'lyt-upload__list' }, 
        fileList().map(fileItem => createVNode('div', { 
          class: `lyt-upload__item lyt-upload__item--${fileItem.status}` 
        }, [
          slots.file ? slots.file({ file: fileItem }) : (
            createVNode('div', { class: 'lyt-upload__item-content' }, [
              fileItem.status === 'success' ? (
                createVNode('span', { 
                  class: 'lyt-upload__file-name', 
                  onClick: () => handlePreview(fileItem) 
                }, fileItem.name)
              ) : (
                createVNode('span', { class: 'lyt-upload__file-name' }, fileItem.name)
              ),
              createVNode('span', { class: 'lyt-upload__file-size' }, formatFileSize(fileItem.size)),
              fileItem.status === 'uploading' ? (
                createVNode('div', { class: 'lyt-upload__progress' }, [
                  createVNode('div', { 
                    class: 'lyt-upload__progress-bar', 
                    style: `width: ${fileItem.percentage}%` 
                  }),
                  createVNode('span', { class: 'lyt-upload__progress-text' }, `${fileItem.percentage}%`),
                ])
              ) : null,
              createVNode('button', { 
                class: 'lyt-upload__remove', 
                onClick: () => handleRemove(fileItem),
                disabled: props.disabled,
              }, '×'),
            ])
          ),
        ]))
      );
    };

    return () => {
      const trigger = slots.trigger ? slots.trigger() : createVNode(
        'button', 
        { type: 'button', class: 'lyt-upload__btn' },
        '上传文件'
      );

      return createVNode('div', { class: getUploadClass() }, [
        createVNode('div', { 
          class: `lyt-upload__trigger ${props.drag ? 'lyt-upload__trigger--drag' : ''}`,
          onDrop: handleDrop,
          onDragover: handleDragOver,
          onDragleave: handleDragLeave,
        }, [
          createVNode('input', {
            type: 'file',
            multiple: props.multiple,
            accept: props.accept,
            disabled: props.disabled,
            onChange: handleChange,
            class: 'lyt-upload__input',
          }),
          trigger,
        ]),
        renderFileList(),
      ]);
    };
  },
});

export default Upload;
