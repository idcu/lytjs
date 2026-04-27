# AI Integration Guide

## Overview

`@lytjs/ai` is the AI-assisted development toolkit for the Lyt.js framework, providing the following core capabilities:

- **Smart Component Generation** — Generate Lyt.js component code from natural language descriptions
- **Code Completion** — Intelligent code completion at inline, function, and component levels
- **Error Fixing** — Automatically analyze and fix compilation errors, runtime errors, and type errors
- **Multi-Model Support** — OpenAI GPT-4, Anthropic Claude, and local Ollama
- **Streaming Output** — Real-time streaming of AI-generated content
- **Code Validation** — Automatic syntax and Lyt.js compatibility validation

All AI features are **optional** and do not affect the core framework functionality. When AI is unavailable, it automatically falls back to template-based generation.

## Installation

```bash
npm install @lytjs/ai

# or using pnpm
pnpm add @lytjs/ai
```

## Configuration Guide

### Option 1: Configuration File

Create a `.lytrc.json` file in your project root:

```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "your-api-key-here",
    "model": "gpt-4o",
    "baseUrl": "https://api.openai.com/v1",
    "temperature": 0.7,
    "maxTokens": 2000,
    "timeout": 30000
  }
}
```

### Option 2: Environment Variables

```bash
# OpenAI
export LYT_AI_PROVIDER=openai
export LYT_AI_APIKEY=sk-xxx
export LYT_AI_MODEL=gpt-4o

# Anthropic Claude
export LYT_AI_PROVIDER=claude
export LYT_AI_APIKEY=sk-ant-xxx
export LYT_AI_MODEL=claude-3-5-sonnet-20241022

# Ollama (Local)
export LYT_AI_PROVIDER=ollama
export LYT_AI_MODEL=llama3
export LYT_AI_BASEURL=http://localhost:11434
```

### Option 3: Code Configuration

```typescript
import { LytAIAssistant } from '@lytjs/ai'

const assistant = new LytAIAssistant({
  provider: 'openai',
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
  },
})
```

### Model Selection

| Provider | Model | Characteristics |
|----------|-------|-----------------|
| OpenAI | gpt-4o | Best capabilities, recommended for component generation |
| OpenAI | gpt-4o-mini | Fast and economical, suitable for code completion |
| Claude | claude-3-5-sonnet | High code generation quality, long context support |
| Claude | claude-3-5-haiku | Fast, suitable for simple tasks |
| Ollama | llama3 | Runs locally, no API key required |
| Ollama | codellama | Locally optimized for code generation |

## Component Generation Tutorial

### Basic Usage

```typescript
import { LytAIAssistant } from '@lytjs/ai'

const assistant = new LytAIAssistant({
  provider: 'openai',
  openai: { apiKey: 'sk-xxx' },
})

// Generate component from description
const result = await assistant.generateComponent(
  'A search input component with debounce, clear button, and search icon'
)

console.log(result.parsed.template)  // template section
console.log(result.parsed.script)    // script section
console.log(result.parsed.style)     // style section
console.log(result.valid)            // validation passed
```

### Specifying Component Type

```typescript
const result = await assistant.generateComponent(
  'A data table with sorting and pagination',
  {
    name: 'DataTable',
    type: 'table',
    style: true,
    validate: true,
  }
)
```

### Streaming Generation

```typescript
for await (const chunk of assistant.streamGenerateComponent('A login form')) {
  process.stdout.write(chunk.content)
}
```

### Using CLI

```bash
# Initialize configuration
lyt-ai init

# Generate component (template)
lyt-ai component MyButton --type button

# Generate component (AI)
lyt-ai component MyButton --type button --ai

# Generate Store
lyt-ai store counter --ai

# Generate page
lyt-ai page Home --ai
```

## Code Completion Tutorial

### Smart Completion

```typescript
const completion = await assistant.completeCode(
  'import { ref, computed } from "@lytjs/reactivity"\n\nconst count = |',
  {
    filePath: 'src/components/Counter.lyt',
  }
)

console.log(completion)  // ref(0)
```

### Streaming Completion

```typescript
for await (const chunk of assistant.streamCompleteCode(
  'const items = ref([])\nconst filteredItems = |'
)) {
  process.stdout.write(chunk.content)
}
```

## Error Fixing Tutorial

```typescript
const suggestion = await assistant.fixError(
  "Property 'value' does not exist on type 'never'",
  `const input = ref()
console.log(input.value)`,
  {
    filePath: 'src/components/Input.lyt',
    validate: true,
  }
)

console.log(suggestion.fixedCode)      // Fixed code
console.log(suggestion.explanation)    // Fix explanation
console.log(suggestion.validation)     // Validation result
```

## Chat Feature

```typescript
// Streaming chat
const messages = [
  { role: 'user', content: 'How do I use routing in Lyt.js?' },
]

for await (const chunk of assistant.chat(messages)) {
  process.stdout.write(chunk.content)
}

// Non-streaming chat
const response = await assistant.chatSync([
  { role: 'user', content: 'What are the differences between Lyt.js and Vue 3?' },
])

console.log(response.content)

// Manage chat history
assistant.clearHistory()
console.log(assistant.getHistory())
```

## Code Parsing and Validation

### Parsing Component Code

