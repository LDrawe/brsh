import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { resolveVfsNode } from '../../src/core/vfs/pointer'
import { writeAtomically } from '../../src/core/vfs/io'
import { VirtualFileSystem, vfs } from '../../src/core/vfs/vfs'
import { VFSError } from '../../src/core/vfs/errors'
import { IVfsNode } from '../../src/types/Files'

describe('VFS Pointer: resolveVfsNode', () => {
  const rootNode: IVfsNode = {
    id: 'root-id',
    name: 'eduardo',
    type: 'folder',
    created_at: Date.now(),
    children: [
      {
        id: 'file-1',
        name: 'arquivo.txt',
        type: 'file',
        created_at: Date.now()
      },
      {
        id: 'dir-1',
        name: 'pasta',
        type: 'folder',
        created_at: Date.now(),
        children: [
          {
            id: 'file-2',
            name: 'sub.txt',
            type: 'file',
            created_at: Date.now()
          }
        ]
      }
    ]
  }

  const userHome = path.resolve('home', 'eduardo')

  it('Should return rootNode when relative path is empty', () => {
    const node = resolveVfsNode(rootNode, userHome, userHome)
    assert.strictEqual(node, rootNode)
  })

  it('Should return null when traversing through a non-folder node', () => {
    const filePathAsFolder = path.resolve(userHome, 'arquivo.txt', 'subitem')
    const node = resolveVfsNode(rootNode, userHome, filePathAsFolder)
    assert.strictEqual(node, null)
  })

  it('Should return null when child node is not found', () => {
    const nonExistent = path.resolve(userHome, 'pasta_fantasma')
    const node = resolveVfsNode(rootNode, userHome, nonExistent)
    assert.strictEqual(node, null)
  })

  it('Should resolve valid deep node', () => {
    const deepFile = path.resolve(userHome, 'pasta', 'sub.txt')
    const node = resolveVfsNode(rootNode, userHome, deepFile)
    assert.ok(node)
    assert.strictEqual(node!.name, 'sub.txt')
  })
})

describe('VFS IO: writeAtomically', () => {
  const testFile = path.resolve('scratch_test_write_atomic.json')

  it('Should write atomically on first attempt', () => {
    writeAtomically(testFile, { test: 123 })
    assert.strictEqual(fs.existsSync(testFile), true)
    const content = JSON.parse(fs.readFileSync(testFile, 'utf8'))
    assert.strictEqual(content.test, 123)
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile)
  })

  it('Should retry on EPERM and succeed if rename works on second attempt', () => {
    const originalRename = fs.renameSync
    let attempts = 0

    fs.renameSync = (oldP: fs.PathLike, newP: fs.PathLike) => {
      attempts++
      if (attempts === 1) {
        const err: any = new Error('Permission denied')
        err.code = 'EPERM'
        throw err
      }
      return originalRename(oldP, newP)
    }

    try {
      writeAtomically(testFile, { retry: true })
      assert.strictEqual(attempts, 2)
      assert.strictEqual(fs.existsSync(testFile), true)
    } finally {
      fs.renameSync = originalRename
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile)
    }
  })

  it('Should throw when EPERM retries are exhausted', () => {
    const originalRename = fs.renameSync

    fs.renameSync = () => {
      const err: any = new Error('Permission denied')
      err.code = 'EPERM'
      throw err
    }

    try {
      assert.throws(() => writeAtomically(testFile, { fail: true }), (err: any) => err.code === 'EPERM')
    } finally {
      fs.renameSync = originalRename
      const tmp = `${testFile}.tmp`
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile)
    }
  })

  it('Should throw non-EPERM errors immediately', () => {
    const originalRename = fs.renameSync

    fs.renameSync = () => {
      const err: any = new Error('Disk full')
      err.code = 'ENOSPC'
      throw err
    }

    try {
      assert.throws(() => writeAtomically(testFile, { fail: true }), (err: any) => err.code === 'ENOSPC')
    } finally {
      fs.renameSync = originalRename
      const tmp = `${testFile}.tmp`
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile)
    }
  })
})

describe('VirtualFileSystem Class', () => {
  it('Should return null for resolveNode if username does not exist', () => {
    const node = vfs.resolveNode('usuario_inexistente', '/home/none', '/home/none')
    assert.strictEqual(node, null)
  })

  it('Should deep clone nodes with and without children', () => {
    const nodeWithChildren: IVfsNode = {
      id: 'parent',
      name: 'parent',
      type: 'folder',
      created_at: 100,
      children: [
        {
          id: 'child',
          name: 'child.txt',
          type: 'file',
          created_at: 200,
          data: 'hello'
        }
      ]
    }

    const cloned = vfs.deepCloneNode(nodeWithChildren)
    assert.notStrictEqual(cloned, nodeWithChildren)
    assert.strictEqual(cloned.name, 'parent')
    assert.strictEqual(cloned.children!.length, 1)
    assert.notStrictEqual(cloned.children![0], nodeWithChildren.children![0])

    const leafNode: IVfsNode = {
      id: 'leaf',
      name: 'leaf.txt',
      type: 'file',
      created_at: 300
    }
    const clonedLeaf = vfs.deepCloneNode(leafNode)
    assert.strictEqual(clonedLeaf.children, undefined)
  })

  it('Should throw VFSError on validatePathSafe and validateNameSafe when invalid', () => {
    assert.throws(() => vfs.validatePathSafe('/home/eduardo', '/home/root'), VFSError)
    assert.throws(() => vfs.validateNameSafe('arquivo/invalido'), VFSError)
    assert.doesNotThrow(() => vfs.validatePathSafe('/home/eduardo', '/home/eduardo/projeto'))
    assert.doesNotThrow(() => vfs.validateNameSafe('arquivo_valido.txt'))
  })

  it('Should handle missing or corrupt treeConfigPath in loadTree', () => {
    const originalExists = fs.existsSync
    const originalRead = fs.readFileSync

    // Test missing file branch
    fs.existsSync = () => false
    const vfsMissing = new VirtualFileSystem()
    assert.deepStrictEqual(vfsMissing.getTree(), {})

    // Test corrupted JSON branch
    fs.existsSync = () => true
    fs.readFileSync = (() => 'corrupted { json') as any
    const originalError = console.error
    console.error = () => {}
    try {
      const vfsCorrupt = new VirtualFileSystem()
      assert.deepStrictEqual(vfsCorrupt.getTree(), {})
    } finally {
      console.error = originalError
      fs.existsSync = originalExists
      fs.readFileSync = originalRead
    }
  })
})

describe('VFSError Class', () => {
  it('Should instantiate correctly with name VFSError', () => {
    const err = new VFSError('Test error')
    assert.strictEqual(err.name, 'VFSError')
    assert.strictEqual(err.message, 'Test error')
    assert.ok(err instanceof Error)
  })
})
