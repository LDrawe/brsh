import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { IVfsNode } from 'types/Files'
import { IUser } from 'types/Aplication'

import usersData from '@config/users.json'
import treeRaw from '@config/tree.json'

const users = usersData as unknown as IUser[]
const tree: Record<string, IVfsNode> = treeRaw as any

// Recursively maps our JSON inode tree to the physical OS file system.
function syncPhysicalDisk(node: IVfsNode, basePath: string) {

  const currentPath = path.join(basePath, node.name)

  if (node.type !== 'folder') {

    if (!fs.existsSync(currentPath)) fs.writeFileSync(currentPath, node.data || '')

    return

  }

  if (!fs.existsSync(currentPath)) fs.mkdirSync(currentPath, { recursive: true })

  if (!node.children) return

  node.children.sort((a, b) => a.name.localeCompare(b.name))

  node.children.forEach(child => syncPhysicalDisk(child, currentPath))

}

function boot(): void {

  try {

    users.forEach(user => {

      const userHomeDir = path.resolve('home')

      if (!tree[user.username]) {

        tree[user.username] = {
          id: crypto.randomUUID(),
          name: user.username,
          type: 'folder',
          created_at: Date.now(),
          children: []
        }

      }

      syncPhysicalDisk(tree[user.username], userHomeDir)

    })

    const treeConfigPath = path.resolve('src', 'config', 'tree.json')
    fs.writeFileSync(treeConfigPath, JSON.stringify(tree, null, 4))

  } catch (error) {

    if (error instanceof Error) console.error(error.message)

  }

}

export { boot }