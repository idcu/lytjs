# Contributing to Lyt.js

Thank you for your interest in contributing to Lyt.js! This guide will help you get started with the development process.

## How to Contribute

There are many ways to contribute to Lyt.js:

- **Bug reports**: Submit issues for bugs you encounter
- **Feature requests**: Suggest new features or improvements
- **Documentation**: Improve or translate documentation
- **Code contributions**: Submit pull requests for bug fixes or new features
- **Community support**: Help other users in discussions

---

## Development Environment Setup

### Prerequisites

- **Node.js** >= 18.0
- **npm** >= 9.0 or **pnpm** >= 8.0
- **Git** >= 2.30
- **TypeScript** >= 5.0

### Fork and Clone

```bash
# Fork the repository on Gitee, then clone it
git clone https://gitee.com/YOUR_USERNAME/lytjs.git
cd lytjs

# Add upstream remote
git remote add upstream https://gitee.com/lytjs/lytjs.git
```

### Install Dependencies

```bash
# Install dependencies
npm install

# Or use pnpm (recommended)
pnpm install
```

### Build the Project

```bash
# Build all packages
npm run build

# Build a specific package
npm run build --workspace=@lytjs/core
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests for a specific package
npm test --workspace=@lytjs/core

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

### Start Development Server

```bash
# Start the docs development server
npm run docs:dev

# Start the example app
npm run example
```

---

## Project Structure

```
lytjs/
├── packages/
│   ├── core/           # Core package (createApp, h, plugin system)
│   ├── reactivity/     # Reactivity system (ref, reactive, computed, watch)
│   ├── component/      # Component system (defineComponent, lifecycle, slots)
│   ├── renderer/       # Renderer (DOM, SSR, Vapor modes)
│   ├── compiler/       # Template compiler (parse, transform, generate)
│   ├── router/         # Router package
│   ├── store/          # State management package
│   ├── components/     # UI component library
│   └── cli/            # CLI tool
├── docs/               # Documentation
├── examples/           # Example applications
├── tests/              # Test suites
└── scripts/            # Build and utility scripts
```

---

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable `strict` mode
- Provide proper type annotations for public APIs
- Avoid `any` — use `unknown` or specific types instead

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files (source) | camelCase | `reactiveEffect.ts` |
| Files (test) | camelCase + `.test` | `reactiveEffect.test.ts` |
| Directories | kebab-case | `reactivity-system/` |
| Variables | camelCase | `const isActive = true` |
| Constants | UPPER_SNAKE_CASE | `const MAX_SIZE = 100` |
| Functions | camelCase | `function createApp()` |
| Classes | PascalCase | `class ComponentInstance` |
| Interfaces | PascalCase with `I` prefix (optional) | `interface VNode` |
| Types | PascalCase | `type PropType = ...` |
| Enums | PascalCase | `enum ShapeFlags` |

### Code Style

- Use 2 spaces for indentation (no tabs)
- Use single quotes for strings
- Add semicolons at the end of statements
- Add trailing commas in multi-line objects/arrays
- Maximum line length: 100 characters

### Example

```typescript
import { ref, computed, type Ref } from '@lytjs/reactivity'

interface CounterOptions {
  initialValue?: number
  step?: number
}

function useCounter(options: CounterOptions = {}) {
  const { initialValue = 0, step = 1 } = options

  const count: Ref<number> = ref(initialValue)
  const doubleCount = computed(() => count.value * 2)

  function increment() {
    count.value += step
  }

  function decrement() {
    count.value -= step
  }

  function reset() {
    count.value = initialValue
  }

  return {
    count,
    doubleCount,
    increment,
    decrement,
    reset,
  }
}

export { useCounter }
export type { CounterOptions }
```

### Comments

- Use JSDoc for public API documentation
- Add comments for complex logic
- Use `// TODO:` for pending work
- Use `// FIXME:` for known issues

```typescript
/**
 * Creates a reactive reference.
 * @param value - The initial value
 * @returns A reactive Ref object
 */
export function ref<T>(value: T): Ref<T> {
  // Implementation
}
```

---

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, semicolons, etc.) |
| `refactor` | Code refactoring (no new features or bug fixes) |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `build` | Build system or dependency changes |
| `ci` | CI/CD configuration changes |
| `chore` | Other changes (maintenance, etc.) |
| `revert` | Revert a previous commit |

### Examples

```
feat(core): add nextTick API support
fix(reactivity): resolve memory leak in watch cleanup
docs(en): add English documentation for reactivity API
test(component): add unit tests for slot rendering
refactor(renderer): optimize patch algorithm for static nodes
```

---

## Pull Request Process

### 1. Create a Branch

```bash
# Create a feature branch from main
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name

# Or a bugfix branch
git checkout -b fix/issue-description
```

### 2. Make Changes

- Write clean, well-documented code
- Add tests for new features or bug fixes
- Update documentation if needed
- Ensure all existing tests pass

### 3. Run Checks

```bash
# Run linter
npm run lint

# Run type checking
npm run type-check

# Run all tests
npm test

# Build the project
npm run build
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat(core): add your feature description"
```

### 5. Push and Create PR

```bash
# Push to your fork
git push origin feat/your-feature-name

# Create a Pull Request on Gitee
# Go to https://gitee.com/lytjs/lytjs/pulls and click "New Pull Request"
```

### PR Checklist

Before submitting your PR, make sure:

- [ ] Code follows the project's coding standards
- [ ] All tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] New features include tests
- [ ] Documentation is updated (if applicable)
- [ ] Commit messages follow the Conventional Commits format
- [ ] PR description clearly explains the changes

---

## Code Review Process

### Review Criteria

Reviewers will evaluate PRs based on:

1. **Correctness** — Does the code do what it's supposed to?
2. **Code quality** — Is the code clean, readable, and well-structured?
3. **Test coverage** — Are there adequate tests?
4. **Documentation** — Is the documentation updated?
5. **Performance** — Are there any performance implications?
6. **Compatibility** — Does it maintain backward compatibility?

### Review Workflow

1. **Automated checks** — CI runs tests, linter, and type checking
2. **Peer review** — At least one maintainer reviews the code
3. **Feedback** — Reviewer provides feedback or requests changes
4. **Approval** — After addressing feedback, the PR is approved
5. **Merge** — A maintainer merges the PR

### Addressing Review Feedback

- Respond to all comments promptly
- Make requested changes in new commits
- Push updates to the same branch
- Mark resolved conversations

---

## Reporting Bugs

When reporting a bug, please include:

1. **Lyt.js version**
2. **Node.js version and OS**
3. **Minimal reproduction code**
4. **Expected behavior**
5. **Actual behavior**
6. **Steps to reproduce**
7. **Error messages or stack traces**

### Bug Report Template

```
**Lyt.js Version:** x.x.x
**Node.js Version:** xx.x.x
**OS:** macOS / Windows / Linux

**Description:**
A clear description of the bug.

**Reproduction Code:**
```javascript
// Minimal code that reproduces the bug
```

**Expected Behavior:**
What you expected to happen.

**Actual Behavior:**
What actually happened.

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3
```

---

## Feature Requests

When requesting a feature, please include:

1. **Use case** — Why do you need this feature?
2. **Proposed API** — How would you like the API to look?
3. **Examples** — Code examples showing the desired usage
4. **Alternatives** — Any workarounds you've considered

---

## License

By contributing to Lyt.js, you agree that your contributions will be licensed under the project's license.

---

## Thank You

Thank you for contributing to Lyt.js! Every contribution, no matter how small, helps make the project better.
