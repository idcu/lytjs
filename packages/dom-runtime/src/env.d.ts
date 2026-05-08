/// <reference types="vite/client" />

// FIX: P1-17 声明 __DEV__ 全局变量，用于开发模式检测
declare const __DEV__: boolean;

declare namespace NodeJS {
  interface Global {
    document: Document;
    window: Window;
    navigator: Navigator;
  }
}
