import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { TerminalContext } from 'types/Aplication'
import { IVfsNode } from 'types/Files'
import { vfs } from '@core/vfs/vfs'
import { VFSError } from '@core/vfs/errors'

export const directoryCommands = {
  cdir: (state: TerminalContext): number => {
    const folderName = state.arguments[0]
    if (!folderName) throw new VFSError('Nome do diretório não fornecido.')
    vfs.validateNameSafe(folderName)

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const fullPath = path.resolve(state.currentFolder, folderName)

    vfs.validatePathSafe(userHomePath, fullPath)

    const currentFolderNode = vfs.resolveNode(username, userHomePath, state.currentFolder)
    if (!currentFolderNode || currentFolderNode.type !== 'folder') {
      throw new VFSError('Diretório atual inválido.')
    }

    if (currentFolderNode.children!.some(c => c.name === folderName)) {
      throw new VFSError('Um arquivo ou diretório com este nome já existe.')
    }

    fs.mkdirSync(fullPath, { recursive: true })

    currentFolderNode.children!.push({
      id: crypto.randomUUID(),
      name: folderName,
      type: 'folder',
      created_at: Date.now(),
      children: []
    })

    vfs.save()
    return 0
  },

  rdir: (state: TerminalContext): number => {
    const targetName = state.arguments[0]
    if (!targetName) throw new VFSError('Alvo não fornecido.')

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const absolutePath = path.resolve(state.currentFolder, targetName)

    vfs.validatePathSafe(userHomePath, absolutePath)

    const targetNode = vfs.resolveNode(username, userHomePath, absolutePath)
    if (!targetNode || targetNode.type !== 'folder') {
      throw new VFSError('Diretório não encontrado no VFS.')
    }

    if (targetNode.children && targetNode.children.length > 0) {
      throw new VFSError('O diretório não está vazio. Use APAGAR para remoção recursiva.')
    }

    const parentNode = vfs.resolveNode(username, userHomePath, state.currentFolder)
    if (parentNode && parentNode.type === 'folder') {
      parentNode.children = parentNode.children!.filter(c => c.name !== targetName)
    }

    fs.rmdirSync(absolutePath)
    vfs.save()
    return 0
  },

  listar: (state: TerminalContext): number => {
    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const currentFolderNode = vfs.resolveNode(username, userHomePath, state.currentFolder)

    if (!currentFolderNode || !currentFolderNode.children) throw new VFSError('Falha ao listar diretório.')

    currentFolderNode.children.forEach(item => {
      console.log(item.type === 'folder' ? '📁' : '🗄️', item.name)
    })

    return 0
  },

  listarinv: (state: TerminalContext): number => {
    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const currentFolderNode = vfs.resolveNode(username, userHomePath, state.currentFolder)

    if (!currentFolderNode || !currentFolderNode.children) throw new VFSError('Falha ao listar diretório.')

    const reversedChildren = [...currentFolderNode.children].sort((a, b) => b.name.localeCompare(a.name))
    reversedChildren.forEach(item => {
      console.log(item.type === 'folder' ? '📁' : '🗄️', item.name)
    })
    return 0
  },

  listartudo: (state: TerminalContext): number => {
    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const currentFolderNode = vfs.resolveNode(username, userHomePath, state.currentFolder)

    if (!currentFolderNode) throw new VFSError('Diretório base não encontrado.')

    const printTree = (node: IVfsNode, level: number) => {
      const indent = '  '.repeat(level)
      console.log(`${indent}${node.type === 'folder' ? '📁' : '🗄️'} ${node.name}`)
      if (!node.children) return
      node.children.forEach(child => printTree(child, level + 1))
    }

    printTree(currentFolderNode, 0)
    return 0
  },

  atual: (state: TerminalContext): number => {
    console.log(`Working directory: ${state.currentFolder}`)
    return 0
  },

  mudar: (state: TerminalContext): number => {
    const targetDir = state.arguments[0]
    if (!targetDir) throw new VFSError('Diretório destino não fornecido.')

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const targetPath = path.resolve(state.currentFolder, targetDir)

    vfs.validatePathSafe(userHomePath, targetPath)

    const targetNode = vfs.resolveNode(username, userHomePath, targetPath)
    if (!targetNode || targetNode.type !== 'folder') {
      throw new VFSError('Diretório não encontrado no VFS.')
    }

    state.currentFolder = targetPath
    return 0
  }
}
