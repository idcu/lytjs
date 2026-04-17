import { createApp } from 'lyt'
import App from './App.lyt'
import './styles/main.css'
import { router } from './router'
import { store } from './store'

// 创建应用实例
const app = createApp(App)
app.use(router)
app.use(store)

// 将应用挂载到 #app 元素
app.mount('#app')
