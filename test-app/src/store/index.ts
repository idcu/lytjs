import { createStore } from '@lytjs/store'

export const store = createStore({
  state: {
    count: 0,
    message: 'Hello Lyt!',
  },

  mutations: {
    increment(state: any) {
      state.count++
    },

    setMessage(state: any, message: string) {
      state.message = message
    },
  },

  actions: {
    async fetchMessage({ commit }: any) {
      commit('setMessage', 'Fetched from API')
    },
  },

  getters: {
    doubleCount: (state: any) => state.count * 2,
  },
})
