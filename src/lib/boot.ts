import fs from 'fs'
import { IFile, IFolder } from 'types/Files'

import users from '@config/users.json'
import tree from '@config/tree.json'

function boot (): void {
  try {
    users.forEach(user => {
      if (!fs.existsSync(`home/${user.username}`)) fs.mkdirSync(`home/${user.username}`, { recursive: true })

      if (tree[user.username]?.length === 0) return

      tree[user.username]?.forEach((folder: IFolder) => {
        if (Object.keys(folder).length !== 0 && !fs.existsSync(`${folder.path}`)) {
          fs.mkdirSync(`${folder.path}`, { recursive: true })
        }
        folder.files?.forEach(file => fs.writeFileSync(`${folder.path}/${file.name}`, file.data))
      })
    })

    for (const user in tree) {
      tree[user].forEach((folder:IFolder) => {
        folder.files.sort((atual:IFile, prox:IFile) => {
          if (atual.name > prox.name) {
            return 1
          }
          if (atual.name < prox.name) {
            return -1
          }
          // a must be equal to b
          return 0
        })
      })

      tree[user].sort((atual:IFolder, prox:IFolder) => {
        if (atual.path > prox.path) {
          return 1
        }
        if (atual.path < prox.path) {
          return -1
        }
        // a must be equal to b
        return 0
      })
    }

    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))
  } catch (error) {
    console.log(error.message || error)
  }
}

export { boot }
