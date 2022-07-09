import fs from 'fs'
import users from '@config/users.json'
import tree from '@config/tree.json'
import { IFolder } from 'types/Files'

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
  } catch (error) {
    console.log(error.message || error)
  }
}

export { boot }
