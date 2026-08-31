import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { TerminalContext, IUser } from 'types/Aplication'
import { IVfsNode } from 'types/Files'
import { handleAuthentication } from '@core/auth/authentication'
import { vfs } from '@core/vfs/vfs'
import { VFSError } from '@core/vfs/errors'

import usersData from '@config/users.json'
const users = usersData as unknown as IUser[]
const usersConfigPath = path.resolve('src', 'config', 'users.json')

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
      RESETAR - Formata o VFS e apaga todos os arquivos criados
      SAIR - Faz logout do usuário atual
      CLEAR - Limpa a tela
      QUIT - Encerra o programa
    `.trim())
    return 0
  },

  resetar: (state: TerminalContext): number => {
    const homeDir = path.resolve('home')
    if (fs.existsSync(homeDir)) {
      fs.rmSync(homeDir, { recursive: true, force: true })
    }
    
    // Reset memory tree
    const tree = vfs.getTree()
    for (const key of Object.keys(tree)) {
      delete tree[key]
    }
    
    // Boot will recreate the empty user homes on next startup or we can do it here
    users.forEach(user => {
      tree[user.username] = {
        id: crypto.randomUUID(),
        name: user.username,
        type: 'folder',
        created_at: Date.now(),
        children: []
      }
      const userHome = path.resolve('home', user.username)
      fs.mkdirSync(userHome, { recursive: true })
    })

    vfs.save()
    console.log('Sistema de arquivos virtual formatado com sucesso.')
    
    // Reset current folder to home
    state.currentFolder = path.resolve('home', state.user!.username)
    return 0
  },

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

  alterarusr: (state: TerminalContext): number => {
    handleAuthentication(state)
    return 0
  },

  carq: (state: TerminalContext): number => {
    const fileName = state.arguments[0]
    if (!fileName) throw new VFSError('Nome do arquivo não fornecido.')
    vfs.validateNameSafe(fileName)

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const fullPath = path.resolve(state.currentFolder, fileName)

    vfs.validatePathSafe(userHomePath, fullPath)

    const currentFolderNode = vfs.resolveNode(username, userHomePath, state.currentFolder)
    if (!currentFolderNode || currentFolderNode.type !== 'folder') {
      throw new VFSError('Diretório atual inválido.')
    }

    if (currentFolderNode.children!.some(c => c.name === fileName)) {
      throw new VFSError('Um arquivo ou diretório com este nome já existe.')
    }

    fs.writeFileSync(fullPath, '')

    currentFolderNode.children!.push({
      id: crypto.randomUUID(),
      name: fileName,
      type: 'file',
      data: '',
      created_at: Date.now()
    })

    vfs.save()
    return 0
  },

  apagar: (state: TerminalContext): number => {
    const targetName = state.arguments[0]
    if (!targetName) throw new VFSError('Alvo não fornecido.')

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const fullPath = path.resolve(state.currentFolder, targetName)

    vfs.validatePathSafe(userHomePath, fullPath)

    if (!fs.existsSync(fullPath)) {
      throw new VFSError('Arquivo ou diretório não encontrado fisicamente.')
    }

    const parentFolderNode = vfs.resolveNode(username, userHomePath, state.currentFolder)
    if (parentFolderNode && parentFolderNode.type === 'folder') {
      parentFolderNode.children = parentFolderNode.children!.filter(child => child.name !== targetName)
    }

    fs.rmSync(fullPath, { recursive: true, force: true })
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

  mover: (state: TerminalContext): number => {
    const [source, dest] = state.arguments
    if (!source || !dest) throw new VFSError('Origem ou destino não fornecidos.')

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    
    const sourcePath = path.resolve(state.currentFolder, source)
    const destPath = path.resolve(state.currentFolder, dest, path.basename(source))

    vfs.validatePathSafe(userHomePath, sourcePath)
    vfs.validatePathSafe(userHomePath, destPath)

    if (!fs.existsSync(sourcePath)) {
      throw new VFSError('Arquivo de origem não encontrado no disco.')
    }

    fs.renameSync(sourcePath, destPath)

    const sourceParentDir = path.dirname(sourcePath)
    const sourceParent = vfs.resolveNode(username, userHomePath, sourceParentDir)
    const destParent = vfs.resolveNode(username, userHomePath, path.resolve(state.currentFolder, dest))

    if (!sourceParent || !destParent) throw new VFSError('Caminho virtual de origem ou destino não resolvido.')

    const nodeToMove = sourceParent.children!.find(c => c.name === path.basename(source))
    if (!nodeToMove) throw new VFSError('Nó não encontrado na árvore virtual.')

    sourceParent.children = sourceParent.children!.filter(c => c.name !== nodeToMove.name)
    destParent.children!.push(nodeToMove)

    vfs.save()
    return 0
  },

  copiar: (state: TerminalContext): number => {
    const [source, dest] = state.arguments
    if (!source || !dest) throw new VFSError('Origem ou destino não fornecidos.')

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)

    const sourcePath = path.resolve(state.currentFolder, source)
    const destPath = path.resolve(state.currentFolder, dest, path.basename(source))

    vfs.validatePathSafe(userHomePath, sourcePath)
    vfs.validatePathSafe(userHomePath, destPath)

    if (!fs.existsSync(sourcePath)) throw new VFSError('Arquivo de origem não encontrado no disco.')

    fs.cpSync(sourcePath, destPath, { recursive: true })

    const sourceNode = vfs.resolveNode(username, userHomePath, sourcePath)
    const destParent = vfs.resolveNode(username, userHomePath, path.resolve(state.currentFolder, dest))

    if (!sourceNode || !destParent) throw new VFSError('Caminho virtual de origem ou destino não resolvido.')

    const clonedNode = vfs.deepCloneNode(sourceNode)
    destParent.children!.push(clonedNode)

    vfs.save()
    return 0
  },

  buscar: (state: TerminalContext): number => {
    const [fileName, targetDir] = state.arguments
    if (!fileName) throw new VFSError('Nome não fornecido.')

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const searchBasePath = targetDir ? path.resolve(state.currentFolder, targetDir) : state.currentFolder

    vfs.validatePathSafe(userHomePath, searchBasePath)

    const rootSearchNode = vfs.resolveNode(username, userHomePath, searchBasePath)
    if (!rootSearchNode) throw new VFSError('Diretório de busca não encontrado.')

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
    if (!wasFound) throw new VFSError('Arquivo não encontrado na busca.')

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

  deletarusr: (state: TerminalContext): number => {
    if (state.user!.privilegeLevel < 1) throw new VFSError('Privilégios insuficientes.')

    const username = state.arguments[0]
    if (!username || username === 'root' || users.length === 1) {
      throw new VFSError('Não é possível remover este usuário.')
    }

    const targetHome = path.resolve('home', username)
    const filteredUsers = users.filter(user => user.username !== username)

    const tree = vfs.getTree()
    delete tree[username]

    fs.writeFileSync(usersConfigPath, JSON.stringify(filteredUsers, null, 4))
    vfs.save()

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
  },

  renomear: (state: TerminalContext): number => {
    const [currentName, newName] = state.arguments
    if (!currentName || !newName) throw new VFSError('Parâmetros insuficientes.')
    vfs.validateNameSafe(newName)

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)

    const absoluteCurrent = path.resolve(state.currentFolder, currentName)
    const absoluteNew = path.resolve(state.currentFolder, newName)

    vfs.validatePathSafe(userHomePath, absoluteCurrent)
    vfs.validatePathSafe(userHomePath, absoluteNew)

    if (!fs.existsSync(absoluteCurrent)) throw new VFSError('Arquivo origem não encontrado no disco.')

    fs.renameSync(absoluteCurrent, absoluteNew)

    const parentNode = vfs.resolveNode(username, userHomePath, state.currentFolder)
    if (!parentNode || !parentNode.children) throw new VFSError('Diretório pai inválido no VFS.')

    const targetNode = parentNode.children.find(c => c.name === currentName)
    if (!targetNode) throw new VFSError('Nó não encontrado no VFS.')

    targetNode.name = newName
    vfs.save()
    return 0
  },

  listaratr: (state: TerminalContext): number => {
    const targetName = state.arguments[0]
    if (!targetName) throw new VFSError('Alvo não fornecido.')

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const absolutePath = path.resolve(state.currentFolder, targetName)

    const targetNode = vfs.resolveNode(username, userHomePath, absolutePath)
    if (!targetNode) throw new VFSError('Alvo não encontrado.')

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
  }
}

export { acceptedCommands }