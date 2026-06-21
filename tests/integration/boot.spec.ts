import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { boot } from '@lib/boot'
import { IFolder } from 'types/Files'

import treeRaw from '@config/tree.json'

const tree: Record<string, IFolder[]> = treeRaw as any

function checkFolders (folder: IFolder) {
  const currentPath = path.resolve(folder.path)
  const folderExists = fs.existsSync(currentPath)

  assert.strictEqual(folderExists, true)

  if (!folder.files) return

  folder.files.forEach(file => {
    const filePath = path.resolve(currentPath, file.name)
    const fileExists = fs.existsSync(filePath)

    assert.strictEqual(fileExists, true)
  })
}

describe('Creating and checking file structure', () => {
  boot()
  it('Should be able to sucessfully check the created files', () => {
    Object.keys(tree).forEach(user => tree[user].forEach(checkFolders))
  })
})