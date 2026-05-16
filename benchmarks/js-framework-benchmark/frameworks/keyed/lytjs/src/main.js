/**
 * LytJS v6.0.0 - js-framework-benchmark 实现
 * 使用 Vapor 模式获得最佳性能
 */

import { defineVaporComponent, createVaporApp } from '@lytjs/renderer/vapor/vapor-app';
import { signal, computed } from '@lytjs/reactivity';

// 数据生成
const adjectives = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap', 'expensive', 'fancy'];
const colours = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange'];
const nouns = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'train', 'plane', 'bridge', 'sunglasses', 'tower', 'house', 'plant', 'bicycle', 'tree'];

function generateId() {
  return performance.now() + Math.random();
}

function generateRandomString() {
  return adjectives[Math.floor(Math.random() * adjectives.length)] +
    ' ' +
    colours[Math.floor(Math.random() * colours.length)] +
    ' ' +
    nouns[Math.floor(Math.random() * nouns.length)];
}

// 主应用组件
const App = defineVaporComponent({
  name: 'App',
  template: `
    <div class="container">
      <div class="jumbotron">
        <div class="row">
          <div class="col-md-6">
            <h1>LytJS v6.0.0 - js-framework-benchmark</h1>
          </div>
          <div class="col-md-6">
            <div class="row">
              <div class="col-sm-6 smallpad">
                <button type="button" class="btn btn-primary btn-block" id="run">Create 1,000 rows</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button type="button" class="btn btn-primary btn-block" id="runlots">Create 10,000 rows</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button type="button" class="btn btn-primary btn-block" id="add">Append 1,000 rows</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button type="button" class="btn btn-primary btn-block" id="update">Update every 10th row</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button type="button" class="btn btn-primary btn-block" id="clear">Clear</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button type="button" class="btn btn-primary btn-block" id="swaprows">Swap Rows</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <table class="table table-hover table-striped test-data">
        <tbody>
          <tr v-for="item in data" key="item.id" class="danger when selected, otherwise">
            <td class="col-md-1">{{ item.id }}</td>
            <td class="col-md-4">
              <a v-on:click="select(item.id)">{{ item.label }}</a>
            </td>
            <td class="col-md-1">
              <a v-on:click="remove(item.id)">
                <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
              </a>
            </td>
            <td class="col-md-6"></td>
          </tr>
        </tbody>
      </table>
      <span class="preloadicon glyphicon glyphicon-remove" aria-hidden="true"></span>
    </div>
  `,
  setup() {
    // 数据和状态
    const data = signal([]);
    const selectedId = signal(undefined);

    // 核心操作
    function add() {
      const newData = [];
      for (let i = 0; i < 1000; i++) {
        newData.push({
          id: generateId(),
          label: generateRandomString(),
        });
      }
      data.set(newData);
    }

    function update() {
      const currentData = data();
      const newData = currentData.map((item, index) => {
        if (index % 10 === 0) {
          return { ...item, label: item.label + ' !!!' };
        }
        return item;
      });
      data.set(newData);
    }

    function clear() {
      data.set([]);
    }

    function swapRows() {
      const currentData = data();
      if (currentData.length > 998) {
        const newData = [...currentData];
        const temp = newData[1];
        newData[1] = newData[998];
        newData[998] = temp;
        data.set(newData);
      }
    }

    function remove(id) {
      data.set(data().filter(item => item.id !== id));
    }

    function select(id) {
      selectedId.set(id);
    }

    function run() {
      const newData = [];
      for (let i = 0; i < 1000; i++) {
        newData.push({
          id: generateId(),
          label: generateRandomString(),
        });
      }
      data.set(newData);
    }

    function runLots() {
      const newData = [];
      for (let i = 0; i < 10000; i++) {
        newData.push({
          id: generateId(),
          label: generateRandomString(),
        });
      }
      data.set(newData);
    }

    // 暴露给模板
    return {
      data,
      selectedId,
      add,
      update,
      clear,
      swapRows,
      remove,
      select,
      run,
      runLots,
    };
  },
});

// 创建并挂载应用
const app = createVaporApp(App);
app.mount('#app');
