import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { boot } from '../../src/core/boot'
import { vfs } from '../../src/core/vfs/vfs'
import { IVfsNode } from '../../src/types/Files'

import treeRaw from '../../src/config/tree.json'

const tree: Record<string, IVfsNode> = treeRaw as any

function checkNodeRecursive(node: IVfsNode, basePath: string) {
  const currentPath = path.resolve(basePath, node.name)
  const exists = fs.existsSync(currentPath)

  assert.strictEqual(exists, true)

  if (node.type === 'folder' && node.children) {
    node.children.forEach(child => checkNodeRecursive(child, currentPath))
  }
}

describe('Boot Sequence: File Structure Parity', () => {
  it('Should successfully map the VFS tree to the physical OS disk', () => {
    boot()
    const userHomeDir = path.resolve('home')
    Object.values(tree).forEach(rootNode => {
      checkNodeRecursive(rootNode, userHomeDir)
    })
  })

  it('Should recreate missing physical file from tree in memory', () => {
    const memoryTree = vfs.getTree()
    const userNode = memoryTree['eduardo']
    const testFileName = 'missing_physical.txt'

    userNode.children!.push({
      id: 'missing-id',
      name: testFileName,
      type: 'file',
      created_at: Date.now(),
      data: 'recreated data'
    })

    const physicalPath = path.resolve('home', 'eduardo', testFileName)
    if (fs.existsSync(physicalPath)) fs.unlinkSync(physicalPath)

    boot()

    assert.strictEqual(fs.existsSync(physicalPath), true)
    assert.strictEqual(fs.readFileSync(physicalPath, 'utf8'), 'recreated data')

    // Clean up
    fs.unlinkSync(physicalPath)
    userNode.children = userNode.children!.filter(c => c.name !== testFileName)
    vfs.save()
  })

  it('Should sync physical file data if <= MAX_FILE_SIZE and skip if > MAX_FILE_SIZE', () => {
    const memoryTree = vfs.getTree()
    const userNode = memoryTree['eduardo']
    const smallFileName = 'small.txt'
    const largeFileName = 'large.txt'

    const smallPath = path.resolve('home', 'eduardo', smallFileName)
    const largePath = path.resolve('home', 'eduardo', largeFileName)

    fs.writeFileSync(smallPath, 'hello world')
    fs.writeFileSync(largePath, Buffer.alloc(55 * 1024, 'a')) // 55KB > 50KB

    const smallNode: IVfsNode = {
      id: 'small-id',
      name: smallFileName,
      type: 'file',
      created_at: Date.now(),
      data: ''
    }

    const largeNode: IVfsNode = {
      id: 'large-id',
      name: largeFileName,
      type: 'file',
      created_at: Date.now(),
      data: 'initial'
    }

    userNode.children!.push(smallNode, largeNode)

    boot()

    assert.strictEqual(smallNode.data, 'hello world')
    assert.strictEqual(largeNode.data, 'initial') // Not updated because size > MAX_FILE_SIZE

    // Clean up
    fs.unlinkSync(smallPath)
    fs.unlinkSync(largePath)
    userNode.children = userNode.children!.filter(c => c.name !== smallFileName && c.name !== largeFileName)
    vfs.save()
  })

  it('Should handle folder without children and create physical folder if missing', () => {
    const memoryTree = vfs.getTree()
    const userNode = memoryTree['eduardo']
    const folderName = 'new_empty_folder'
    const folderPath = path.resolve('home', 'eduardo', folderName)

    if (fs.existsSync(folderPath)) fs.rmdirSync(folderPath)

    const folderNode: any = {
      id: 'folder-id',
      name: folderName,
      type: 'folder',
      created_at: Date.now()
      // Note: children intentionally omitted
    }

    userNode.children!.push(folderNode)

    boot()

    assert.strictEqual(fs.existsSync(folderPath), true)
    assert.deepStrictEqual(folderNode.children, [])

    // Clean up
    fs.rmdirSync(folderPath)
    userNode.children = userNode.children!.filter(c => c.name !== folderName)
    vfs.save()
  })

  it('Should create user node in tree if user is missing from tree', () => {
    const memoryTree = vfs.getTree()
    const tempUserNode = memoryTree['root']
    delete memoryTree['root']

    boot()

    assert.ok(memoryTree['root'])
    assert.strictEqual(memoryTree['root'].name, 'root')

    // Restore
    if (tempUserNode) memoryTree['root'] = tempUserNode
    vfs.save()
  })

  it('Should catch and log errors during boot', () => {
    const originalGetTree = vfs.getTree
    let errorLogged = ''
    const originalError = console.error
    console.error = (msg: string, detail?: string) => {
      errorLogged = `${msg} ${detail || ''}`
    }

    vfs.getTree = () => {
      throw new Error('Simulated VFS failure')
    }

    try {
      boot()
      assert.ok(errorLogged.includes('Simulated VFS failure'))
    } finally {
      vfs.getTree = originalGetTree
      console.error = originalError
    }
  })
})