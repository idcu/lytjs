# Lyt.js AI 集成使用示例

## 1. 初始化配置

```bash
lyt-ai init
```

这会在项目根目录创建 `.lytrc.json` 文件：

```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "your-api-key-here",
    "model": "gpt-4o",
    "baseUrl": "https://api.openai.com/v1",
    "temperature": 0.7,
    "maxTokens": 2000
  }
}
```

## 2. 生成组件（模板）

```bash
# 基础组件
lytx generate component MyButton

# 按钮组件
lytx generate component MyButton --type button

# 输入框组件
lytx generate component MyInput --type input

# 卡片组件
lytx generate component MyCard --type card

# 不生成样式
lytx generate component MyComponent --no-style
```

## 3. 生成组件（AI）

```bash
# 使用 AI 生成按钮组件
lytx generate component FancyButton --type button --ai

# 使用 AI 生成表单组件
lytx generate component LoginForm --type form --ai

# 自定义描述
lytx generate component ProductCard --type card --ai --description "一个产品卡片组件，显示产品图片、标题、价格和购买按钮"
```

## 4. 生成 Store

```bash
# 模板生成
lytx generate store counter

# AI 生成
lytx generate store user --ai --description "用户信息 Store，包含用户资料、登录状态等"
```

## 5. 生成页面

```bash
# 模板生成
lytx generate page Home

# AI 生成
lytx generate page ProductList --ai --description "产品列表页面，包含搜索、筛选和分页功能"
```

## 6. 生成 API

```bash
# 模板生成
lytx generate api users

# AI 生成
lytx generate api products --ai --description "产品 API，包含 CRUD 操作"
```

## 7. 使用环境变量

```bash
# 设置 API Key
export LYT_AI_API_KEY=sk-...

# 设置模型
export LYT_AI_MODEL=gpt-4o

# 然后正常使用
lytx generate component MyComponent --ai
```

## 8. 使用 @lytjs/ai 编程式使用

```javascript
import { AIGenerator } from '@lytjs/ai';

// 创建生成器
const generator = new AIGenerator({
  provider: 'openai',
  apiKey: 'your-api-key',
  model: 'gpt-4o'
});

// 生成组件
const result = await generator.generateComponent({
  name: 'MyComponent',
  type: 'button',
  description: '一个漂亮的按钮组件'
});

console.log(result.code);
```

## 9. 在 AI IDE 中使用提示词

在 Trae、Cursor 等 AI IDE 中，你可以直接使用 `.trae/prompts/` 目录中的提示词：

- [组件生成提示词](./prompts/component.md)
- [Store 生成提示词](./prompts/store.md)
- [页面生成提示词](./prompts/page.md)
- [API 生成提示词](./prompts/api.md)

## 10. 自定义 AI 提供商

支持 OpenAI 兼容 API 和 Anthropic Claude：

```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o",
    "baseUrl": "https://your-custom-api.com/v1"
  }
}
```

## 11. 最佳实践

1. **先模板后 AI**: 先用模板生成基础代码，再用 AI 优化细节
2. **提供详细描述**: 使用 `--description` 参数提供更多上下文
3. **检查生成代码**: AI 生成的代码需要人工检查
4. **版本控制**: 在 `.gitignore` 中添加 `.lytrc.json`，避免泄露 API Key
