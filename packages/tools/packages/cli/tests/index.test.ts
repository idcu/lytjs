/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @lytjs/cli unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { runCli } from '../src/commands/run';
import { create, listTemplates } from '../src/commands/create';
import { add } from '../src/commands/add';
import { logger } from '../src/utils/logger';
import { exists, isEmptyDir, ensureDir, writeFile, readFile } from '../src/utils/fs';
import {
  detectPackageManager,
  getInstallCommand,
  getRunCommand,
  getAddCommand,
} from '../src/utils/package';

// Mock fs module - use inline factory to avoid hoisting issues
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
  },
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

// Get mocked functions
const mockExistsSync = vi.mocked(fs.existsSync);
const mockMkdirSync = vi.mocked(fs.mkdirSync);
const mockWriteFileSync = vi.mocked(fs.writeFileSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockReaddirSync = vi.mocked(fs.readdirSync);
const mockStatSync = vi.mocked(fs.statSync);

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn(() => ({
    on: vi.fn(),
  })),
}));

describe('@lytjs/cli', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logger', () => {
    it('should have all log methods', () => {
      expect(logger.info).toBeDefined();
      expect(logger.success).toBeDefined();
      expect(logger.warning).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.dim).toBeDefined();
      expect(logger.bold).toBeDefined();
    });
  });

  describe('fs utils', () => {
    describe('exists', () => {
      it('should return true if path exists', () => {
        mockExistsSync.mockReturnValue(true);
        expect(exists('/some/path')).toBe(true);
      });

      it('should return false if path does not exist', () => {
        mockExistsSync.mockReturnValue(false);
        expect(exists('/some/path')).toBe(false);
      });
    });

    describe('isEmptyDir', () => {
      it('should return true for non-existent directory', () => {
        mockExistsSync.mockReturnValue(false);
        expect(isEmptyDir('/nonexistent')).toBe(true);
      });

      it('should return true for empty directory', () => {
        mockExistsSync.mockReturnValue(true);
        mockReaddirSync.mockReturnValue([]);
        expect(isEmptyDir('/empty')).toBe(true);
      });

      it('should return false for non-empty directory', () => {
        mockExistsSync.mockReturnValue(true);
        mockReaddirSync.mockReturnValue(['file.txt']);
        expect(isEmptyDir('/notempty')).toBe(false);
      });
    });

    describe('ensureDir', () => {
      it('should create directory if it does not exist', () => {
        mockExistsSync.mockReturnValue(false);
        ensureDir('/new/dir');
        expect(mockMkdirSync).toHaveBeenCalledWith('/new/dir', { recursive: true });
      });

      it('should not create directory if it exists', () => {
        mockExistsSync.mockReturnValue(true);
        ensureDir('/existing/dir');
        expect(mockMkdirSync).not.toHaveBeenCalled();
      });
    });

    describe('writeFile', () => {
      it('should write file with content', () => {
        writeFile('/path/to/file.txt', 'content');
        expect(mockWriteFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'content', 'utf-8');
      });

      it('should create parent directories', () => {
        writeFile('/path/to/nested/file.txt', 'content');
        expect(mockMkdirSync).toHaveBeenCalledWith('/path/to/nested', { recursive: true });
      });
    });

    describe('readFile', () => {
      it('should read file as string', () => {
        mockReadFileSync.mockReturnValue('file content');
        const result = readFile('/path/to/file.txt');
        expect(result).toBe('file content');
        expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'utf-8');
      });
    });
  });

  describe('package manager utils', () => {
    describe('detectPackageManager', () => {
      it('should detect pnpm from lockfile', () => {
        mockExistsSync.mockImplementation((path: string) => path.includes('pnpm-lock.yaml'));
        expect(detectPackageManager()).toBe('pnpm');
      });

      it('should detect yarn from lockfile', () => {
        mockExistsSync.mockImplementation((path: string) => path.includes('yarn.lock'));
        expect(detectPackageManager()).toBe('yarn');
      });

      it('should detect npm from lockfile', () => {
        mockExistsSync.mockImplementation((path: string) => path.includes('package-lock.json'));
        expect(detectPackageManager()).toBe('npm');
      });
    });

    describe('getInstallCommand', () => {
      it('should return correct install command for pnpm', () => {
        expect(getInstallCommand('pnpm')).toBe('pnpm install');
      });

      it('should return correct install command for yarn', () => {
        expect(getInstallCommand('yarn')).toBe('yarn');
      });

      it('should return correct install command for npm', () => {
        expect(getInstallCommand('npm')).toBe('npm install');
      });
    });

    describe('getRunCommand', () => {
      it('should return correct run command for pnpm', () => {
        expect(getRunCommand('pnpm', 'dev')).toBe('pnpm run dev');
      });

      it('should return correct run command for yarn', () => {
        expect(getRunCommand('yarn', 'dev')).toBe('yarn dev');
      });

      it('should return correct run command for npm', () => {
        expect(getRunCommand('npm', 'dev')).toBe('npm run dev');
      });
    });

    describe('getAddCommand', () => {
      it('should return correct add command for pnpm', () => {
        expect(getAddCommand('pnpm', 'lodash')).toBe('pnpm add lodash');
      });

      it('should return correct dev add command for pnpm', () => {
        expect(getAddCommand('pnpm', 'typescript', true)).toBe('pnpm add -D typescript');
      });
    });
  });

  describe('runCli', () => {
    it('should show help for --help', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runCli(['--help']);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should show version for --version', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runCli(['--version']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('6.0.0'));
      consoleSpy.mockRestore();
    });

    it('should show help when no command provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await runCli([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should error on unknown command', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      try {
        await runCli(['unknown-command']);
      } catch {
        // Expected
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
      consoleSpy.mockRestore();
      processExit.mockRestore();
    });

    it('should show help for add command with missing type', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      try {
        await runCli(['add']);
      } catch {
        // Expected
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
      processExit.mockRestore();
    });
  });

  describe('create command', () => {
    it('should error if directory exists and not empty', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['existing-file']);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      try {
        await create('existing-project');
      } catch {
        // Expected
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
      consoleSpy.mockRestore();
      processExit.mockRestore();
    });

    it('should create project files', async () => {
      mockExistsSync.mockReturnValue(false);

      await create('new-project', { force: true });

      const packageJsonCall = mockWriteFileSync.mock.calls.find((call: any[]) =>
        call[0].includes('package.json'),
      );
      expect(packageJsonCall).toBeDefined();

      const viteConfigCall = mockWriteFileSync.mock.calls.find((call: any[]) =>
        call[0].includes('vite.config.ts'),
      );
      expect(viteConfigCall).toBeDefined();
    });

    it('should create router template project', async () => {
      mockExistsSync.mockReturnValue(false);

      await create('router-project', { force: true, template: 'router' });

      const packageJsonCall = mockWriteFileSync.mock.calls.find((call: any[]) =>
        call[0].includes('package.json'),
      );
      expect(packageJsonCall).toBeDefined();
      expect(packageJsonCall[1]).toContain('@lytjs/router');

      const homePageCall = mockWriteFileSync.mock.calls.find((call: any[]) =>
        call[0].includes('Home.lyt'),
      );
      expect(homePageCall).toBeDefined();
    });

    it('should create store template project', async () => {
      mockExistsSync.mockReturnValue(false);

      await create('store-project', { force: true, template: 'store' });

      const packageJsonCall = mockWriteFileSync.mock.calls.find((call: any[]) =>
        call[0].includes('package.json'),
      );
      expect(packageJsonCall).toBeDefined();
      expect(packageJsonCall[1]).toContain('@lytjs/store');

      const counterStoreCall = mockWriteFileSync.mock.calls.find((call: any[]) =>
        call[0].includes('counter.ts'),
      );
      expect(counterStoreCall).toBeDefined();
    });

    it('should create full template project', async () => {
      mockExistsSync.mockReturnValue(false);

      await create('full-project', { force: true, template: 'full' });

      const packageJsonCall = mockWriteFileSync.mock.calls.find((call: any[]) =>
        call[0].includes('package.json'),
      );
      expect(packageJsonCall).toBeDefined();
      expect(packageJsonCall[1]).toContain('@lytjs/router');
      expect(packageJsonCall[1]).toContain('@lytjs/store');
      expect(packageJsonCall[1]).toContain('@lytjs/ui');
    });
  });

  describe('plugin command', () => {
    it('should show help for plugin command with no sub-command', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      try {
        await runCli(['plugin']);
      } catch {
        // Expected
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
      consoleSpy.mockRestore();
      processExit.mockRestore();
    });
  });

  describe('add command', () => {
    it('should error if not in a project directory', async () => {
      mockExistsSync.mockReturnValue(false);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      try {
        await add('component', 'Button');
      } catch {
        // Expected
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No package.json'));
      consoleSpy.mockRestore();
      processExit.mockRestore();
    });

    it('should generate a component file', async () => {
      mockExistsSync.mockReturnValue(true);

      await add('component', 'Button');

      const componentCall = mockWriteFileSync.mock.calls.find((call: any[]) =>
        call[0].includes('Button.lyt'),
      );
      expect(componentCall).toBeDefined();
      expect(componentCall[1]).toContain('template');
      expect(componentCall[1]).toContain('script setup');
    });

    it('should generate a page file', async () => {
      mockExistsSync.mockReturnValue(true);

      await add('page', 'About');

      const pageCall = mockWriteFileSync.mock.calls.find((call: any[]) =>
        call[0].includes('About.lyt'),
      );
      expect(pageCall).toBeDefined();
      expect(pageCall[1]).toContain('page-about');
    });

    it('should generate a store file', async () => {
      mockExistsSync.mockReturnValue(true);

      await add('store', 'user');

      const storeCall = mockWriteFileSync.mock.calls.find((call: any[]) =>
        call[0].includes('user.ts'),
      );
      expect(storeCall).toBeDefined();
      expect(storeCall[1]).toContain('defineStore');
      expect(storeCall[1]).toContain('useUserStore');
    });
  });

  describe('listTemplates', () => {
    it('should list available templates', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      listTemplates();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Available templates'));
      consoleSpy.mockRestore();
    });
  });
});
