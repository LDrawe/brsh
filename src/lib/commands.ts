import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { IState } from 'types/Aplication'
import { IFolder, IFile } from 'types/Files'

import users from '@config/users.json'
import treeRaw from '@config/tree.json'
import { handleAuthentication } from './authentication'

const tree: Record<string, IFolder[]> = treeRaw as any

const treeConfigPath = path.resolve('src', 'config', 'tree.json')
const usersConfigPath = path.resolve('src', 'config', 'users.json')
const saveTree = () => fs.writeFileSync(treeConfigPath, JSON.stringify(tree, null, 4))

const specialCharacters = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/

/**
 * Previne exploits de Directory Traversal
 */
function validatePath(state: IState): boolean {
  const arg = state.arguments[0]
  if (arg && arg.includes('..')) {
    console.log('Acesso negado: Caminhos relativos não são permitidos.')
    return false
  }
  return true
}

const acceptedCommands: Record<string, (state: IState) => any> = {
  sair: (state: IState) => handleAuthentication(state),
  quit: () => {},
  
  help: () => {
    console.log('Comandos disponíveis: cdir, carq, apagar, deletarusr, sair, quit')
    return 0
  },

  cdir: (state: IState): number => {
    if (!validatePath(state)) return 1

    const folder = state.arguments[0]
    if (!folder) {
      console.log('Forneça um nome válido!')
      return 1
    }

    if (specialCharacters.test(folder)) {
      console.log('Proibido o uso de caracteres especiais')
      return 1
    }

    const { username } = state.user!
    const fullPath = path.resolve(state.currentFolder, folder)

    if (!tree[username]) tree[username] = []

    if (tree[username].some((dir: IFolder) => path.resolve(dir.path) === fullPath)) {
      console.log('Pasta já existe')
      return 1
    }

    fs.mkdirSync(fullPath, { recursive: true })

    const newFolder: IFolder = {
      id: randomUUID(),
      created_at: Date.now(),
      path: path.relative(process.cwd(), fullPath).split(path.sep).join('/'),
      files: []
    }

    tree[username].push(newFolder)
    saveTree()
    return 0
  },

  carq: (state: IState): number => {
    if (!validatePath(state)) return 1

    const fileName = state.arguments[0]
    if (!fileName) {
      console.log('Forneça o nome do arquivo!')
      return 1
    }

    if (specialCharacters.test(fileName)) {
      console.log('Proibido o uso de caracteres especiais')
      return 1
    }

    const { username } = state.user!
    const currentRelativeFolder = path.relative(process.cwd(), state.currentFolder).split(path.sep).join('/')
    
    if (!tree[username]) tree[username] = []

    const currentFolderNode = tree[username].find((dir: IFolder) => dir.path === currentRelativeFolder)

    if (!currentFolderNode) {
      console.log('Erro: Diretório não encontrado.')
      return 1
    }

    if (currentFolderNode.files.some((file: IFile) => file.name === fileName)) {
      console.log('Arquivo já existe')
      return 1
    }

    const newFile: IFile = {
      id: randomUUID(),
      name: fileName,
      data: '',
      created_at: Date.now()
    }

    const fullPath = path.resolve(state.currentFolder, fileName)
    fs.writeFileSync(fullPath, '')

    currentFolderNode.files.push(newFile)
    saveTree()
    return 0
  },

  apagar: (state: IState): number => {
    if (!validatePath(state)) return 1

    const targetName = state.arguments[0]
    if (!targetName) {
      console.log('Forneça o nome do arquivo ou pasta!')
      return 1
    }

    const { username } = state.user!
    const fullPath = path.resolve(state.currentFolder, targetName)

    if (!fs.existsSync(fullPath)) {
      console.log('Não encontrado')
      return 1
    }

    const stats = fs.statSync(fullPath)
    if (!tree[username]) tree[username] = []

    if (stats.isDirectory()) {
      const relativePath = path.relative(process.cwd(), fullPath).split(path.sep).join('/')
      tree[username] = tree[username].filter((dir: IFolder) => !dir.path.startsWith(relativePath))
      fs.rmSync(fullPath, { recursive: true, force: true })
    } else {
      const currentRelativeFolder = path.relative(process.cwd(), state.currentFolder).split(path.sep).join('/')
      const folderNode = tree[username].find((dir: IFolder) => dir.path === currentRelativeFolder)
      if (folderNode) {
        folderNode.files = folderNode.files.filter((file: IFile) => file.name !== targetName)
      }
      fs.rmSync(fullPath, { force: true })
    }

    saveTree()
    return 0
  },

  deletarusr: (state: IState): number => {
    if (state.user!.privilegeLevel < 1) {
      console.log('Sem permissão')
      return 1
    }

    const username = state.arguments[0]
    if (!username || username === 'root' || users.length === 1) {
      console.log('Ação inválida')
      return 1
    }

    const targetHome = path.resolve('home', username)
    const filteredUsers = users.filter(user => user.username !== username)
    
    delete tree[username]
    fs.writeFileSync(usersConfigPath, JSON.stringify(filteredUsers, null, 4))
    saveTree()

    if (fs.existsSync(targetHome)) {
      fs.rmSync(targetHome, { recursive: true, force: true })
    }

    console.log(`Usuário ${username} removido.`)
    return 0
  }
}

export { acceptedCommands }