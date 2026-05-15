import DefaultTheme from 'vitepress/theme';
import InteractiveCounter from '../../components/InteractiveCounter.vue';
import './style.css';

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('InteractiveCounter', InteractiveCounter);
  },
};
