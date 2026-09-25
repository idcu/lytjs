// 实测踩出来的三个要点：
// 1) 支持 template 字符串的 createApp 来自 **@lytjs/core-signal**（不是 @lytjs/core）
// 2) **mount() 是异步的**，建议 await（不 await 会得到空白页且不报错）
// 3) 模板表达式只支持「简单属性路径」：`@click="count = count + 1"` 会编译报错，
//    请在 setup 里定义方法再绑定（见下方 inc）。
import { createApp, ref, computed } from '@lytjs/core-signal';

const host = document.getElementById('app');

const app = createApp({
  setup() {
    const count = ref(0);
    const inc = () => {
      count.value = count.value + 1;
    };
    // 同一元素内放多个插值会丢内容，故用 computed 拼好整串再绑定
    const summary = computed(() => 'count = ' + count.value + ' , doubled = ' + count.value * 2);
    return { count, summary, inc };
  },
  template: `
    <div>
      <button @click="inc">+1</button>
      <p>{{ summary }}</p>
    </div>
  `,
});

// 不写成顶层 await（IIFE 打包不支持）；mount 返回 Promise
app.mount(host).then(() => console.log('[hello] mounted'));
