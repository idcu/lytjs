/**
 * LytJS v6.0.0 - js-framework-benchmark 实现
 * 使用 Signal + 直接 DOM 操作获得最佳性能
 */

import { signal, signalBatch } from '@lytjs/reactivity';

// 数据生成
const adjectives = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap', 'expensive', 'fancy'];
const colours = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange'];
const nouns = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'train', 'plane', 'bridge', 'sunglasses', 'tower', 'house', 'plant', 'bicycle', 'tree'];

let _id = 1;

function generateId() {
  return _id++;
}

function generateRandomString() {
  return adjectives[Math.floor(Math.random() * adjectives.length)] +
    ' ' +
    colours[Math.floor(Math.random() * colours.length)] +
    ' ' +
    nouns[Math.floor(Math.random() * nouns.length)];
}

// 状态
const data = signal([]);
const selectedId = signal(undefined);

// DOM 元素引用
let tbody;
let runBtn, runlotsBtn, addBtn, updateBtn, clearBtn, swaprowsBtn;

// 创建单个行元素
function createRow(item) {
  const tr = document.createElement('tr');
  tr.setAttribute('data-id', item.id);

  const td1 = document.createElement('td');
  td1.className = 'col-md-1';
  td1.textContent = item.id;

  const td2 = document.createElement('td');
  td2.className = 'col-md-4';
  const a1 = document.createElement('a');
  a1.textContent = item.label;
  a1.addEventListener('click', () => select(item.id));
  td2.appendChild(a1);

  const td3 = document.createElement('td');
  td3.className = 'col-md-1';
  const a2 = document.createElement('a');
  a2.addEventListener('click', () => remove(item.id));
  const span = document.createElement('span');
  span.className = 'glyphicon glyphicon-remove';
  span.setAttribute('aria-hidden', 'true');
  a2.appendChild(span);
  td3.appendChild(a2);

  const td4 = document.createElement('td');
  td4.className = 'col-md-6';

  tr.appendChild(td1);
  tr.appendChild(td2);
  tr.appendChild(td3);
  tr.appendChild(td4);

  return tr;
}

// 渲染表格
function render() {
  if (!tbody) return;

  // 清空现有内容
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }

  // 创建文档片段以优化批量 DOM 操作
  const fragment = document.createDocumentFragment();
  const currentData = data();

  for (let i = 0; i < currentData.length; i++) {
    const tr = createRow(currentData[i]);
    if (currentData[i].id === selectedId()) {
      tr.className = 'danger';
    }
    fragment.appendChild(tr);
  }

  tbody.appendChild(fragment);
}

// 核心操作
function run() {
  signalBatch(() => {
    const newData = [];
    for (let i = 0; i < 1000; i++) {
      newData.push({
        id: generateId(),
        label: generateRandomString(),
      });
    }
    data.set(newData);
  });
}

function runLots() {
  signalBatch(() => {
    const newData = [];
    for (let i = 0; i < 10000; i++) {
      newData.push({
        id: generateId(),
        label: generateRandomString(),
      });
    }
    data.set(newData);
  });
}

function add() {
  signalBatch(() => {
    const currentData = data();
    const newData = [...currentData];
    for (let i = 0; i < 1000; i++) {
      newData.push({
        id: generateId(),
        label: generateRandomString(),
      });
    }
    data.set(newData);
  });
}

function update() {
  signalBatch(() => {
    const currentData = data();
    const newData = [...currentData];
    for (let i = 0; i < newData.length; i += 10) {
      newData[i] = { ...newData[i], label: newData[i].label + ' !!!' };
    }
    data.set(newData);
  });
}

function clear() {
  signalBatch(() => {
    data.set([]);
    selectedId.set(undefined);
  });
}

function swapRows() {
  signalBatch(() => {
    const currentData = data();
    if (currentData.length > 998) {
      const newData = [...currentData];
      const temp = newData[1];
      newData[1] = newData[998];
      newData[998] = temp;
      data.set(newData);
    }
  });
}

function remove(id) {
  signalBatch(() => {
    const currentData = data();
    const newData = currentData.filter(item => item.id !== id);
    data.set(newData);
  });
}

function select(id) {
  selectedId.set(id);
}

// 订阅数据变化并重新渲染
let isRendering = false;
function debouncedRender() {
  if (isRendering) return;
  isRendering = true;
  requestAnimationFrame(() => {
    render();
    isRendering = false;
  });
}

// 订阅数据变化
data._subscribe(debouncedRender);
selectedId._subscribe(debouncedRender);

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  tbody = document.querySelector('.test-data tbody');
  runBtn = document.getElementById('run');
  runlotsBtn = document.getElementById('runlots');
  addBtn = document.getElementById('add');
  updateBtn = document.getElementById('update');
  clearBtn = document.getElementById('clear');
  swaprowsBtn = document.getElementById('swaprows');

  // 绑定事件
  runBtn.addEventListener('click', run);
  runlotsBtn.addEventListener('click', runLots);
  addBtn.addEventListener('click', add);
  updateBtn.addEventListener('click', update);
  clearBtn.addEventListener('click', clear);
  swaprowsBtn.addEventListener('click', swapRows);
});
