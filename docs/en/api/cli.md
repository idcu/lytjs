# @lytjs/cli -- CLI API

The Lyt.js command-line tool provides project creation, development server, and production build capabilities. Implemented with pure Node.js, with zero third-party dependencies.

## Installation

```bash
# Global install
npm install -g @lytjs/cli

# Or run directly with npx
npx @lytjs/cli create my-app
```

## Usage

```bash
lyt <command> [options] [args]
```

---

## Commands

### create

Creates a new Lyt.js project.

```bash
lyt create <name> [options]
```

#### Parameters

| Parameter | Description |
|-----------|-------------|
| `<name>` | Project name (also used as directory name) |

#### Options

| Option | Description |
|--------|-------------|
| `--template <tpl>` | Project template (default: `spa`), available: `spa` |

#### Examples

```bash
# Create a project
lyt create my-app

# Specify template
lyt create my-app --template spa
```

---

### dev

Starts a local development server.

```bash
lyt dev [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `-p, --port <port>` | Server port (default: 3000) |
| `--no-hmr` | Disable hot module replacement |

#### Features

- Static file serving
- On-the-fly TypeScript compilation
- Hot Module Replacement (HMR)
- WebSocket real-time communication

#### Examples

```bash
# Default start
lyt dev

# Specify port
lyt dev --port 8080

# Disable HMR
lyt dev --no-hmr
```

---

### build

Builds for production.

```bash
lyt build [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `--minify` | Minify code (remove whitespace and comments) |
| `-o, --outDir <dir>` | Output directory (default: `dist`) |
| `--entry <file>` | Entry file (default: `index.html`) |

#### Features

- TypeScript compilation
- Module bundling (inline dependencies)
- Remove console.log
- Source Map generation
- Static asset copying

#### Examples

```bash
# Default build
lyt build

# Minify and specify output directory
lyt build --minify --outDir ./output

# Specify entry file
lyt build --entry src/main.html
```

---

## Global Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Display help information |
| `-v, --version` | Display version number |

---

## Internal Modules

The CLI tool consists of the following modules:

### create.ts

Project creation module. Generates project structure based on a template.

```typescript
function createProject(name: string, options: { template: string }): Promise<void>
```

### dev.ts

Development server module. Starts an HTTP server with on-the-fly TypeScript compilation and HMR.

```typescript
function startDevServer(options: { port: number; hmr: boolean }): void
```

### build.ts

Build module. Compiles TypeScript, bundles modules, and optimizes output.

```typescript
function buildProject(options: { minify: boolean; outDir: string; entry: string }): Promise<void>
```

### utils.ts

Utility module. Provides CLI argument parsing, colored output, and logging.

```typescript
function parseArgs(argv: string[]): { command: string; args: string[]; options: Record<string, any> }
function colorText(text: string, color: string): string
const logger: { log: Function; error: Function; warn: Function; info: Function }
```
