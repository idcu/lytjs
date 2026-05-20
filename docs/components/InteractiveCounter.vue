<template>
  <div class="interactive-counter">
    <div class="counter-display">
      <span class="count">{{ count }}</span>
      <span class="label">当前计数</span>
    </div>

    <div class="counter-controls">
      <button class="btn btn-decrement" @click="decrement">
        <span>−</span>
      </button>

      <button class="btn btn-reset" @click="reset">
        <span>重置</span>
      </button>

      <button class="btn btn-increment" @click="increment">
        <span>+</span>
      </button>
    </div>

    <div class="counter-info">
      <p>
        加倍后: <strong>{{ doubled }}</strong>
      </p>
      <p v-if="history.length > 0" class="history">历史: {{ history.join(', ') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const count = ref(0);
const history = ref<number[]>([]);

const doubled = computed(() => count.value * 2);

function increment() {
  history.value.push(count.value);
  count.value++;
  if (history.value.length > 10) history.value.shift();
}

function decrement() {
  history.value.push(count.value);
  count.value--;
  if (history.value.length > 10) history.value.shift();
}

function reset() {
  history.value.push(count.value);
  count.value = 0;
  if (history.value.length > 10) history.value.shift();
}
</script>

<style scoped>
.interactive-counter {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 32px;
  color: white;
  text-align: center;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
}

.counter-display {
  margin-bottom: 24px;
}

.count {
  display: block;
  font-size: 4rem;
  font-weight: 800;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.label {
  font-size: 0.9rem;
  opacity: 0.9;
}

.counter-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.btn:active {
  transform: translateY(0);
}

.btn-increment {
  background: #4ade80;
  color: #052e16;
}

.btn-decrement {
  background: #f87171;
  color: #450a0a;
}

.btn-reset {
  background: white;
  color: #667eea;
}

.counter-info {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 16px;
}

.counter-info p {
  margin: 8px 0;
}

.history {
  font-size: 0.85rem;
  opacity: 0.85;
  font-family: monospace;
}
</style>
