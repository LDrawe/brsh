import path from 'node:path'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { isPathSafe, isNameSafe } from '../../src/core/vfs/security'

describe('Security Module: VFS Sandboxing and Input Sanitization', () => {
  const userHome = path.resolve('home', 'eduardo')

  it('Should reject paths trying to escape the user home (Directory Traversal)', () => {
    const escapedPath = path.resolve(userHome, '../root')
    assert.strictEqual(isPathSafe(userHome, escapedPath), false)
  })

  it('Should accept valid paths within the user home sandbox', () => {
    const validPath = path.resolve(userHome, 'projetos')
    assert.strictEqual(isPathSafe(userHome, validPath), true)
  })

  it('Should reject file/folder names with special characters', () => {
    assert.strictEqual(isNameSafe('arquivo@.txt'), false)
    assert.strictEqual(isNameSafe('pasta/secreta'), false)
  })

  it('Should accept valid alphanumeric names', () => {
    assert.strictEqual(isNameSafe('meu_arquivo.js'), true)
    assert.strictEqual(isNameSafe('trabalho-final'), true)
  })
})