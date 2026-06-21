import path from 'node:path'
import { IVfsNode } from 'types/Files'

// Resolves a physical absolute path into our virtual memory node pointer.
// Crucial for achieving O(depth) access time instead of flat array scanning.
export function resolveVfsNode(rootNode: IVfsNode, userHomePath: string, targetAbsolutePath: string): IVfsNode | null {
  const relativePath = path.relative(userHomePath, targetAbsolutePath).split(path.sep).join('/')

  if (!relativePath || relativePath === '') return rootNode

  const parts = relativePath.split('/').filter(Boolean)
  let currentNode = rootNode

  for (const part of parts) {

    if (currentNode.type !== 'folder' || !currentNode.children) return null

    const nextNode = currentNode.children.find(c => c.name === part)

    if (!nextNode) return null

    currentNode = nextNode

  }

  return currentNode
}