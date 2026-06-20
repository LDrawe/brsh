import fs from 'fs'
import path from 'path'
import { IFile, IFolder } from 'types/Files'

import users from '@config/users.json'
import treeRaw from '@config/tree.json'

const tree: Record<string, IFolder[]> = treeRaw as any

function boot (): void {
  try {
    users.forEach(user => {
      const userHomeDir = path.resolve('home', user.username)
      if (!fs.existsSync(userHomeDir)) {
        fs.mkdirSync(userHomeDir, { recursive: true })
      }

      if (!tree[user.username] || tree[user.username].length === 0) return

      tree[user.username].forEach((folder: IFolder) => {
        const folderPath = path.resolve(folder.path)
        
        if (Object.keys(folder).length !== 0 && !fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true })
        }
        
        folder.files?.forEach((file: IFile) => {
          const filePath = path.join(folderPath, file.name)
          fs.writeFileSync(filePath, file.data)
        })
      })
    })

    for (const user in tree) {
      tree[user].forEach((folder: IFolder) => {
        folder.files.sort((atual: IFile, prox: IFile) => atual.name.localeCompare(prox.name))
      })

      tree[user].sort((atual: IFolder, prox: IFolder) => atual.path.localeCompare(prox.path))
    }

    const treeConfigPath = path.resolve('src', 'config', 'tree.json')
    fs.writeFileSync(treeConfigPath, JSON.stringify(tree, null, 4))
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message)
    } else {
      console.error(String(error))
    }
  }
}

export { boot }