import { describe, it, expect } from 'vitest'
import {
  normalizePath,
  joinPath,
  dirname,
  basename,
  extname,
  pathToRegex,
  matchPath,
  isAbsolute,
  isRelative,
  parsePath,
  resolvePath,
} from '../src/index'

describe('@lytjs/common-path', () => {
  // normalizePath
  describe('normalizePath', () => {
    it('should normalize backslashes to forward slashes', () => {
      expect(normalizePath('foo\\bar\\baz')).toBe('foo/bar/baz')
    })

    it('should remove duplicate slashes', () => {
      expect(normalizePath('foo//bar///baz')).toBe('foo/bar/baz')
    })

    it('should remove trailing slash', () => {
      expect(normalizePath('foo/bar/')).toBe('foo/bar')
    })

    it('should handle empty string', () => {
      expect(normalizePath('')).toBe('')
    })

    it('should handle single slash', () => {
      expect(normalizePath('/')).toBe('/')
    })

    it('should preserve leading slash', () => {
      expect(normalizePath('/foo/bar/')).toBe('/foo/bar')
    })
  })

  // joinPath
  describe('joinPath', () => {
    it('should join path segments', () => {
      expect(joinPath('foo', 'bar', 'baz')).toBe('foo/bar/baz')
    })

    it('should normalize the result', () => {
      expect(joinPath('foo/', '/bar')).toBe('foo/bar')
    })

    it('should handle empty segments', () => {
      expect(joinPath('foo', '', 'bar')).toBe('foo/bar')
    })

    it('should handle single segment', () => {
      expect(joinPath('foo')).toBe('foo')
    })

    it('should handle no segments', () => {
      expect(joinPath()).toBe('')
    })
  })

  // dirname
  describe('dirname', () => {
    it('should return the directory name', () => {
      expect(dirname('/foo/bar/baz.txt')).toBe('/foo/bar')
      expect(dirname('foo/bar/baz.txt')).toBe('foo/bar')
    })

    it('should return parent for file in root', () => {
      expect(dirname('/baz.txt')).toBe('/')
    })

    it('should return . for relative path without directory', () => {
      expect(dirname('baz.txt')).toBe('.')
    })

    it('should handle root path', () => {
      expect(dirname('/')).toBe('/')
    })

    it('should handle empty string', () => {
      expect(dirname('')).toBe('.')
    })
  })

  // basename
  describe('basename', () => {
    it('should return the file name', () => {
      expect(basename('/foo/bar/baz.txt')).toBe('baz.txt')
      expect(basename('foo/bar/baz.txt')).toBe('baz.txt')
    })

    it('should handle file without extension', () => {
      expect(basename('/foo/bar/baz')).toBe('baz')
    })

    it('should handle file in root', () => {
      expect(basename('/baz.txt')).toBe('baz.txt')
    })

    it('should handle empty string', () => {
      expect(basename('')).toBe('')
    })

    it('should handle hidden files', () => {
      expect(basename('/foo/.gitignore')).toBe('.gitignore')
    })
  })

  // extname
  describe('extname', () => {
    it('should return the file extension', () => {
      expect(extname('baz.txt')).toBe('.txt')
      expect(extname('archive.tar.gz')).toBe('.gz')
    })

    it('should return empty string for no extension', () => {
      expect(extname('baz')).toBe('')
      expect(extname('.gitignore')).toBe('')
    })

    it('should handle empty string', () => {
      expect(extname('')).toBe('')
    })

    it('should handle full path', () => {
      expect(extname('/foo/bar/baz.txt')).toBe('.txt')
    })
  })

  // pathToRegex
  describe('pathToRegex', () => {
    it('should convert path pattern to regex', () => {
      const regex = pathToRegex('/users/:id')
      expect(regex.test('/users/123')).toBe(true)
      expect(regex.test('/users/abc')).toBe(true)
      expect(regex.test('/users/')).toBe(false)
    })

    it('should support wildcard', () => {
      const regex = pathToRegex('/files/*')
      expect(regex.test('/files/any/path')).toBe(true)
      expect(regex.test('/files/')).toBe(true)
    })

    it('should support optional segments', () => {
      const regex = pathToRegex('/users/:id?')
      expect(regex.test('/users/123')).toBe(true)
      expect(regex.test('/users')).toBe(true)
    })
  })

  // matchPath
  describe('matchPath', () => {
    it('should match path and extract params', () => {
      const result = matchPath('/users/:id', '/users/123')
      expect(result).not.toBeNull()
      expect(result?.params).toEqual({ id: '123' })
    })

    it('should return null for non-matching path', () => {
      const result = matchPath('/users/:id', '/posts/123')
      expect(result).toBeNull()
    })

    it('should match with multiple params', () => {
      const result = matchPath('/users/:userId/posts/:postId', '/users/1/posts/42')
      expect(result?.params).toEqual({ userId: '1', postId: '42' })
    })

    it('should match wildcard', () => {
      const result = matchPath('/files/*', '/files/a/b/c')
      expect(result).not.toBeNull()
      expect(result?.params).toEqual({ '*': 'a/b/c' })
    })
  })

  // isAbsolute
  describe('isAbsolute', () => {
    it('should return true for absolute paths', () => {
      expect(isAbsolute('/foo/bar')).toBe(true)
      expect(isAbsolute('/')).toBe(true)
    })

    it('should return false for relative paths', () => {
      expect(isAbsolute('foo/bar')).toBe(false)
      expect(isAbsolute('./foo')).toBe(false)
      expect(isAbsolute('../foo')).toBe(false)
    })

    it('should handle empty string', () => {
      expect(isAbsolute('')).toBe(false)
    })
  })

  // isRelative
  describe('isRelative', () => {
    it('should return true for relative paths', () => {
      expect(isRelative('foo/bar')).toBe(true)
      expect(isRelative('./foo')).toBe(true)
      expect(isRelative('../foo')).toBe(true)
    })

    it('should return false for absolute paths', () => {
      expect(isRelative('/foo/bar')).toBe(false)
      expect(isRelative('/')).toBe(false)
    })

    it('should handle empty string', () => {
      expect(isRelative('')).toBe(true)
    })
  })

  // parsePath
  describe('parsePath', () => {
    it('should parse a full path', () => {
      const result = parsePath('/foo/bar/baz.txt')
      expect(result.dir).toBe('/foo/bar')
      expect(result.base).toBe('baz.txt')
      expect(result.name).toBe('baz')
      expect(result.ext).toBe('.txt')
    })

    it('should parse a path without extension', () => {
      const result = parsePath('/foo/bar/baz')
      expect(result.dir).toBe('/foo/bar')
      expect(result.base).toBe('baz')
      expect(result.name).toBe('baz')
      expect(result.ext).toBe('')
    })

    it('should parse a relative path', () => {
      const result = parsePath('foo/bar/baz.txt')
      expect(result.dir).toBe('foo/bar')
      expect(result.base).toBe('baz.txt')
      expect(result.name).toBe('baz')
      expect(result.ext).toBe('.txt')
    })
  })

  // resolvePath
  describe('resolvePath', () => {
    it('should resolve relative path from base', () => {
      expect(resolvePath('/foo', 'bar')).toBe('/foo/bar')
      expect(resolvePath('/foo/', 'bar')).toBe('/foo/bar')
    })

    it('should resolve parent directory', () => {
      expect(resolvePath('/foo/bar', '..')).toBe('/foo')
      expect(resolvePath('/foo/bar', '../baz')).toBe('/foo/baz')
    })

    it('should resolve current directory', () => {
      expect(resolvePath('/foo', '.')).toBe('/foo')
      expect(resolvePath('/foo', './bar')).toBe('/foo/bar')
    })

    it('should handle absolute path as second argument', () => {
      expect(resolvePath('/foo', '/bar')).toBe('/bar')
    })
  })
})
