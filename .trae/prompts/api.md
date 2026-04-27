# Lyt.js API 生成提示词

## 系统提示词

你是一个专业的 Lyt.js 后端开发助手。Lyt.js 是一个纯原生、零运行时依赖、超轻量的前端框架，提供与 Vue 3 兼容的 API。

## 任务：生成 Lyt.js API Route

请根据以下要求生成一个完整的 Lyt.js API Route：

### API 信息
- API 名称：{{ name }}
- 描述：{{ description }}

### 要求
1. 使用简单的请求处理函数
2. 包含适当的错误处理
3. 代码规范、可运行
4. 添加适当的注释

### 输出格式
只返回代码，不要包含任何额外说明。

---

## 示例：生成 Users API

```javascript
// users.js
export default async function handler(req, res) {
  const method = req.method;

  switch (method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    case 'PUT':
      return handlePut(req, res);
    case 'DELETE':
      return handleDelete(req, res);
    default:
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
  }
}

// 获取用户列表
async function handleGet(req, res) {
  try {
    // 模拟数据
    const users = [
      { id: 1, name: '张三', email: 'zhangsan@example.com' },
      { id: 2, name: '李四', email: 'lisi@example.com' },
      { id: 3, name: '王五', email: 'wangwu@example.com' }
    ];

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// 创建用户
async function handlePost(req, res) {
  try {
    // 解析请求体
    const { name, email } = req.body;

    // 验证
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // 模拟创建
    const newUser = {
      id: Date.now(),
      name,
      email
    };

    res.status(201).json({
      success: true,
      message: 'User created',
      data: newUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// 更新用户
async function handlePut(req, res) {
  try {
    const { id } = req.params || {};
    const { name, email } = req.body;

    // 验证
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    res.json({
      success: true,
      message: 'User updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// 删除用户
async function handleDelete(req, res) {
  try {
    const { id } = req.params || {};

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    res.json({
      success: true,
      message: 'User deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
```

---

## 示例：生成 Products API

```javascript
// products.js
export default async function handler(req, res) {
  const method = req.method;

  switch (method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    case 'PUT':
      return handlePut(req, res);
    case 'DELETE':
      return handleDelete(req, res);
    default:
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
  }
}

// 获取产品列表
async function handleGet(req, res) {
  try {
    const { page = 1, limit = 10, search } = req.query;

    // 模拟数据
    const products = [
      { id: 1, name: '产品 A', price: 99, description: '这是产品 A 的描述' },
      { id: 2, name: '产品 B', price: 199, description: '这是产品 B 的描述' },
      { id: 3, name: '产品 C', price: 299, description: '这是产品 C 的描述' }
    ];

    // 搜索过滤
    let filteredProducts = products;
    if (search) {
      filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + Number(limit);
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedProducts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filteredProducts.length,
        totalPages: Math.ceil(filteredProducts.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// 创建产品
async function handlePost(req, res) {
  try {
    const { name, price, description } = req.body;

    // 验证
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Name and price are required'
      });
    }

    // 模拟创建
    const newProduct = {
      id: Date.now(),
      name,
      price: Number(price),
      description: description || ''
    };

    res.status(201).json({
      success: true,
      message: 'Product created',
      data: newProduct
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// 更新产品
async function handlePut(req, res) {
  try {
    const { id } = req.params || {};
    const { name, price, description } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    res.json({
      success: true,
      message: 'Product updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// 删除产品
async function handleDelete(req, res) {
  try {
    const { id } = req.params || {};

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
```

---

现在，请根据以上要求，生成 Lyt.js API Route。
