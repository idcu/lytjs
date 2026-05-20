/* eslint-disable @typescript-eslint/no-explicit-any */
import { createApp, h, ref, computed } from '@lytjs/core';

// 场景管理
const currentScenario = ref<string>('home');
const scenarios = [
  'counter',
  'todo',
  'crud-list',
  'form-validation',
  'color-picker',
  'timer',
  'shopping-cart',
  'markdown-editor',
  'tic-tac-toe',
  'weather-dashboard',
];

// 1. 计数器组件
function CounterComponent() {
  const count = ref(0);
  return h('div', { class: 'counter', style: { textAlign: 'center', padding: '40px' } }, [
    h('h2', { style: { color: '#333' } }, '计数器场景'),
    h(
      'div',
      { class: 'count-display', style: { fontSize: '48px', margin: '20px 0' } },
      String(count.value),
    ),
    h('div', { class: 'buttons' }, [
      h(
        'button',
        {
          id: 'btn-decrement',
          onClick: () => count.value--,
          style: { fontSize: '24px', padding: '10px 20px', margin: '0 10px', cursor: 'pointer' },
        },
        '-',
      ),
      h(
        'button',
        {
          id: 'btn-reset',
          onClick: () => (count.value = 0),
          style: { fontSize: '24px', padding: '10px 20px', margin: '0 10px', cursor: 'pointer' },
        },
        'Reset',
      ),
      h(
        'button',
        {
          id: 'btn-increment',
          onClick: () => count.value++,
          style: { fontSize: '24px', padding: '10px 20px', margin: '0 10px', cursor: 'pointer' },
        },
        '+',
      ),
    ]),
  ]);
}

