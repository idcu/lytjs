console.log('main-signal.js loaded!');
import { createApp, defineComponent, ref } from '@lytjs/core-signal';

const adjectives = ['pretty','large','big','small','tall','short','long','handsome','plain','quaint','clean','elegant','easy','angry','crazy','helpful','mushy','odd','unsightly','adorable','important','inexpensive','cheap','expensive','fancy'];
const colours = ['red','yellow','blue','green','pink','brown','purple','brown','white','black','orange'];
const nouns = ['table','chair','house','bbq','desk','car','pony','train','plane','bridge','sunglasses','tower','house','plant','bicycle','tree'];

let _id = 1;
function generateId() { return _id++; }
function generateRandomString() {
  return adjectives[Math.floor(Math.random() * adjectives.length)] + ' ' + colours[Math.floor(Math.random() * colours.length)] + ' ' + nouns[Math.floor(Math.random() * nouns.length)];
}

// 全局共享的状态
const data = ref([]);
const selectedId = ref(undefined);

const run = () => {
  const newData = [];
  for (let i = 0; i < 1000; i++) {
    newData.push({ id: generateId(), label: generateRandomString() });
  }
  data.value = newData;
  selectedId.value = undefined;
};

const runLots = () => {
  const newData = [];
  for (let i = 0; i < 10000; i++) {
    newData.push({ id: generateId(), label: generateRandomString() });
  }
  data.value = newData;
  selectedId.value = undefined;
};

const add = () => {
  const newItems = [];
  for (let i = 0; i < 1000; i++) {
    newItems.push({ id: generateId(), label: generateRandomString() });
  }
  data.value = [...data.value, ...newItems];
};

const update = () => {
  data.value = data.value.map((item, index) => {
    if (index % 10 === 0) {
      return { ...item, label: item.label + ' !!!' };
    }
    return item;
  });
};

const clear = () => {
  data.value = [];
  selectedId.value = undefined;
};

const swapRows = () => {
  if (data.value.length > 998) {
    const newData = [...data.value];
    const temp = newData[1];
    newData[1] = newData[998];
    newData[998] = temp;
    data.value = newData;
  }
};

const remove = (id) => {
  data.value = data.value.filter(item => item.id !== id);
};

const select = (id) => {
  selectedId.value = id;
};

const App = defineComponent({
  setup() {
    return {
      data,
      selectedId,
      remove,
      select
    };
  },
  template: `
    <table class="table table-hover table-striped test-data">
      <tbody>
        <tr v-for="item in data" :key="item.id" :class="{ danger: selectedId === item.id }" :data-key="item.id">
          <td class="col-md-1">{{ item.id }}</td>
          <td class="col-md-4">
            <a @click="select(item.id)">{{ item.label }}</a>
          </td>
          <td class="col-md-1">
            <a @click="remove(item.id)">
              <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
            </a>
          </td>
          <td class="col-md-6"></td>
        </tr>
      </tbody>
    </table>
  `
});

(async () => {
  console.log('Starting to mount app...');
  console.log('App component:', App);
  console.log('App.template:', App.template);
  try {
    const app = createApp(App);
    console.log('App created:', app);
    await app.mount('#app');
    console.log('App mounted successfully!');
  } catch (e) {
    console.error('Error mounting app:', e);
  }
  
  // 绑定按钮事件
  document.getElementById('run').addEventListener('click', run);
  document.getElementById('runlots').addEventListener('click', runLots);
  document.getElementById('add').addEventListener('click', add);
  document.getElementById('update').addEventListener('click', update);
  document.getElementById('clear').addEventListener('click', clear);
  document.getElementById('swaprows').addEventListener('click', swapRows);
})();
