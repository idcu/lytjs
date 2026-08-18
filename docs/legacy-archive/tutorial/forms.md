# 表单处理

表单是 Web 应用中最常用的交互组件之一。本教程将介绍如何在 LytJS 中处理各种表单场景。

## 基础表单绑定

### 简单输入框

```typescript
import { defineComponent, signal } from '@lytjs/core';

export default defineComponent({
  setup() {
    const name = signal('');
    const email = signal('');

    const handleSubmit = (e: Event) => {
      e.preventDefault();
      console.log('提交数据:', { name: name(), email: email() });
    };

    return {
      name,
      email,
      handleSubmit,
    };
  },

  template: `
    <form @submit="handleSubmit">
      <div>
        <label>姓名：</label>
        <input 
          type="text" 
          v-model="name" 
          placeholder="请输入姓名"
        />
      </div>
      <div>
        <label>邮箱：</label>
        <input 
          type="email" 
          v-model="email" 
          placeholder="请输入邮箱"
        />
      </div>
      <button type="submit">提交</button>
    </form>
  `,
});
```

### 复选框与单选框

```typescript
import { defineComponent, signal } from '@lytjs/core';

export default defineComponent({
  setup() {
    const isActive = signal(false);
    const gender = signal('');
    const hobbies = signal<string[]>([]);

    return {
      isActive,
      gender,
      hobbies,
    };
  },

  template: `
    <div>
      <!-- 复选框 -->
      <label>
        <input 
          type="checkbox" 
          v-model="isActive" 
        />
        是否激活
      </label>
      
      <!-- 单选框 -->
      <div>
        <label>
          <input 
            type="radio" 
            v-model="gender" 
            value="male"
          />
          男
        </label>
        <label>
          <input 
            type="radio" 
            v-model="gender" 
            value="female"
          />
          女
        </label>
      </div>
      
      <!-- 多选框 -->
      <div>
        <label>
          <input 
            type="checkbox" 
            v-model="hobbies" 
            value="reading"
          />
          阅读
        </label>
        <label>
          <input 
            type="checkbox" 
            v-model="hobbies" 
            value="sports"
          />
          运动
        </label>
        <label>
          <input 
            type="checkbox" 
            v-model="hobbies" 
            value="music"
          />
          音乐
        </label>
      </div>
    </div>
  `,
});
```

### 下拉选择

```typescript
import { defineComponent, signal } from '@lytjs/core';

export default defineComponent({
  setup() {
    const selected = signal('');
    const options = signal([
      { value: 'js', label: 'JavaScript' },
      { value: 'ts', label: 'TypeScript' },
      { value: 'py', label: 'Python' },
    ]);

    return {
      selected,
      options,
    };
  },

  template: `
    <div>
      <select v-model="selected">
        <option value="">请选择语言</option>
        <option 
          v-for="option in options" 
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <p>已选择：{{ selected }}</p>
    </div>
  `,
});
```

## 表单验证

### 基础验证

```typescript
import { defineComponent, signal, computed } from '@lytjs/core';

export default defineComponent({
  setup() {
    const email = signal('');
    const password = signal('');

    const isValidEmail = computed(() => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email());
    });

    const isValidPassword = computed(() => {
      return password().length >= 6;
    });

    const errors = computed(() => {
      const errs: string[] = [];
      if (!isValidEmail()) errs.push('邮箱格式不正确');
      if (!isValidPassword()) errs.push('密码至少6个字符');
      return errs;
    });

    const handleSubmit = (e: Event) => {
      e.preventDefault();
      if (errors().length === 0) {
        console.log('提交成功');
      }
    };

    return {
      email,
      password,
      errors,
      handleSubmit,
    };
  },

  template: `
    <form @submit="handleSubmit">
      <div>
        <label>邮箱：</label>
        <input 
          type="email" 
          v-model="email"
        />
      </div>
      <div>
        <label>密码：</label>
        <input 
          type="password" 
          v-model="password"
        />
      </div>
      
      <div v-if="errors.length > 0" class="error">
        <p v-for="err in errors" :key="err">{{ err }}</p>
      </div>
      
      <button 
        type="submit" 
        :disabled="errors.length > 0"
      >
        提交
      </button>
    </form>
  `,
});
```

### 自定义验证函数

```typescript
import { defineComponent, signal } from '@lytjs/core';

interface ValidationRule {
  (value: any): boolean | string;
}

export default defineComponent({
  setup() {
    const username = signal('');
    const errors = signal<string[]>([]);

    const validateUsername = (value: string): boolean | string => {
      if (!value) return '用户名不能为空';
      if (value.length < 3) return '用户名至少3个字符';
      if (value.length > 20) return '用户名最多20个字符';
      return true;
    };

    const handleBlur = () => {
      const result = validateUsername(username());
      if (result !== true) {
        errors([result]);
      } else {
        errors([]);
      }
    };

    return {
      username,
      errors,
      handleBlur,
    };
  },

  template: `
    <div>
      <label>用户名：</label>
      <input 
        type="text" 
        v-model="username"
        @blur="handleBlur"
      />
      <p v-if="errors.length > 0" class="error">
        {{ errors[0] }}
      </p>
    </div>
  `,
});
```

## 表单最佳实践

### ✅ 推荐做法

```typescript
// 1. 使用类型安全的表单数据
interface FormData {
  name: string;
  email: string;
  age: number;
}

// 2. 分离验证逻辑
const validators = {
  name: (value: string) => !!value.trim(),
  email: (value: string) => /^\S+@\S+\.\S+$/.test(value),
  age: (value: number) => value >= 18,
};

// 3. 提供用户友好的错误信息
const errorMessages = {
  name: '请输入姓名',
  email: '请输入有效的邮箱',
  age: '年龄必须大于等于18岁',
};
```

### ❌ 避免做法

```typescript
// 避免：在组件内部硬编码验证逻辑
// 更好的方式：抽取为独立的验证函数

// 避免：过度复杂的表单状态管理
// 更好的方式：使用 Store 或专门的表单库
```

## 下一步

- 学习 [API 集成](./api-integration.md)
- 查看 [状态管理](./state-management.md)
- 阅读 [架构文档](../development/ARCHITECTURE.md)
