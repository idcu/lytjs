// 踩点 1：支持 template 字符串的 createApp 来自 **@lytjs/core-signal**（不是 @lytjs/core）
import { createApp, ref, computed } from '@lytjs/core-signal';

const host = document.getElementById('app');

const app = createApp({
  setup() {
    const count = ref(0);

    // 踩点 2：模板表达式只支持「简单属性路径」。
    //   @click="count = count + 1" 会编译报错 ⇒ 请在 setup 里定义方法
    const inc = () => {
      count.value = count.value + 1;
    };

    // 提示：同一元素内的多个插值现已支持（2026-09-26 修复）
    //   <p>{{ count }} / {{ doubled }}</p> 可以直接写；
    //   这里仍用 computed 只是为了让模板更简洁。
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

// 踩点 4：mount() 返回 Promise，是**异步**的；不 await 会得到空白页且不报错
app.mount(host).then(() => console.log('[demo] mounted'));
