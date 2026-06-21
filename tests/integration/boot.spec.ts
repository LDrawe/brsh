import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { boot } from '../../src/core/boot'
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
  boot()

  it('Should successfully map the VFS tree to the physical OS disk', () => {
    const userHomeDir = path.resolve('home')
    Object.values(tree).forEach(rootNode => {
      checkNodeRecursive(rootNode, userHomeDir)
    })
  })
})