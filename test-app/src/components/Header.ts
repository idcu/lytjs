import { defineComponent } from 'lyt'

export default defineComponent({
  name: 'Header',

  template: `
    <header class="header">
      <nav>
        <a href="/">首页</a>
        <a href="/about">关于</a>
      </nav>
    </header>
  `,
})
