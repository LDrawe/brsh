import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { TerminalContext } from 'types/Aplication'
import { IVfsNode } from 'types/Files'
import { vfs } from '@core/vfs/vfs'
import { VFSError } from '@core/vfs/errors'

export const fileCommands = {
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

  ler: (state: TerminalContext): number => {
    const fileName = state.arguments[0]
    if (!fileName) throw new VFSError('Nome do arquivo não fornecido.')

    const { username } = state.user!
    const userHomePath = path.resolve('home', username)
    const fullPath = path.resolve(state.currentFolder, fileName)

    vfs.validatePathSafe(userHomePath, fullPath)

    if (!fs.existsSync(fullPath)) throw new VFSError('Arquivo não encontrado no disco.')
    if (fs.statSync(fullPath).isDirectory()) throw new VFSError('O alvo especificado é um diretório, não um arquivo.')

    // Efficient streaming read piped directly to standard output (stdout)
    const readStream = fs.createReadStream(fullPath)
    readStream.on('error', (err) => {
      console.error(`Erro ao ler arquivo: ${err.message}`)
    })
    readStream.pipe(process.stdout)

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
  }
}
