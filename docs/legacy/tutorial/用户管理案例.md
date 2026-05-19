# 用户管理系统实战案例

本案例展示如何使用 LytJS 构建一个功能完整的用户管理系统，包含状态管理、路由、表单处理等功能。

## 📋 功能清单

- ✅ 用户列表展示
- ✅ 添加新用户
- ✅ 编辑用户信息
- ✅ 删除用户（含确认）
- ✅ 用户搜索过滤
- ✅ 数据统计面板
- ✅ 响应式设计
- ✅ 表单验证

---

## 🏗️ 项目结构

```
examples/user-management/
└── index.html         # 完整应用（包含样式和脚本）
```

---

## 💻 核心功能解析

### 1. 数据结构

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  role: 'admin' | 'editor' | 'user';
  status: 'active' | 'inactive' | 'blocked';
  createdAt: string;
}
```

### 2. 响应式状态

```typescript
import { signal, computed, effect } from '@lytjs/reactivity';

// 用户数据
const users = signal<User[]>([...]);

// 当前编辑的用户ID
const editingUserId = signal<number | null>(null);

// 搜索关键词
const searchKeyword = signal('');

// 过滤后的用户列表
const filteredUsers = computed(() => {
  const keyword = searchKeyword().toLowerCase();
  if (!keyword) return users();
  
  return users().filter(user => 
    user.name.toLowerCase().includes(keyword) ||
    user.email.toLowerCase().includes(keyword)
  );
});
```

### 3. 统计数据

```typescript
const stats = computed(() => ({
  total: users().length,
  active: users().filter(u => u.status === 'active').length,
  new: users().filter(u => {
    const created = new Date(u.createdAt);
    const now = new Date();
    const diffDays = (now - created) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }).length,
  pages: 156
}));
```

### 4. CRUD 操作

```typescript
// 添加用户
const saveUser = () => {
  const currentId = editingUserId();
  
  if (currentId) {
    // 更新
    const usersData = users();
    const index = usersData.findIndex(u => u.id === currentId);
    if (index !== -1) {
      usersData[index] = { ...usersData[index], /* 更新字段 */ };
      users.set([...usersData]);
    }
  } else {
    // 新增
    const newUser = {
      id: Date.now(),
      /* 用户数据 */
      createdAt: new Date().toISOString().split('T')[0]
    };
    users.set([...users(), newUser]);
  }
};

// 删除用户
const deleteUser = (id: number) => {
  const usersData = users();
  const filtered = usersData.filter(u => u.id !== id);
  users.set(filtered);
};
```

### 5. 渲染更新

```typescript
effect(() => {
  filteredUsers();
  renderUserTable();
});

function renderUserTable() {
  const tbody = document.getElementById('userTableBody');
  const data = filteredUsers();
  
  tbody.innerHTML = data.map(user => `
    <tr>
      <td>${user.id}</td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${getRoleBadge(user.role)}</td>
      <td>${getStatusBadge(user.status)}</td>
      <td class="actions">
        <button onclick="editUser(${user.id})">编辑</button>
        <button onclick="showDeleteConfirm(${user.id})">删除</button>
      </td>
    </tr>
  `).join('');
}
```

---

## 🎨 UI 组件使用

本案例可以结合 LytJS UI 组件库：

```typescript
import { Button, Input, Table, Modal, Tag } from '@lytjs/ui';

// 使用 Button 组件
<Button type="primary" onClick={saveUser}>保存</Button>

// 使用 Table 组件
<Table data={filteredUsers()} columns={columns} />

// 使用 Tag 组件展示状态
<Tag type={status === 'active' ? 'success' : 'warning'}>
  {status}
</Tag>
```

---

## 🔑 技术要点

### 1. Signal 使用

```typescript
// 创建 signal
const count = signal(0);

// 读取（函数调用方式）
console.log(count());

// 更新
count.set(10);

// 或者
count.set(prev => prev + 1);
```

### 2. Computed 派生状态

```typescript
const activeUsers = computed(() => {
  return users().filter(u => u.status === 'active');
});

// 自动缓存，只有依赖变化时才重新计算
```

### 3. Effect 副作用

```typescript
effect(() => {
  // 依赖 signal 的代码，signal 变化时自动执行
  document.getElementById('total').textContent = users().length;
});
```

### 4. 表单验证

```typescript
const validateForm = () => {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  
  if (!name || !email) {
    showAlert('error', '请填写必填字段');
    return false;
  }
  
  return true;
};
```

---

## 📊 数据流程图

```
用户操作 → 更新 Signal → 触发 Effect → DOM 更新
    ↓
状态持久化 → 本地存储
    ↓
下次启动 → 从存储加载 → 恢复状态
```

---

## 🚀 运行示例

```bash
# 打开示例目录
cd examples/user-management

# 在浏览器中打开
open index.html
```

---

## 📚 进阶练习

1. 集成 LytJS Store 进行全局状态管理
2. 添加路由系统，支持用户详情页
3. 实现用户分页加载
4. 添加批量导入/导出功能
5. 集成后端 API（使用 plugin-data-fetch）
6. 添加用户头像支持

---

## 🎯 下一步

完成本案例后，继续学习：
- [购物车案例](./购物车案例.md) - 复杂状态管理
- [状态管理](./state-management.md) - 学习使用 Store
- [路由](./routing.md) - 学习使用 Router
