// Lytx 配置文件
import { defineConfig } from 'lyt'

export default defineConfig({
  // 构建模式
  mode: 'spa',
  // 路由配置
  router: {
    historyMode: true,
  },
  // 状态管理配置
  store: {
    strict: true,
  },
})
