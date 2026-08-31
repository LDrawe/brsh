import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { IVfsNode } from 'types/Files'
import { IUser } from 'types/Aplication'
import { vfs } from './vfs/vfs'
import usersData from '@config/users.json'

const users = usersData as unknown as IUser[]

const MAX_FILE_SIZE = 50 * 1024; // 50KB limit to avoid loading giant files into memory

// Recursively maps our JSON inode tree to the physical OS file system and vice-versa
function syncPhysicalDisk(node: IVfsNode, basePath: string) {
  const currentPath = path.join(basePath, node.name)

  if (node.type !== 'folder') {
    if (fs.existsSync(currentPath)) {
      // If file physically exists, update the memory tree with its content up to the limit
      const stats = fs.statSync(currentPath);
      if (stats.size <= MAX_FILE_SIZE) {
        node.data = fs.readFileSync(currentPath, 'utf8');
      }
    } else {
      // Recreate missing physical file using memory data
      fs.writeFileSync(currentPath, node.data || '');
    }
    return
  }

  // Handle folder
  if (!fs.existsSync(currentPath)) {
    fs.mkdirSync(currentPath, { recursive: true })
  }

  if (!node.children) {
    node.children = [];
  }

  node.children.sort((a, b) => a.name.localeCompare(b.name))
  node.children.forEach(child => syncPhysicalDisk(child, currentPath))
}

export function boot(): void {
  try {
    const tree = vfs.getTree();

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

    // Save tree after updating contents from physical disk
    vfs.save();

  } catch (error) {
    if (error instanceof Error) console.error('Boot error:', error.message)
  }
}