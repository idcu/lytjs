# LytJS (npm, Vapor) PR Preparation Guide

This guide explains how to prepare and submit the LytJS Vapor mode implementation to js-framework-benchmark.

## Overview

This implementation uses the `@lytjs/renderer` package from npm, version 6.9.x, which provides Vapor mode - a direct DOM manipulation approach without Virtual DOM overhead.

## File Structure

```
lytjs-npm-vapor/
├── index.html          # Main implementation file
├── package.json        # Package configuration
├── README.md           # This file
└── vite.config.js      # Vite configuration
```

## Steps to Prepare

### 1. Install Dependencies

```bash
cd lytjs-npm-vapor
npm install
```

### 2. Test Locally

```bash
# Option 1: Using Python
python -m http.server 8080

# Option 2: Using Vite
npm run dev
```

Then open http://localhost:8080 in your browser and test all buttons.

### 3. Verify Functionality

- [ ] Create 1,000 rows
- [ ] Create 10,000 rows
- [ ] Append 1,000 rows
- [ ] Update every 10th row
- [ ] Clear
- [ ] Swap Rows
- [ ] Select row (click on first column)
- [ ] Delete row (click on × button)

## Submitting to js-framework-benchmark

### Step 1: Fork the Repository

1. Go to https://github.com/krausest/js-framework-benchmark
2. Click "Fork" in the top right
3. Choose your account

### Step 2: Clone and Prepare

```bash
git clone https://github.com/YOUR_USERNAME/js-framework-benchmark.git
cd js-framework-benchmark
git checkout -b add-lytjs-npm-vapor
```

### Step 3: Copy Implementation

```bash
mkdir -p frameworks/keyed/lytjs-npm-vapor
# Copy all files from this directory to frameworks/keyed/lytjs-npm-vapor/
```

### Step 4: Commit and Push

```bash
git add frameworks/keyed/lytjs-npm-vapor
git commit -m "Add LytJS (npm, Vapor) v6.9.x"
git push origin add-lytjs-npm-vapor
```

### Step 5: Create Pull Request

Go to your forked repository on GitHub and create a Pull Request.

## PR Description Template

```markdown
## LytJS (npm, Vapor) v6.9.x

### About LytJS

LytJS is a lightweight, zero-dependency frontend framework that offers multiple rendering modes.

### Features

- 🚀 **Zero runtime dependencies**
- ⚡ **Vapor mode** - Direct DOM manipulation without Virtual DOM
- 📦 **Small bundle size**
- 🔧 **TypeScript support**

### Implementation Details

This implementation uses the `@lytjs/renderer` npm package (v6.9.x) which provides `defineVaporComponent` and `createVaporApp` for Vapor mode, which provides direct DOM manipulation without Virtual DOM overhead, similar to Vue Vapor.

### Links

- Project: https://github.com/lytjs/lytjs
- Documentation: https://lytjs.dev
```

## Notes

- The package.json uses `^6.9.0` to ensure compatibility with the latest patch versions
- The implementation follows the standard js-framework-benchmark structure
- All functionality from the original benchmark is implemented
