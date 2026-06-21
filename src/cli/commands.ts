import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { TerminalContext, IUser } from 'types/Aplication'
import { IVfsNode } from 'types/Files'
import { handleAuthentication } from '@core/auth/authentication'

// Core imports replacing local functions
import { writeAtomically } from '@core/vfs/io'
import { isNameSafe, isPathSafe } from '@core/vfs/security'
import { resolveVfsNode } from '@core/vfs/pointer'

import usersData from '@config/users.json'
import treeRaw from '@config/tree.json'

const users = usersData as unknown as IUser[]
const tree: Record<string, IVfsNode> = treeRaw as any

const treeConfigPath = path.resolve('src', 'config', 'tree.json')
const usersConfigPath = path.resolve('src', 'config', 'users.json')

// Leverages the new atomic save
const saveTree = () => writeAtomically(treeConfigPath, tree)

const acceptedCommands: Record<string, (state: TerminalContext) => any> = {

  sair: (state: TerminalContext) => handleAuthentication(state),
  
  quit: () => process.exit(0),

  help: (state: TerminalContext): number => {

    console.log(`
      CDIR <nome_do_diretório> – Cria um novo diretório
      CARQ <nome_do_arquivo> – Cria um novo arquivo
      LISTARATR <nome_do_arq_ou_dir> – Lista os atributos de um arquivo ou diretório
      RDIR <nome_do_dir> – Apaga um diretório vazio
      APAGAR <nome> – Apaga um arquivo ou um diretório com arquivos
      LISTAR – Lista o conteúdo do diretório atual, em ordem alfabética
      LISTARINV – Lista o conteúdo do diretório em ordem decrescente
      LISTARTUDO – Lista o conteúdo e subdiretórios
      MUDAR <end_destino> – Altera o estado atual da pasta
      ATUAL – Mostra o nome do diretório atual
      COPIAR <origem> <destino> – Copia um arquivo/diretório
      RENOMEAR <nome_atual> <nome_final> – Renomeia um arquivo ou diretório
      MOVER <origem> <destino> – Move um arquivo/diretório
      BUSCAR <nome_arquivo> [dir_de_busca] – Busca um arquivo na hierarquia
      ALTERARUSR <login> <senha> - Fará o login de outro usuário
      DELETARUSR <login> - Deleta um usuário do sistema
      SAIR - Faz logout do usuário atual
      CLEAR - Limpa a tela
      QUIT - Encerra o programa
    `.trim())

    return 0

  },

  cdir: (state: TerminalContext): number => {

    const folderName = state.arguments[0]

    if (!folderName || !isNameSafe(folderName)) return 1

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const fullPath = path.resolve(state.currentFolder, folderName)

    // Using the centralized security module
    if (!isPathSafe(userHomePath, fullPath)) {
      console.log('Acesso negado: Tentativa de evasão de diretório bloqueada.')
      return 1
    }

    const currentFolderNode = resolveVfsNode(tree[username], userHomePath, state.currentFolder)

    if (!currentFolderNode || currentFolderNode.type !== 'folder') return 1

    if (currentFolderNode.children!.some(c => c.name === folderName)) return 1

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

  alterarusr: (state: TerminalContext): number => {

    handleAuthentication(state)

    return 0

  },

  carq: (state: TerminalContext): number => {

    const fileName = state.arguments[0]

    if (!fileName || !isNameSafe(fileName)) return 1

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const fullPath = path.resolve(state.currentFolder, fileName)

    if (!isPathSafe(userHomePath, fullPath)) {
      console.log('Acesso negado: Tentativa de evasão bloqueada.')
      return 1
    }

    const currentFolderNode = resolveVfsNode(tree[username], userHomePath, state.currentFolder)

    if (!currentFolderNode || currentFolderNode.type !== 'folder') return 1

    if (currentFolderNode.children!.some(c => c.name === fileName)) return 1

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

  apagar: (state: TerminalContext): number => {

    const targetName = state.arguments[0]

    if (!targetName) return 1

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const fullPath = path.resolve(state.currentFolder, targetName)

    if (!isPathSafe(userHomePath, fullPath)) {
      console.log('Acesso negado.')
      return 1
    }

    if (!fs.existsSync(fullPath)) return 1

    const parentFolderNode = resolveVfsNode(tree[username], userHomePath, state.currentFolder)

    if (parentFolderNode && parentFolderNode.type === 'folder') {
      parentFolderNode.children = parentFolderNode.children!.filter(child => child.name !== targetName)
    }

    fs.rmSync(fullPath, { recursive: true, force: true })

    saveTree()

    return 0

  },

  rdir: (state: TerminalContext): number => {

    const targetName = state.arguments[0]

    if (!targetName) return 1

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const absolutePath = path.resolve(state.currentFolder, targetName)

    if (!isPathSafe(userHomePath, absolutePath)) {
      console.log('Acesso negado.')
      return 1
    }

    const targetNode = resolveVfsNode(tree[username], userHomePath, absolutePath)

    if (!targetNode || targetNode.type !== 'folder') return 1

    if (targetNode.children && targetNode.children.length > 0) {
      console.log('Erro: O diretório não está vazio. Use APAGAR para remoção recursiva.')
      return 1
    }

    const parentNode = resolveVfsNode(tree[username], userHomePath, state.currentFolder)

    if (parentNode && parentNode.type === 'folder') {
      parentNode.children = parentNode.children!.filter(c => c.name !== targetName)
    }

    fs.rmdirSync(absolutePath)

    saveTree()

    return 0

  },

  mover: (state: TerminalContext): number => {

    const [source, dest] = state.arguments
    
    if (!source || !dest) return 1

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    
    // Physical operations
    const sourcePath = path.resolve(state.currentFolder, source)
    const destPath = path.resolve(state.currentFolder, dest, path.basename(source))

    if (!isPathSafe(userHomePath, sourcePath) || !isPathSafe(userHomePath, destPath)) {
      console.log('Acesso negado.')
      return 1
    }

    if (!fs.existsSync(sourcePath)) return 1

    fs.renameSync(sourcePath, destPath)

    // Update VFS memory map
    const sourceParentDir = path.dirname(sourcePath) // <-- Resolve o diretório pai real da origem
    const sourceParent = resolveVfsNode(tree[username], userHomePath, sourceParentDir)
    const destParent = resolveVfsNode(tree[username], userHomePath, path.resolve(state.currentFolder, dest))

    if (!sourceParent || !destParent) return 1

    const nodeToMove = sourceParent.children!.find(c => c.name === path.basename(source))
    
    if (!nodeToMove) return 1

    // Quebra o link do diretório antigo e anexa no novo
    sourceParent.children = sourceParent.children!.filter(c => c.name !== nodeToMove.name)
    destParent.children!.push(nodeToMove)

    saveTree()

    return 0

  },

  copiar: (state: TerminalContext): number => {

    const [source, dest] = state.arguments

    if (!source || !dest) return 1

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)

    const sourcePath = path.resolve(state.currentFolder, source)
    const destPath = path.resolve(state.currentFolder, dest, path.basename(source))

    if (!fs.existsSync(sourcePath)) return 1

    fs.copyFileSync(sourcePath, destPath)

    const sourceNode = resolveVfsNode(tree[username], userHomePath, sourcePath)
    const destParent = resolveVfsNode(tree[username], userHomePath, path.resolve(state.currentFolder, dest))

    if (!sourceNode || !destParent) return 1

    destParent.children!.push({ ...sourceNode, id: crypto.randomUUID() })

    saveTree()

    return 0

  },

  buscar: (state: TerminalContext): number => {

    const [fileName, targetDir] = state.arguments

    if (!fileName) return 1

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)

    // Default search base is current folder, unless specified
    const searchBasePath = targetDir ? path.resolve(state.currentFolder, targetDir) : state.currentFolder

    const rootSearchNode = resolveVfsNode(tree[username], userHomePath, searchBasePath)

    if (!rootSearchNode) return 1

    // DFS (Depth-First Search) across the virtual tree memory
    const search = (node: IVfsNode, currentPath: string): boolean => {

      if (node.name === fileName) {
        console.log(`Encontrado: ${path.join(currentPath, node.name)}`)
        return true
      }

      if (!node.children) return false

      let found = false

      for (const child of node.children) {
        if (search(child, path.join(currentPath, node.name))) found = true
      }

      return found

    }

    const wasFound = search(rootSearchNode, searchBasePath)

    if (!wasFound) console.log('Arquivo não encontrado.')

    return wasFound ? 0 : 1

  },

  listar: (state: TerminalContext): number => {

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const currentFolderNode = resolveVfsNode(tree[username], userHomePath, state.currentFolder)

    if (!currentFolderNode || !currentFolderNode.children) return 1

    currentFolderNode.children.forEach(item => {
      console.log(item.type === 'folder' ? '📁' : '🗄️', item.name)
    })

    return 0

  },

  deletarusr: (state: TerminalContext): number => {

    if (state.user!.privilegeLevel < 1) return 1

    const username = state.arguments[0]

    if (!username || username === 'root' || users.length === 1) return 1

    const targetHome = path.resolve('home', username)

    // Prevents deletion if user is not in the db
    const filteredUsers = users.filter(user => user.username !== username)

    delete tree[username]

    fs.writeFileSync(usersConfigPath, JSON.stringify(filteredUsers, null, 4))
    saveTree()

    if (fs.existsSync(targetHome)) fs.rmSync(targetHome, { recursive: true, force: true })

    console.log(`Usuário ${username} removido.`)

    return 0

  },
  clear: (): number => {

    console.clear()

    return 0

  },

  atual: (state: TerminalContext): number => {

    console.log(`Working directory: ${state.currentFolder}`)

    return 0

  },

  mudar: (state: TerminalContext): number => {

    const targetDir = state.arguments[0]

    if (!targetDir) return 1

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const targetPath = path.resolve(state.currentFolder, targetDir)

    // Sandboxing: Prevents user from escaping their home directory (e.g., using '../../')
    if (!targetPath.startsWith(userHomePath)) {
      console.log('Acesso negado: Fora dos limites do utilizador.')
      return 1
    }

    const targetNode = resolveVfsNode(tree[username], userHomePath, targetPath)

    if (!targetNode || targetNode.type !== 'folder') {
      console.log('Diretório não encontrado.')
      return 1
    }

    // Updates the REPL session context pointer
    state.currentFolder = targetPath

    return 0

  },

  renomear: (state: TerminalContext): number => {

    const [currentName, newName] = state.arguments

    if (!currentName || !newName || !isNameSafe(newName)) return 1

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)

    const absoluteCurrent = path.resolve(state.currentFolder, currentName)
    const absoluteNew = path.resolve(state.currentFolder, newName)

    if (!fs.existsSync(absoluteCurrent)) return 1

    fs.renameSync(absoluteCurrent, absoluteNew)

    const parentNode = resolveVfsNode(tree[username], userHomePath, state.currentFolder)

    if (!parentNode || !parentNode.children) return 1

    const targetNode = parentNode.children.find(c => c.name === currentName)

    if (!targetNode) return 1

    targetNode.name = newName

    saveTree()

    return 0

  },

  listaratr: (state: TerminalContext): number => {

    const targetName = state.arguments[0]

    if (!targetName) return 1

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const absolutePath = path.resolve(state.currentFolder, targetName)

    const targetNode = resolveVfsNode(tree[username], userHomePath, absolutePath)

    if (!targetNode) return 1

    const date = new Date(targetNode.created_at).toLocaleString()

    console.log(`Nome: ${targetNode.name}`)
    console.log(`Tipo: ${targetNode.type === 'folder' ? 'Diretório' : 'Arquivo'}`)
    console.log(`Criado em: ${date}`)
    console.log(`ID Virtual: ${targetNode.id}`)

    return 0

  },

  listarinv: (state: TerminalContext): number => {

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const currentFolderNode = resolveVfsNode(tree[username], userHomePath, state.currentFolder)

    if (!currentFolderNode || !currentFolderNode.children) return 1

    // Memory cloning to avoid mutating the actual VFS tree sorting
    const reversedChildren = [...currentFolderNode.children].sort((a, b) => b.name.localeCompare(a.name))

    reversedChildren.forEach(item => {
      console.log(item.type === 'folder' ? '📁' : '🗄️', item.name)
    })

    return 0

  },

  listartudo: (state: TerminalContext): number => {

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const currentFolderNode = resolveVfsNode(tree[username], userHomePath, state.currentFolder)

    if (!currentFolderNode) return 1

    // Recursive traversal to print the tree topology
    const printTree = (node: IVfsNode, level: number) => {

      const indent = '  '.repeat(level)
      console.log(`${indent}${node.type === 'folder' ? '📁' : '🗄️'} ${node.name}`)

      if (!node.children) return

      node.children.forEach(child => printTree(child, level + 1))

    }

    printTree(currentFolderNode, 0)

    return 0

  }

}

export { acceptedCommands }