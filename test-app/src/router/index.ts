import { createRouter, createWebHistory } from '@lytjs/router'
import HomePage from '../pages/index'
import AboutPage from '../pages/about'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: HomePage,
    },
    {
      path: '/about',
      component: AboutPage,
    },
  ],
})
