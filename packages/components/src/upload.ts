/**
 * Upload 文件上传
 * Props: action, headers, multiple, data, name, withCredentials, showFileList, drag, accept, listType, autoUpload, limit, fileList
 * Events: change, success, error, progress, remove, preview, exceed
 */

import { defineComponent } from '@lytjs/component'
import { reactive, watch } from '@lytjs/reactivity'

export interface UploadFile {
  name: string
  percentage?: number
  status?: 'ready' | 'uploading' | 'success' | 'fail'
  uid: number
  raw?: File
  response?: any
  error?: any
  url?: string
}

export const Upload = defineComponent({
  name: 'LytUpload',

  props: {
    action: {
      type: String,
      default: '',
    },
    headers: {
      type: Object,
      default: () => ({}),
    },
    multiple: {
      type: Boolean,
      default: false,
    },
    data: {
      type: Object,
      default: () => ({}),
    },
    name: {
      type: String,
      default: 'file',
    },
    withCredentials: {
      type: Boolean,
      default: false,
    },
    showFileList: {
      type: Boolean,
      default: true,
    },
    drag: {
      type: Boolean,
      default: false,
    },
    accept: {
      type: String,
      default: '',
    },
    listType: {
      type: String,
      default: 'text',
      validator: (v: string) => ['text', 'picture', 'picture-card'].includes(v),
    },
    autoUpload: {
      type: Boolean,
      default: true,
    },
    limit: {
      type: Number,
      default: 0,
    },
    fileList: {
      type: Array as () => UploadFile[],
      default: () => [],
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    tip: {
      type: String,
      default: '',
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      fileList: [...props.fileList] as UploadFile[],
      dragOver: false,
      uidCounter: Date.now(),
    })

    const getFileUid = () => {
      return state.uidCounter++
    }

    const handleFiles = (files: FileList) => {
      if (props.disabled) return

      const fileArray = Array.from(files)

      if (props.limit > 0 && state.fileList.length + fileArray.length > props.limit) {
        emit('exceed', fileArray, state.fileList)
        return
      }

      fileArray.forEach((file) => {
        const uploadFile: UploadFile = {
          name: file.name,
          percentage: 0,
          status: 'ready',
          uid: getFileUid(),
          raw: file,
        }
        state.fileList.push(uploadFile)

        if (props.autoUpload) {
          uploadFileItem(uploadFile)
        }
      })

      emit('change', state.fileList)
    }

    const uploadFileItem = (file: UploadFile) => {
      if (!file.raw) return

      file.status = 'uploading'
      emit('change', [...state.fileList])

      if (!props.action) {
        file.status = 'success'
        file.percentage = 100
        emit('success', {}, file, [...state.fileList])
        emit('change', [...state.fileList])
        return
      }

      const xhr = new XMLHttpRequest()
      const formData = new FormData()

      formData.append(props.name, file.raw)

      if (props.data) {
        Object.keys(props.data).forEach((key) => {
          formData.append(key, props.data[key])
        })
      }

      xhr.open('post', props.action)

      if (props.headers) {
        Object.keys(props.headers).forEach((key) => {
          xhr.setRequestHeader(key, props.headers[key])
        })
      }

      xhr.withCredentials = props.withCredentials

      xhr.upload.onprogress = (e) => {
        if (e.total > 0) {
          file.percentage = Math.round((e.loaded / e.total) * 100)
          emit('progress', { percentage: file.percentage }, file, [...state.fileList])
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          file.status = 'success'
          file.percentage = 100
          try {
            file.response = JSON.parse(xhr.responseText)
          } catch {
            file.response = xhr.responseText
          }
          emit('success', file.response, file, [...state.fileList])
        } else {
          file.status = 'fail'
          file.error = new Error(xhr.responseText)
          emit('error', file.error, file, [...state.fileList])
        }
        emit('change', [...state.fileList])
      }

      xhr.onerror = () => {
        file.status = 'fail'
        file.error = new Error('Network error')
        emit('error', file.error, file, [...state.fileList])
        emit('change', [...state.fileList])
      }

      xhr.send(formData)
    }

    const handleFileChange = (e: Event) => {
      const target = e.target as HTMLInputElement
      const files = target.files
      if (files && files.length > 0) {
        handleFiles(files)
      }
      target.value = ''
    }

    const handleRemove = (file: UploadFile) => {
      const index = state.fileList.findIndex((f) => f.uid === file.uid)
      if (index > -1) {
        state.fileList.splice(index, 1)
        emit('remove', file, [...state.fileList])
        emit('change', [...state.fileList])
      }
    }

    const handlePreview = (file: UploadFile) => {
      emit('preview', file)
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      state.dragOver = false
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!props.disabled) {
        state.dragOver = true
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      state.dragOver = false
    }

    const submit = () => {
      state.fileList
        .filter((file) => file.status === 'ready')
        .forEach((file) => {
          uploadFileItem(file)
        })
    }

    const abort = (file: UploadFile) => {
      if (file.status === 'uploading') {
        file.status = 'fail'
        emit('change', [...state.fileList])
      }
    }

    const clearFiles = () => {
      state.fileList = []
      emit('change', [...state.fileList])
    }

    watch(() => props.fileList, (val) => {
      state.fileList = [...val]
    })

    return {
      props, state,
      handleFiles, handleFileChange, handleRemove, handlePreview,
      handleDrop, handleDragOver, handleDragLeave,
      submit, abort, clearFiles,
      slots,
    }
  },

  template: `
    <div class="lyt-upload">
      <div
        v-if="drag"
        class="lyt-upload-dragger {state.dragOver ? 'lyt-upload-dragger--dragover' : ''} {disabled ? 'lyt-upload-dragger--disabled' : ''}"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
      >
        <div class="lyt-upload-dragger-icon">📁</div>
        <div class="lyt-upload-dragger-text">
          将文件拖到此处，或
          <span class="lyt-upload-dragger-text--link" @click="$refs?.fileInput?.click()">点击上传</span>
        </div>
        <div v-if="tip" class="lyt-upload-dragger-tip">{{ tip }}</div>
      </div>
      <div v-else class="lyt-upload-button">
        <slot name="trigger">
          <button
            type="button"
            class="lyt-upload-trigger {disabled ? 'lyt-upload-trigger--disabled' : ''}"
            :disabled="disabled"
            @click="!disabled && $refs?.fileInput?.click()"
          >
            📎 选择文件
          </button>
        </slot>
      </div>
      <input
        ref="fileInput"
        class="lyt-upload-input"
        type="file"
        :multiple="multiple"
        :accept="accept"
        :disabled="disabled"
        @change="handleFileChange"
      />
      <div v-if="showFileList && listType === 'text'" class="lyt-upload-list lyt-upload-list--text">
        <div
          v-for="file in state.fileList"
          :key="file.uid"
          class="lyt-upload-list-item {file.status} {file.status === 'uploading' ? 'lyt-upload-list-item--uploading' : ''}"
        >
          <div class="lyt-upload-list-item-icon">
            <span v-if="file.status === 'success'">✅</span>
            <span v-else-if="file.status === 'fail'">❌</span>
            <span v-else>📄</span>
          </div>
          <div class="lyt-upload-list-item-name" @click="handlePreview(file)">{{ file.name }}</div>
          <div class="lyt-upload-list-item-status">
            <span v-if="file.status === 'uploading'" class="lyt-upload-list-item-status--uploading">{{ file.percentage }}%</span>
          </div>
          <div class="lyt-upload-list-item-delete" @click="handleRemove(file)" v-if="!disabled">✕</div>
        </div>
      </div>
      <div v-if="showFileList && (listType === 'picture' || listType === 'picture-card')" class="lyt-upload-list lyt-upload-list--picture">
        <div
          v-for="file in state.fileList"
          :key="file.uid"
          class="lyt-upload-list-item-picture {listType === 'picture-card' ? 'lyt-upload-list-item-picture--card' : ''}"
        >
          <div class="lyt-upload-list-item-picture-preview" @click="handlePreview(file)">
            <div v-if="file.url" class="lyt-upload-list-item-picture-img" :style="{ backgroundImage: 'url(' + file.url + ')' }"></div>
            <div v-else class="lyt-upload-list-item-picture-placeholder">🖼️</div>
          </div>
          <div class="lyt-upload-list-item-picture-name">{{ file.name }}</div>
          <div class="lyt-upload-list-item-picture-actions">
            <span class="lyt-upload-list-item-picture-action" @click="handlePreview(file)">👁️</span>
            <span class="lyt-upload-list-item-picture-action" @click="handleRemove(file)" v-if="!disabled">🗑️</span>
          </div>
        </div>
        <div v-if="listType === 'picture-card'" class="lyt-upload-list-item-picture lyt-upload-list-item-picture--card lyt-upload-list-item-picture--add" @click="!disabled && $refs?.fileInput?.click()">
          <div class="lyt-upload-list-item-picture-icon">➕</div>
        </div>
      </div>
    </div>
  `,

  styles: `
    .lyt-upload {
      display: inline-block;
      width: 100%;
      box-sizing: border-box;
    }
    .lyt-upload-dragger {
      border: 2px dashed var(--lyt-color-border);
      border-radius: 6px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.3s, background-color 0.3s;
    }
    .lyt-upload-dragger:hover,
    .lyt-upload-dragger--dragover {
      border-color: var(--lyt-color-primary);
      background-color: rgba(64, 158, 255, 0.05);
    }
    .lyt-upload-dragger--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .lyt-upload-dragger-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .lyt-upload-dragger-text {
      font-size: 14px;
      color: var(--lyt-color-muted);
    }
    .lyt-upload-dragger-text--link {
      color: var(--lyt-color-primary);
      cursor: pointer;
    }
    .lyt-upload-dragger-tip {
      font-size: 12px;
      color: var(--lyt-color-muted);
      margin-top: 8px;
    }
    .lyt-upload-button {
      display: inline-block;
    }
    .lyt-upload-trigger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 14px;
      background-color: var(--lyt-color-primary);
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: opacity 0.3s;
    }
    .lyt-upload-trigger:hover {
      opacity: 0.85;
    }
    .lyt-upload-trigger--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .lyt-upload-input {
      display: none;
    }
    .lyt-upload-list {
      margin-top: 10px;
    }
    .lyt-upload-list--text {
      width: 100%;
    }
    .lyt-upload-list-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      font-size: 14px;
      color: var(--lyt-color-muted);
      transition: background-color 0.3s;
      border-radius: 4px;
    }
    .lyt-upload-list-item:hover {
      background-color: var(--lyt-color-bg);
    }
    .lyt-upload-list-item--uploading {
      background-color: rgba(64, 158, 255, 0.05);
    }
    .lyt-upload-list-item.success {
      color: var(--lyt-color-success);
    }
    .lyt-upload-list-item.fail {
      color: var(--lyt-color-danger);
    }
    .lyt-upload-list-item-icon {
      width: 20px;
      text-align: center;
    }
    .lyt-upload-list-item-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
    }
    .lyt-upload-list-item-name:hover {
      color: var(--lyt-color-primary);
    }
    .lyt-upload-list-item-status {
      font-size: 12px;
    }
    .lyt-upload-list-item-status--uploading {
      color: var(--lyt-color-primary);
    }
    .lyt-upload-list-item-delete {
      width: 20px;
      text-align: center;
      cursor: pointer;
      color: var(--lyt-color-muted);
      transition: color 0.3s;
    }
    .lyt-upload-list-item-delete:hover {
      color: var(--lyt-color-danger);
    }
    .lyt-upload-list--picture {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .lyt-upload-list-item-picture {
      position: relative;
      width: 100px;
      height: 100px;
      border: 1px solid var(--lyt-color-border);
      border-radius: 4px;
      overflow: hidden;
      background-color: var(--lyt-color-bg);
    }
    .lyt-upload-list-item-picture--card {
      border-radius: 6px;
      background-color: var(--lyt-color-bg);
    }
    .lyt-upload-list-item-picture-preview {
      width: 100%;
      height: 70%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .lyt-upload-list-item-picture--card .lyt-upload-list-item-picture-preview {
      height: 100%;
    }
    .lyt-upload-list-item-picture-img {
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
    }
    .lyt-upload-list-item-picture-placeholder {
      font-size: 32px;
      color: var(--lyt-color-muted);
    }
    .lyt-upload-list-item-picture-name {
      height: 30%;
      padding: 4px 8px;
      font-size: 12px;
      color: var(--lyt-color-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: flex;
      align-items: center;
    }
    .lyt-upload-list-item-picture--card .lyt-upload-list-item-picture-name {
      display: none;
    }
    .lyt-upload-list-item-picture-actions {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      background-color: rgba(0, 0, 0, 0.5);
      opacity: 0;
      transition: opacity 0.3s;
    }
    .lyt-upload-list-item-picture:hover .lyt-upload-list-item-picture-actions {
      opacity: 1;
    }
    .lyt-upload-list-item-picture-action {
      font-size: 20px;
      color: #fff;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .lyt-upload-list-item-picture-action:hover {
      transform: scale(1.2);
    }
    .lyt-upload-list-item-picture--add {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      background-color: var(--lyt-color-bg);
    }
    .lyt-upload-list-item-picture--add:hover {
      border-color: var(--lyt-color-primary);
    }
    .lyt-upload-list-item-picture-icon {
      font-size: 28px;
      color: var(--lyt-color-muted);
    }
  `,
})
