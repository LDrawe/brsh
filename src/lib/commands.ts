import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { IState } from 'types/Aplication'
import { IVfsNode } from 'types/Files'
import { resolveVfsNode } from '@utils/vfs'
import { handleAuthentication } from './authentication'

import users from '@config/users.json'
import treeRaw from '@config/tree.json'

const tree: Record<string, IVfsNode> = treeRaw as any
const treeConfigPath = path.resolve('src', 'config', 'tree.json')
const usersConfigPath = path.resolve('src', 'config', 'users.json')
const saveTree = () => fs.writeFileSync(treeConfigPath, JSON.stringify(tree, null, 4))

const specialCharacters = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/

// Guards against path traversal vulnerabilities (e.g., escaping the user sandbox)
function validatePath(state: IState): boolean {
  const arg = state.arguments[0]

  if (arg && arg.includes('..')) return false

  return true
}

const acceptedCommands: Record<string, (state: IState) => any> = {
  sair: (state: IState) => handleAuthentication(state),
  quit: () => {},

  help: () => {
    console.log('Comandos disponíveis: cdir, carq, apagar, listar, deletarusr, sair, quit')
    return 0
  },

  cdir: (state: IState): number => {

    if (!validatePath(state)) return 1

    const folderName = state.arguments[0]

    if (!folderName || specialCharacters.test(folderName)) return 1

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    
    // Translates physical path into a memory pointer. Prevents desync tracking.
    const currentFolderNode = resolveVfsNode(tree[username], userHomePath, state.currentFolder)

    if (!currentFolderNode || currentFolderNode.type !== 'folder') return 1

    if (currentFolderNode.children!.some(c => c.name === folderName)) return 1

    const fullPath = path.resolve(state.currentFolder, folderName)
    fs.mkdirSync(fullPath, { recursive: true })

    currentFolderNode.children!.push({
      id: crypto.randomUUID(),
      name: folderName,
      type: 'folder',
      created_at: Date.now(),
      children: []
    })

    saveTree()
    return 0

  },

  carq: (state: IState): number => {

    if (!validatePath(state)) return 1

    const fileName = state.arguments[0]

    if (!fileName || specialCharacters.test(fileName)) return 1

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)

    const currentFolderNode = resolveVfsNode(tree[username], userHomePath, state.currentFolder)

    if (!currentFolderNode || currentFolderNode.type !== 'folder') return 1

    if (currentFolderNode.children!.some(c => c.name === fileName)) return 1

    const fullPath = path.resolve(state.currentFolder, fileName)
    fs.writeFileSync(fullPath, '')

    currentFolderNode.children!.push({
      id: crypto.randomUUID(),
      name: fileName,
      type: 'file',
      data: '',
      created_at: Date.now()
    })

    saveTree()
    return 0

  },

  apagar: (state: IState): number => {

    if (!validatePath(state)) return 1

    const targetName = state.arguments[0]

    if (!targetName) return 1

    const { username } = state.user!
    const fullPath = path.resolve(state.currentFolder, targetName)

    if (!fs.existsSync(fullPath)) return 1

    const userHomePath = path.resolve('home', username)
    const parentFolderNode = resolveVfsNode(tree[username], userHomePath, state.currentFolder)

    if (!parentFolderNode || parentFolderNode.type !== 'folder') return 1

    parentFolderNode.children = parentFolderNode.children!.filter(child => child.name !== targetName)

    fs.rmSync(fullPath, { recursive: true, force: true })

    saveTree()
    return 0

  },

  listar: (state: IState): number => {

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)

    const currentFolderNode = resolveVfsNode(tree[username], userHomePath, state.currentFolder)

    if (!currentFolderNode || !currentFolderNode.children) return 1

    // Zero I/O listing. Pulls directly from memory acting exactly like an inode table cache.
    currentFolderNode.children.forEach(item => {
      console.log(item.type === 'folder' ? '📁' : '🗄️', item.name)
    })

    return 0

  },

  deletarusr: (state: IState): number => {

    if (state.user!.privilegeLevel < 1) return 1

    const username = state.arguments[0]

    if (!username || username === 'root' || users.length === 1) return 1

    const targetHome = path.resolve('home', username)
    const filteredUsers = users.filter(user => user.username !== username)

    delete tree[username]
    
    fs.writeFileSync(usersConfigPath, JSON.stringify(filteredUsers, null, 4))
    saveTree()

    if (fs.existsSync(targetHome)) fs.rmSync(targetHome, { recursive: true, force: true })

    console.log(`Usuário ${username} removido.`)
    return 0

  }
}

export { acceptedCommands }