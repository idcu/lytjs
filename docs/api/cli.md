# @lytjs/cli API Reference

## Installation

```bash
pnpm add -D @lytjs/cli
```

## Commands

### lytjs create [project-name]

Create a new LytJS project.

**Options:**

- `--template` - Project template (default, minimal, ssr)
- `--force` - Overwrite existing directory

### lytjs add <type> <name>

Generate a component, page, or store.

**Types:**

- `component` - Generate a .lyt component
- `page` - Generate a page component
- `store` - Generate a store module

**Examples:**

```bash
lytjs add component Button
lytjs add page About
lytjs add store user
```

### lytjs dev

Start the development server.

**Options:**

- `--port` - Server port
- `--host` - Server host
- `--open` - Open in browser

### lytjs build

Build for production.

**Options:**

- `--outDir` - Output directory
- `--ssr` - Build for SSR
- `--minify` - Minify output

### lytjs test

Run tests with Vitest.

**Options:**

- `--watch` - Watch mode
- `--coverage` - Generate coverage
- `--grep` - Filter tests by pattern

### lytjs templates

List available project templates.
