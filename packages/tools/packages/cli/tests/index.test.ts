/**
 * @lytjs/cli unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runCli } from '../src/commands/run';
import { create, listTemplates } from '../src/commands/create';
import { logger } from '../src/utils/logger';
import { exists, isEmptyDir, ensureDir, writeFile, readFile } from '../src/utils/fs';
import { detectPackageManager, getInstallCommand, getRunCommand, getAddCommand } from '../src/utils/package';
import { createFilter, normalizePath, generateScopeId } from '../src/utils/colors';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

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
        const { existsSync } = await import('fs');
        existsSync.mockReturnValue(true);
        expect(exists('/some/path')).toBe(true);
      });

      it('should return false if path does not exist', () => {
        const { existsSync } = await import('fs');
        existsSync.mockReturnValue(false);
        expect(exists('/some/path')).toBe(false);
      });
    });

    describe('isEmptyDir', () => {
      it('should return true for non-existent directory', () => {
        const { existsSync } = await import('fs');
        existsSync.mockReturnValue(false);
        expect(isEmptyDir('/nonexistent')).toBe(true);
      });

      it('should return true for empty directory', () => {
        const { existsSync, readdirSync } = await import('fs');
        existsSync.mockReturnValue(true);
        readdirSync.mockReturnValue([]);
        expect(isEmptyDir('/empty')).toBe(true);
      });

      it('should return false for non-empty directory', () => {
        const { existsSync, readdirSync } = await import('fs');
        existsSync.mockReturnValue(true);
        readdirSync.mockReturnValue(['file.txt']);
        expect(isEmptyDir('/notempty')).toBe(false);
      });
    });

    describe('ensureDir', () => {
      it('should create directory if it does not exist', () => {
        const { existsSync, mkdirSync } = await import('fs');
        existsSync.mockReturnValue(false);
        ensureDir('/new/dir');
        expect(mkdirSync).toHaveBeenCalledWith('/new/dir', { recursive: true });
      });

      it('should not create directory if it exists', () => {
        const { existsSync, mkdirSync } = await import('fs');
        existsSync.mockReturnValue(true);
        ensureDir('/existing/dir');
        expect(mkdirSync).not.toHaveBeenCalled();
      });
    });

    describe('writeFile', () => {
      it('should write file with content', () => {
        const { writeFileSync } = await import('fs');
        writeFile('/path/to/file.txt', 'content');
        expect(writeFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'content', 'utf-8');
      });

      it('should create parent directories', () => {
        const { mkdirSync } = await import('fs');
        writeFile('/path/to/nested/file.txt', 'content');
        expect(mkdirSync).toHaveBeenCalledWith('/path/to/nested', { recursive: true });
      });
    });

    describe('readFile', () => {
      it('should read file as string', () => {
        const { readFileSync } = await import('fs');
        readFileSync.mockReturnValue('file content');
        const result = readFile('/path/to/file.txt');
        expect(result).toBe('file content');
        expect(readFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'utf-8');
      });
    });
  });

  describe('package manager utils', () => {
    describe('detectPackageManager', () => {
      it('should detect pnpm from lockfile', () => {
        const { existsSync } = await import('fs');
        existsSync.mockImplementation((path: string) => path.includes('pnpm-lock.yaml'));
        expect(detectPackageManager()).toBe('pnpm');
      });

      it('should detect yarn from lockfile', () => {
        const { existsSync } = await import('fs');
        existsSync.mockImplementation((path: string) => path.includes('yarn.lock'));
        expect(detectPackageManager()).toBe('yarn');
      });

      it('should detect npm from lockfile', () => {
        const { existsSync } = await import('fs');
        existsSync.mockImplementation((path: string) => path.includes('package-lock.json'));
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
        expect(getRunCommand('pnpm', 'dev')).toBe('pnpm dev');
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
      const processExit = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
      
      try {
        await runCli(['unknown-command']);
      } catch {
        // Expected
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
      consoleSpy.mockRestore();
      processExit.mockRestore();
    });
  });

  describe('create command', () => {
    it('should error if directory exists and not empty', async () => {
      const { existsSync } = await import('fs');
      existsSync.mockReturnValue(true);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExit = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
      
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
      const { existsSync, writeFileSync } = await import('fs');
      existsSync.mockReturnValue(false);
      
      await create('new-project', { force: true });
      
      // Check that package.json was written
      const packageJsonCall = writeFileSync.mock.calls.find(
        (call: any[]) => call[0].includes('package.json')
      );
      expect(packageJsonCall).toBeDefined();
      
      // Check that vite.config.ts was written
      const viteConfigCall = writeFileSync.mock.calls.find(
        (call: any[]) => call[0].includes('vite.config.ts')
      );
      expect(viteConfigCall).toBeDefined();
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