// 2. 待办事项组件
function TodoComponent() {
  const todos = ref<{ id: number; text: string }[]>([]);
  const input = ref('');
  let nextId = 1;

  const addTodo = () => {
    if (input.value.trim()) {
      todos.value.push({ id: nextId++, text: input.value.trim() });
      input.value = '';
    }
  };

  const removeTodo = (id: number) => {
    const index = todos.value.findIndex((t) => t.id === id);
    if (index !== -1) todos.value.splice(index, 1);
  };

  return h(
    'div',
    { class: 'todo', style: { maxWidth: '600px', margin: '0 auto', padding: '40px' } },
    [
      h('h2', { style: { color: '#333' } }, '待办事项场景'),
      h('div', { style: { display: 'flex', gap: '10px', marginBottom: '20px' } }, [
        h('input', {
          id: 'todo-input',
          value: input.value,
          onInput: (e: any) => (input.value = e.target.value),
          onKeyup: (e: any) => e.key === 'Enter' && addTodo(),
          style: { flex: '1', padding: '10px', fontSize: '16px' },
        }),
        h(
          'button',
          {
            id: 'btn-add-todo',
            onClick: addTodo,
            style: { padding: '10px 20px', cursor: 'pointer' },
          },
          '添加',
        ),
      ]),
      h(
        'div',
        { id: 'todo-count', style: { marginBottom: '10px' } },
        `共 ${todos.value.length} 项`,
      ),
      h(
        'div',
        { id: 'todo-list', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        todos.value.map((todo) =>
          h(
            'div',
            {
              class: 'todo-item',
              key: todo.id,
              style: {
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              },
            },
            [
              h('span', {}, todo.text),
              h(
                'button',
                {
                  class: 'btn-delete',
                  onClick: () => removeTodo(todo.id),
                  style: {
                    padding: '5px 10px',
                    cursor: 'pointer',
                    backgroundColor: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                  },
                },
                '删除',
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

// 3. CRUD 列表组件
function CrudListComponent() {
  const items = ref<{ id: number; name: string }[]>([]);
  const name = ref('');
  const editingId = ref<number | null>(null);
  const editName = ref('');
  let nextId = 1;

  const addItem = () => {
    if (name.value.trim()) {
      items.value.push({ id: nextId++, name: name.value.trim() });
      name.value = '';
    }
  };

  const startEdit = (item: any) => {
    editingId.value = item.id;
    editName.value = item.name;
  };

  const saveEdit = () => {
    if (editingId.value && editName.value.trim()) {
      const item = items.value.find((i) => i.id === editingId.value);
      if (item) item.name = editName.value.trim();
      editingId.value = null;
      editName.value = '';
    }
  };

  const deleteItem = (id: number) => {
    const index = items.value.findIndex((i) => i.id === id);
    if (index !== -1) items.value.splice(index, 1);
  };

  return h(
    'div',
    { class: 'crud-list', style: { maxWidth: '600px', margin: '0 auto', padding: '40px' } },
    [
      h('h2', { style: { color: '#333' } }, 'CRUD 列表场景'),
      h('div', { style: { display: 'flex', gap: '10px', marginBottom: '20px' } }, [
        h('input', {
          id: 'item-name',
          value: name.value,
          onInput: (e: any) => (name.value = e.target.value),
          onKeyup: (e: any) => e.key === 'Enter' && addItem(),
          style: { flex: '1', padding: '10px', fontSize: '16px' },
        }),
        h(
          'button',
          {
            id: 'btn-add-item',
            onClick: addItem,
            style: { padding: '10px 20px', cursor: 'pointer' },
          },
          '添加',
        ),
      ]),
      h(
        'div',
        { id: 'item-list', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        items.value.map((item) =>
          h(
            'div',
            {
              class: 'list-item',
              key: item.id,
              style: {
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              },
            },
            [
              editingId.value === item.id
                ? h('div', { style: { display: 'flex', gap: '10px' } }, [
                    h('input', {
                      id: 'edit-item-name',
                      value: editName.value,
                      onInput: (e: any) => (editName.value = e.target.value),
                      style: { padding: '5px', fontSize: '14px' },
                    }),
                    h(
                      'button',
                      {
                        id: 'btn-save-edit',
                        onClick: saveEdit,
                        style: { padding: '5px 10px', cursor: 'pointer' },
                      },
                      '保存',
                    ),
                  ])
                : h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, [
                    h('span', { class: 'item-name' }, item.name),
                    h(
                      'button',
                      {
                        class: 'btn-edit',
                        onClick: () => startEdit(item),
                        style: { padding: '5px 10px', cursor: 'pointer' },
                      },
                      '编辑',
                    ),
                    h(
                      'button',
                      {
                        class: 'btn-delete',
                        onClick: () => deleteItem(item.id),
                        style: {
                          padding: '5px 10px',
                          cursor: 'pointer',
                          backgroundColor: '#ff4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                        },
                      },
                      '删除',
                    ),
                  ]),
            ],
          ),
        ),
      ),
    ],
  );
}

// 4. 表单验证组件
function FormValidationComponent() {
  const email = ref('');
  const password = ref('');
  const confirmPassword = ref('');
  const errors = ref<{ email?: string; password?: string; confirmPassword?: string }>({});

  const validate = () => {
    errors.value = {};

    if (!email.value) {
      errors.value.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      errors.value.email = '邮箱格式不正确';
    }

    if (!password.value) {
      errors.value.password = '密码不能为空';
    } else if (password.value.length < 6) {
      errors.value.password = '密码至少6个字符';
    }

    if (password.value !== confirmPassword.value) {
      errors.value.confirmPassword = '两次密码不一致';
    }

    return Object.keys(errors.value).length === 0;
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (validate()) {
      alert('表单提交成功！');
    }
  };

  return h(
    'div',
    { class: 'form-validation', style: { maxWidth: '400px', margin: '0 auto', padding: '40px' } },
    [
      h('h2', { style: { color: '#333' } }, '表单验证场景'),
      h('form', { id: 'validation-form', onSubmit: handleSubmit }, [
        h('div', { style: { marginBottom: '15px' } }, [
          h('label', { for: 'email', style: { display: 'block', marginBottom: '5px' } }, '邮箱'),
          h('input', {
            id: 'email',
            type: 'email',
            value: email.value,
            onInput: (e: any) => (email.value = e.target.value),
            style: { width: '100%', padding: '10px', fontSize: '16px' },
          }),
          errors.value.email &&
            h(
              'div',
              {
                id: 'email-error',
                class: 'error-message',
                style: { color: 'red', fontSize: '14px', marginTop: '5px' },
              },
              errors.value.email,
            ),
        ]),
        h('div', { style: { marginBottom: '15px' } }, [
          h('label', { for: 'password', style: { display: 'block', marginBottom: '5px' } }, '密码'),
          h('input', {
            id: 'password',
            type: 'password',
            value: password.value,
            onInput: (e: any) => (password.value = e.target.value),
            style: { width: '100%', padding: '10px', fontSize: '16px' },
          }),
          errors.value.password &&
            h(
              'div',
              {
                id: 'password-error',
                class: 'error-message',
                style: { color: 'red', fontSize: '14px', marginTop: '5px' },
              },
              errors.value.password,
            ),
        ]),
        h('div', { style: { marginBottom: '20px' } }, [
          h(
            'label',
            { for: 'confirm-password', style: { display: 'block', marginBottom: '5px' } },
            '确认密码',
          ),
          h('input', {
            id: 'confirm-password',
            type: 'password',
            value: confirmPassword.value,
            onInput: (e: any) => (confirmPassword.value = e.target.value),
            style: { width: '100%', padding: '10px', fontSize: '16px' },
          }),
          errors.value.confirmPassword &&
            h(
              'div',
              {
                id: 'confirm-password-error',
                class: 'error-message',
                style: { color: 'red', fontSize: '14px', marginTop: '5px' },
              },
              errors.value.confirmPassword,
            ),
        ]),
        h(
          'button',
          {
            id: 'btn-submit-form',
            type: 'submit',
            style: {
              width: '100%',
              padding: '12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer',
            },
          },
          '提交',
        ),
      ]),
    ],
  );
}

// 5. 颜色选择器组件
function ColorPickerComponent() {
  const selectedColor = ref('#007bff');
  const colors = [
    '#007bff',
    '#28a745',
    '#dc3545',
    '#ffc107',
    '#17a2b8',
    '#6c757d',
    '#e83e8c',
    '#fd7e14',
  ];

  return h(
    'div',
    {
      class: 'color-picker',
      style: { maxWidth: '600px', margin: '0 auto', padding: '40px', textAlign: 'center' },
    },
    [
      h('h2', { style: { color: '#333' } }, '颜色选择器场景'),
      h(
        'div',
        {
          id: 'color-display',
          style: {
            width: '200px',
            height: '200px',
            backgroundColor: selectedColor.value,
            margin: '20px auto',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
          },
        },
        selectedColor.value,
      ),
      h(
        'div',
        {
          id: 'color-options',
          style: {
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '20px',
          },
        },
        colors.map((color) =>
          h('button', {
            class: 'color-option',
            'data-color': color,
            onClick: () => (selectedColor.value = color),
            style: {
              width: '40px',
              height: '40px',
              backgroundColor: color,
              border: '2px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
            },
          }),
        ),
      ),
    ],
  );
}

// 6. 计时器组件
function TimerComponent() {
  const seconds = ref(0);
  const isRunning = ref(false);
  let timer: any = null;

  const start = () => {
    if (!isRunning.value) {
      isRunning.value = true;
      timer = setInterval(() => {
        seconds.value++;
      }, 1000);
    }
  };

  const stop = () => {
    if (isRunning.value) {
      isRunning.value = false;
      if (timer) clearInterval(timer);
    }
  };

  const reset = () => {
    stop();
    seconds.value = 0;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return h(
    'div',
    {
      class: 'timer',
      style: { maxWidth: '400px', margin: '0 auto', padding: '40px', textAlign: 'center' },
    },
    [
      h('h2', { style: { color: '#333' } }, '计时器场景'),
      h(
        'div',
        {
          id: 'timer-display',
          class: 'timer-display',
          style: { fontSize: '72px', fontFamily: 'monospace', margin: '20px 0' },
        },
        formatTime(seconds.value),
      ),
      h(
        'div',
        {
          class: 'timer-buttons',
          style: { display: 'flex', gap: '10px', justifyContent: 'center' },
        },
        [
          h(
            'button',
            {
              id: 'btn-start-timer',
              onClick: start,
              style: { padding: '10px 20px', fontSize: '16px', cursor: 'pointer' },
            },
            '开始',
          ),
          h(
            'button',
            {
              id: 'btn-stop-timer',
              onClick: stop,
              style: { padding: '10px 20px', fontSize: '16px', cursor: 'pointer' },
            },
            '停止',
          ),
          h(
            'button',
            {
              id: 'btn-reset-timer',
              onClick: reset,
              style: { padding: '10px 20px', fontSize: '16px', cursor: 'pointer' },
            },
            '重置',
          ),
        ],
      ),
    ],
  );
}

// 7. 购物车组件
function ShoppingCartComponent() {
  const products = [
    { id: 1, name: '产品 A', price: 100 },
    { id: 2, name: '产品 B', price: 200 },
    { id: 3, name: '产品 C', price: 300 },
  ];

  const cart = ref<{ id: number; name: string; price: number; quantity: number }[]>([]);

  const addToCart = (product: any) => {
    const existing = cart.value.find((item) => item.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      cart.value.push({ ...product, quantity: 1 });
    }
  };

  const removeFromCart = (id: number) => {
    const index = cart.value.findIndex((item) => item.id === id);
    if (index !== -1) cart.value.splice(index, 1);
  };

  const total = computed(() =>
    cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  return h(
    'div',
    { class: 'shopping-cart', style: { maxWidth: '800px', margin: '0 auto', padding: '40px' } },
    [
      h('h2', { style: { color: '#333' } }, '购物车场景'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' } }, [
        h(
          'div',
          { id: 'product-list', style: { borderRight: '1px solid #ddd', paddingRight: '20px' } },
          [
            h('h3', { style: { marginBottom: '15px' } }, '产品列表'),
            products.map((product) =>
              h(
                'div',
                {
                  class: 'product-item',
                  key: product.id,
                  style: {
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  },
                },
                [
                  h('div', {}, [
                    h('div', { class: 'product-name' }, product.name),
                    h(
                      'div',
                      { class: 'product-price', style: { color: '#666' } },
                      `¥${product.price}`,
                    ),
                  ]),
                  h(
                    'button',
                    {
                      class: 'btn-add-to-cart',
                      'data-product-id': product.id,
                      onClick: () => addToCart(product),
                      style: { padding: '5px 10px', cursor: 'pointer' },
                    },
                    '加入购物车',
                  ),
                ],
              ),
            ),
          ],
        ),
        h('div', { id: 'cart-items', style: { paddingLeft: '20px' } }, [
          h('h3', { style: { marginBottom: '15px' } }, '购物车'),
          h(
            'div',
            { id: 'cart-list' },
            cart.value.map((item) =>
              h(
                'div',
                {
                  class: 'cart-item',
                  key: item.id,
                  style: {
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  },
                },
                [
                  h('div', {}, [
                    h('div', {}, `${item.name} x ${item.quantity}`),
                    h(
                      'div',
                      { class: 'cart-item-price', style: { color: '#666' } },
                      `小计: ¥${item.price * item.quantity}`,
                    ),
                  ]),
                  h(
                    'button',
                    {
                      class: 'btn-remove-from-cart',
                      'data-item-id': item.id,
                      onClick: () => removeFromCart(item.id),
                      style: {
                        padding: '5px 10px',
                        cursor: 'pointer',
                        backgroundColor: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                      },
                    },
                    '删除',
                  ),
                ],
              ),
            ),
          ),
          h(
            'div',
            {
              id: 'cart-total',
              style: {
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid #ddd',
                fontSize: '20px',
                fontWeight: 'bold',
              },
            },
            `总计: ¥${total.value}`,
          ),
        ]),
      ]),
    ],
  );
}

// 8. Markdown 编辑器组件
function MarkdownEditorComponent() {
  const markdown = ref(
    '# Hello Lyt.js\n\n这是一个**Markdown**编辑器示例。\n\n- 项目 1\n- 项目 2\n- 项目 3\n',
  );
  const preview = ref('');

  const parseMarkdown = (text: string) => {
    let html = text;
    html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
    html = html.replace(/<li>(.*?)<\/li>/gs, '<ul>$&</ul>');
    html = html.replace(/\n\n/g, '</p><p>');
    return `<p>${html}</p>`;
  };

  const updatePreview = () => {
    preview.value = parseMarkdown(markdown.value);
  };

  return h(
    'div',
    { class: 'markdown-editor', style: { maxWidth: '1000px', margin: '0 auto', padding: '40px' } },
    [
      h('h2', { style: { color: '#333' } }, 'Markdown 编辑器场景'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' } }, [
        h('div', {}, [
          h('h3', { style: { marginBottom: '10px' } }, '编辑'),
          h('textarea', {
            id: 'markdown-input',
            value: markdown.value,
            onInput: (e: any) => {
              markdown.value = e.target.value;
              updatePreview();
            },
            style: {
              width: '100%',
              height: '300px',
              padding: '10px',
              fontFamily: 'monospace',
              fontSize: '14px',
            },
          }),
        ]),
        h('div', {}, [
          h('h3', { style: { marginBottom: '10px' } }, '预览'),
          h(
            'div',
            {
              id: 'markdown-preview',
              style: {
                border: '1px solid #ddd',
                padding: '10px',
                height: '300px',
                overflow: 'auto',
              },
            },
            preview.value,
          ),
        ]),
      ]),
    ],
  );
}

// 9. 井字棋组件
function TicTacToeComponent() {
  const board = ref(Array(9).fill(null));
  const isXNext = ref(true);
  const winner = ref<string | null>(null);

  const calculateWinner = (squares: any[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
    }
    return null;
  };

  const makeMove = (i: number) => {
    if (board.value[i] || winner.value) return;
    const newBoard = [...board.value];
    newBoard[i] = isXNext.value ? 'X' : 'O';
    board.value = newBoard;
    isXNext.value = !isXNext.value;
    winner.value = calculateWinner(board.value);
  };

  const resetGame = () => {
    board.value = Array(9).fill(null);
    isXNext.value = true;
    winner.value = null;
  };

  return h(
    'div',
    {
      class: 'tic-tac-toe',
      style: { maxWidth: '400px', margin: '0 auto', padding: '40px', textAlign: 'center' },
    },
    [
      h('h2', { style: { color: '#333' } }, '井字棋场景'),
      h(
        'div',
        { id: 'game-status', style: { fontSize: '20px', marginBottom: '20px' } },
        winner.value ? `赢家: ${winner.value}` : `下一位: ${isXNext.value ? 'X' : 'O'}`,
      ),
      h(
        'div',
        {
          id: 'board',
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 80px)',
            gap: '5px',
            margin: '20px auto',
            width: '250px',
          },
        },
        board.value.map((value, i) =>
          h(
            'button',
            {
              class: 'square',
              id: `square-${i}`,
              onClick: () => makeMove(i),
              style: {
                width: '80px',
                height: '80px',
                fontSize: '48px',
                cursor: 'pointer',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ddd',
              },
            },
            value,
          ),
        ),
      ),
      h(
        'button',
        {
          id: 'btn-reset-game',
          onClick: resetGame,
          style: { padding: '10px 20px', fontSize: '16px', cursor: 'pointer' },
        },
        '重新开始',
      ),
    ],
  );
}

// 10. 天气仪表盘组件
function WeatherDashboardComponent() {
  const cities = [
    { id: 'beijing', name: '北京', temp: '12°C', condition: '晴' },
    { id: 'shanghai', name: '上海', temp: '20°C', condition: '多云' },
    { id: 'guangzhou', name: '广州', temp: '28°C', condition: '晴' },
    { id: 'shenzhen', name: '深圳', temp: '27°C', condition: '阵雨' },
  ];

  const selectedCity = ref('beijing');
  const weather = ref(cities[0]);

  const selectCity = (id: string) => {
    selectedCity.value = id;
    const city = cities.find((c) => c.id === id);
    if (city) weather.value = city;
  };

  return h(
    'div',
    {
      class: 'weather-dashboard',
      style: { maxWidth: '600px', margin: '0 auto', padding: '40px', textAlign: 'center' },
    },
    [
      h('h2', { style: { color: '#333' } }, '天气仪表盘场景'),
      h(
        'div',
        { id: 'city-selector', style: { marginBottom: '20px' } },
        cities.map((city) =>
          h(
            'button',
            {
              class: 'city-button',
              id: `city-${city.id}`,
              'data-city': city.id,
              onClick: () => selectCity(city.id),
              style: {
                padding: '10px 20px',
                margin: '0 5px',
                fontSize: '16px',
                cursor: 'pointer',
                backgroundColor: selectedCity.value === city.id ? '#007bff' : '#f0f0f0',
                color: selectedCity.value === city.id ? 'white' : 'black',
                border: 'none',
                borderRadius: '4px',
              },
            },
            city.name,
          ),
        ),
      ),
      h(
        'div',
        {
          id: 'weather-display',
          style: {
            padding: '40px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f8f9fa',
          },
        },
        [
          h('h3', { id: 'city-name', style: { fontSize: '28px' } }, weather.value.name),
          h(
            'div',
            {
              id: 'temperature',
              style: { fontSize: '64px', fontWeight: 'bold', margin: '20px 0' },
            },
            weather.value.temp,
          ),
          h(
            'div',
            { id: 'condition', style: { fontSize: '24px', color: '#666' } },
            weather.value.condition,
          ),
        ],
      ),
    ],
  );
}

// 场景切换组件
function App() {
  const renderScenario = () => {
    switch (currentScenario.value) {
      case 'counter':
        return h(CounterComponent);
      case 'todo':
        return h(TodoComponent);
      case 'crud-list':
        return h(CrudListComponent);
      case 'form-validation':
        return h(FormValidationComponent);
      case 'color-picker':
        return h(ColorPickerComponent);
      case 'timer':
        return h(TimerComponent);
      case 'shopping-cart':
        return h(ShoppingCartComponent);
      case 'markdown-editor':
        return h(MarkdownEditorComponent);
      case 'tic-tac-toe':
        return h(TicTacToeComponent);
      case 'weather-dashboard':
        return h(WeatherDashboardComponent);
      default:
        return h('div', { style: { textAlign: 'center', padding: '40px' } }, [
          h('h1', { style: { color: '#333' } }, 'Lyt.js E2E 测试场景'),
          h('p', { style: { color: '#666' } }, '请选择一个测试场景'),
        ]);
    }
  };

  return h('div', { style: { maxWidth: '1200px', margin: '0 auto', padding: '20px' } }, [
    h(
      'div',
      {
        style: {
          borderBottom: '1px solid #ddd',
          paddingBottom: '15px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
        },
      },
      [
        h(
          'button',
          {
            'data-scenario': 'home',
            onClick: () => (currentScenario.value = 'home'),
            style: { padding: '8px 16px', cursor: 'pointer' },
          },
          '首页',
        ),
        ...scenarios.map((scenario) =>
          h(
            'button',
            {
              'data-scenario': scenario,
              onClick: () => (currentScenario.value = scenario),
              style: {
                padding: '8px 16px',
                cursor: 'pointer',
                backgroundColor: currentScenario.value === scenario ? '#007bff' : '#f0f0f0',
                color: currentScenario.value === scenario ? 'white' : 'black',
                border: 'none',
                borderRadius: '4px',
              },
            },
            scenario.replace('-', ' '),
          ),
        ),
      ],
    ),
    renderScenario(),
  ]);
}

const app = createApp(App);
app.mount('#app');
