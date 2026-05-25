import { createApp, defineComponent, ref, h } from '@lytjs/core-signal'

const adjectives = ['pretty','large','big','small','tall','short','long','handsome','plain','quaint','clean','elegant','easy','angry','crazy','helpful','mushy','odd','unsightly','adorable','important','inexpensive','cheap','expensive','fancy'];
const colours = ['red','yellow','blue','green','pink','brown','purple','brown','white','black','orange'];
const nouns = ['table','chair','house','bbq','desk','car','pony','train','plane','bridge','sunglasses','tower','house','plant','bicycle','tree'];

let _id = 1;
function generateId() { return _id++; }
function generateRandomString() {
  return adjectives[Math.floor(Math.random() * adjectives.length)] + ' ' + colours[Math.floor(Math.random() * colours.length)] + ' ' + nouns[Math.floor(Math.random() * nouns.length)];
}

const App = defineComponent({
  setup() {
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

    document.getElementById('run').addEventListener('click', run);
    document.getElementById('runlots').addEventListener('click', runLots);
    document.getElementById('add').addEventListener('click', add);
    document.getElementById('update').addEventListener('click', update);
    document.getElementById('clear').addEventListener('click', clear);
    document.getElementById('swaprows').addEventListener('click', swapRows);

    return () => h('table', { class: 'table table-hover table-striped test-data' }, [
      h('tbody', {}, data.value.map(item => 
        h('tr', { 
          class: selectedId.value === item.id ? 'danger' : '',
          'data-key': String(item.id)
        }, [
          h('td', { class: 'col-md-1' }, String(item.id)),
          h('td', { class: 'col-md-4' }, [
            h('a', { 
              onClick: () => select(item.id) 
            }, item.label)
          ]),
          h('td', { class: 'col-md-1' }, [
            h('a', { 
              onClick: () => remove(item.id) 
            }, [
              h('span', { 
                class: 'glyphicon glyphicon-remove',
                'aria-hidden': 'true'
              })
            ])
          ]),
          h('td', { class: 'col-md-6' })
        ])
      ))
    ]);
  }
});

createApp(App).mount('#app');