```typescript
import { parseComponentCode } from '@lytjs/ai'

const parsed = parseComponentCode(aiGeneratedCode)

console.log(parsed.name)            // Component name
console.log(parsed.template)        // template section
console.log(parsed.script)          // script section
console.log(parsed.style)           // style section
console.log(parsed.isScriptSetup)   // Uses script setup
console.log(parsed.props)           // Extracted props
console.log(parsed.emits)           // Extracted emits
console.log(parsed.slots)           // Extracted slots
```

### Validating Code

```typescript
import { validateComponentCode } from '@lytjs/ai'

const result = validateComponentCode(code)

if (result.valid) {
  console.log('Code is valid!')
} else {
  for (const error of result.errors) {
    console.error(`[${error.section}] ${error.message}`)
  }
}

for (const warning of result.warnings) {
  console.warn(`[${warning.section}] ${warning.message}`)
}
```

## Custom Prompt Templates

### Component Generation Prompts

```typescript
import {
  buttonComponentPrompt,
  formComponentPrompt,
  customComponentPrompt,
} from '@lytjs/ai'

// Use predefined Button Prompt
const prompt = buttonComponentPrompt({
  name: 'PrimaryButton',
  type: 'button',
  description: 'Primary color button',
  props: [
    { name: 'size', type: 'String', default: "'medium'" },
  ],
})

// Custom component Prompt
const customPrompt = customComponentPrompt(
  'An animated sidebar navigation with collapse/expand support',
  { name: 'SideNav', style: 'modern minimalist' }
)
```

### Code Completion Prompts

```typescript
import { inlineCompletionPrompt, functionCompletionPrompt } from '@lytjs/ai'

// Inline completion
const prompt1 = inlineCompletionPrompt({
  beforeCursor: 'const result = await fetch(url)\nconst data = |',
  afterCursor: '\nconsole.log(data)',
  filePath: 'src/utils/api.ts',
})

// Function completion
const prompt2 = functionCompletionPrompt({
  signature: 'function debounce(fn: Function, delay: number): Function',
  description: 'Create a debounced function with delay',
  returnType: 'Function',
})
```

### Error Fix Prompts

```typescript
import { compileErrorFixPrompt, typeErrorFixPrompt } from '@lytjs/ai'

// Compilation error
const prompt1 = compileErrorFixPrompt({
  errorMessage: 'Unexpected token }',
  code: 'function test() { return { }',
  filePath: 'src/utils/test.ts',
})

// Type error
const prompt2 = typeErrorFixPrompt({
  errorMessage: "Type 'string' is not assignable to type 'number'",
  code: 'const count: number = "hello"',
  allowAny: false,
})
```

## Provider Development Guide

### Implementing a Custom Provider

```typescript
import type { AIProviderInterface, CompleteOptions, StreamChunk } from '@lytjs/ai'
import type { ChatMessage, AIResponse } from '@lytjs/ai'

class MyCustomProvider implements AIProviderInterface {
  readonly name = 'custom'
  readonly models = ['my-model-v1', 'my-model-v2']
  model: string = 'my-model-v1'

  async complete(prompt: string, options?: CompleteOptions): Promise<AIResponse> {
    // Implement your API call logic
    const response = await fetch('https://my-api.com/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, ...options }),
    })
    const data = await response.json()
    return { content: data.text }
  }

  async chat(messages: ChatMessage[], options?: CompleteOptions): Promise<AIResponse> {
    // Implement chat API call
    return this.complete(messages.map(m => m.content).join('\n'), options)
  }

  async *stream(prompt: string, options?: CompleteOptions): AsyncGenerator<StreamChunk> {
    // Implement streaming output
    yield { content: 'streamed text', done: false }
    yield { content: '', done: true }
  }

  async *streamChat(messages: ChatMessage[], options?: CompleteOptions): AsyncGenerator<StreamChunk> {
    yield* this.stream(messages.map(m => m.content).join('\n'), options)
  }

  async validateApiKey(): Promise<boolean> {
    // Validate API key
    return true
  }
}
```

### Using a Custom Provider

```typescript
const assistant = new LytAIAssistant({
  customProvider: new MyCustomProvider(),
})
```

## AI Playground

Open `packages/ai/playground/index.html` to use the interactive AI Playground in your browser:

- **Chat** — Conversate with the AI assistant
- **Component Generator** — Enter descriptions to generate component code
- **Code Completion** — Intelligent code completion
- **Provider Switching** — Supports OpenAI / Claude / Ollama
- **API Key Configuration** — Configure API keys in the interface

## Fallback Strategy

When AI generation fails, `AIGenerator` automatically falls back to template-based generation:

```typescript
import { AIGenerator } from '@lytjs/ai'

// useAI=false forces template generation
const generator = new AIGenerator(undefined, false)

const result = await generator.generateComponent({
  name: 'MyButton',
  type: 'button',
})

// result.usedAI === false
// result.code contains template-generated code
```

## Important Notes

1. **API Key Security** — Never commit API keys to version control; use environment variables or config files
2. **Network Dependency** — AI features require network connectivity (except Ollama)
3. **Token Consumption** — Monitor token usage to avoid unexpected costs
4. **Code Review** — AI-generated code should be manually reviewed for quality and security
5. **Optional Features** — All AI features are optional and do not affect core framework functionality
