import fs from 'fs'
import path from 'path'
import { boot } from '@lib/boot'
import { IFolder } from 'types/Files'

import tree from '@config/tree.json'

function checkFolders (folder:IFolder) {
  const currentPath = path.resolve(folder.path)
  const folderExists = fs.existsSync(currentPath)

  expect(folderExists).toBe(true)

  folder.files.forEach(file => {
    const filePath = path.resolve(currentPath, file.name)
    const fileExists = fs.existsSync(filePath)

    expect(fileExists).toBe(true)
  })
}

describe('Creating and checking file structure', () => {
  boot()
  it('Should be able to sucessfully check the created files', () => {
    Object.keys(tree).forEach(user => tree[user].forEach(checkFolders))
  })
})
