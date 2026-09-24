/** 浏览器入口：把演示挂到 #app */
import { mountSlotsDemo } from './app';

const el = document.getElementById('app');
if (!el) throw new Error('#app not found');
mountSlotsDemo(el);
