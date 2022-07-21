import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { genSaltSync, hashSync } from 'bcryptjs'
import { parse } from 'dree'
import { handleAuthentication, consultUser } from '@lib/authentication'
import { validatePath } from '@utils/validator'

import { IState, IUser } from 'types/Aplication'
import { IFile, IFolder } from 'types/Files'

import users from '@config/users.json'
import tree from '@config/tree.json'

const specialCharacters = /[ `!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/
export const acceptedCommands = {

  help: ({ user }: IState): number => {
    console.log(
      ' CDIR <nome_do_diretório> – Cria um novo diretório', '\n',
      'CARQ <nome_do_arquivo> – Cria um novo arquivo', '\n',
      'LISTARATR <nome_do_arq_ou_dir> – Lista os atributos de um determinado arquivo ou diretório', '\n',
      'RDIR <nome_do_dir> – Apaga um diretório vazio', '\n',
      'APAGAR <nome> – Apaga um arquivo ou um diretório com arquivos', '\n',
      'LISTAR – Lista o conteúdo do diretório atual, que deve estar em ordem alfabética', '\n',
      'LISTARINV – Lista o conteúdo do diretório em ordem decrescente', '\n',
      'LISTARTUDO – Lista o conteúdo do diretório e se houver, também listará o conteúdo dos subdiretórios', '\n',
      'MUDAR <end_destino> – Altera o estado atual de uma pasta para outra qualquer', '\n',
      'ATUAL – Mostra o nome do diretório atual', '\n',
      'COPIAR <origem> <destino> – Copia um arquivo/diretório para um outro lugar informado', '\n',
      'RENOMEAR <nome_atual> <nome_final> – Renomeia um arquivo ou diretório', '\n',
      'MOVER <origem> <destino> – Move um arquivo/diretório para um outro lugar informado', '\n',
      'BUSCAR <nome_arquivo> <dir_de_busca> – Busca um arquivo informado na hierarquia de diretório', '\n',
      'ALTERARUSR <login_usuario> <senha> - Fará o login do novo usuário', '\n',
      'SAIR - Faz logout do usuário atual', '\n',
      'CLEAR - Limpa a tela', '\n',
      'QUIT - Encerra o programa'
    )

    if (user.privilegeLevel > 0) {
      console.log(
        ' CRIARUSR <login> <senha> - Cria um novo usuário. Também automaticamente criará uma pasta para este usuário', '\n',
        'DELETARUSR <login> - Apaga o usuário. Automaticamente apagará o seu diretório'
      )
    }

    return 0
  },
  /**
  * Lista o conteúdo do diretório em ordem alfabética
  *  @param {IState} state
  * Estado da aplicação com um array que contém o diretório a ser listado
  */
  listar: (state: IState): number => {
    if (!validatePath(state)) return 1

    const folderToList = state.arguments[0] || state.currentFolder

    const filesArray = fs.readdirSync(folderToList, { withFileTypes: true })
    filesArray.forEach(element => console.log(element.isDirectory() ? '📁 ' : '🗄️ ', element.name))

    return 0
  },

  /**
  * Lista o conteúdo do diretório em ordem reversa
  * @param {IState} state
  * Estado da aplicação com um array que contém o diretório a ser listado
  */
  listarinv: (state: IState): number => {
    if (!validatePath(state)) return 1

    const filesArray = fs.readdirSync(state.currentFolder, { withFileTypes: true }).reverse()
    filesArray.forEach(element => console.log(element.isDirectory() ? '📁 ' : '🗄️ ', element.name))
    return 0
  },

  /**
  * Lista todo os diretórios e subdiretórios em formato de árvore
  * @param {IState} state
  * Estado da aplicação com um array que contém o diretório a ser listado
  */
  listartudo: (state: IState): number => {
    if (!validatePath(state)) return 1

    const pathToList = path.resolve(state.currentFolder, state.arguments[0] || './')

    const dirAsTree = parse(pathToList, {
      followLinks: true, // Pode não funcionar no Windows
      exclude: /node_modules/
    })
    console.log(dirAsTree)
    return 0
  },

  /**
  * Lista os atributos do arquivo ou diretório
  * @param {IState} state
  * Estado da aplicação com um array que contém o caminho de um diretório ou arquivo a ser listado
  */
  listaratr: (state: IState): number => {
    if (!validatePath(state)) return 1

    const { username } = state.user

    const pathToList = path.resolve(state.currentFolder, state.arguments[0] || './')
    const extension = path.extname(pathToList)
    const resolvedPath = extension === '' ? path.resolve(pathToList) : path.dirname(pathToList)

    const folderIndex: number = tree[username].findIndex((folder: IFolder) => path.resolve(folder.path) === resolvedPath)

    if (extension) {
      const fileName = path.basename(pathToList)
      const fileIndex: number = tree[username][folderIndex].files.findIndex((file: IFile) => file.name === fileName)
      const file: IFile = tree[username][folderIndex].files[fileIndex]

      console.table({ ...file, created_at: new Date(file.created_at).toLocaleString() })
      return 0
    }

    const { files, ...folder }: IFolder = tree[username][folderIndex]
    console.table({ ...folder, created_at: new Date(folder.created_at).toLocaleString(), owner: username })

    return 0
  },

  /**
  * Cria um novo arquivo
  * @param {IState} state
  * Estado da aplicação com um array que contém o caminho do arquivo a ser criado e os dados a serem escritos
  */
  carq: (state: IState): number => {
    if (!validatePath(state)) return 1

    const { username } = state.user
    const file = state.arguments[0]
    const fileType = path.extname(file)

    if (!file || !fileType) {
      console.log('Digite o nome de um arquivo válido')
      return 1
    }
    const name = path.basename(file)
    const baseFileName = path.basename(file, fileType)

    if (baseFileName.length > 14) {
      console.log('Tamanho do nome excede o limite de 14 caracteres')
      return 1
    }

    if (specialCharacters.test(baseFileName)) {
      console.log('Proibido caracteres especiais')
      return 1
    }

    const filePath = path.resolve(state.currentFolder, file)

    if (fs.existsSync(filePath)) {
      console.log('Arquivo já existe')
      return 1
    }

    state.arguments.shift()

    const data = state.arguments.join(' ')
    fs.writeFileSync(filePath, data)
    const index = tree[username].findIndex((element: IFolder) => path.resolve(element.path) === path.dirname(filePath))

    tree[username][index].files.push({
      id: randomUUID(),
      name,
      created_at: Date.now(),
      data
    })

    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))

    return 0
  },

  /**
  * Delete a pasta ou arquivo no caminho informado
  * @param {IState} state
  * Estado da aplicação contendo um array com o caminho
  */
  apagar: (state: IState): number => {
    if (!validatePath(state)) return 1
    const username = state.user.username
    const baseName = path.basename(state.arguments[0])
    const caminho = path.resolve(state.currentFolder, state.arguments[0])

    fs.rmSync(caminho, { recursive: true })

    if (path.extname(state.arguments[0])) { // Se for arquivo
      const index = tree[username].findIndex((folder: IFolder) =>
        path.resolve(folder.path) === path.dirname(caminho)
      )
      tree[username][index].files = tree[username][index]?.files?.filter((file: IFile) => file.name !== baseName)
    } else {
      tree[username] = tree[username].filter((folder: IFolder) => path.resolve(folder.path) !== caminho)
    }

    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))

    return 0
  },

  /**
  * Copia um arquivo ou diretório para o local
  * @param {IState} state
  * Estado da aplicação contendo o usuário logado e um array contendo o nome do usuário
  */
  copiar: (state: IState): number => {
    const [file, folder] = state.arguments

    if (!validatePath(state) || !validatePath(state, folder)) return 1

    const name = path.basename(file)
    const origin = path.resolve(state.currentFolder, file)

    if (path.extname(file)) {
      const destFile = path.resolve(state.currentFolder, folder, file)

      fs.copyFileSync(origin, destFile)
      const folderIndex = tree[state.user.username].findIndex((folder: IFolder) => path.resolve(folder.path) === destFile)
      const data = fs.readFileSync(origin, 'utf-8')
      const copiedFile = {
        id: randomUUID(),
        name,
        created_at: Date.now(),
        data
      }
      tree[state.user.username][folderIndex].files.push(copiedFile)
    } else {
      const dest = path.resolve(state.currentFolder, folder)
      const originIndex = tree[state.user.username].findIndex((folder: IFolder) => path.resolve(folder.path) === origin)
      const destIndex = tree[state.user.username].findIndex((folder: IFolder) => path.resolve(folder.path) === dest)
      fs.cpSync(origin, dest, { recursive: true })
      tree[state.user.username][destIndex].files.push(tree[state.user.username][originIndex].files)
    }

    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))

    return 0
  },

  mover: (state: IState): number => {
    if (!state.arguments[0]) {
      console.log('Forneça uma origem válida')
      return 1
    }

    if (!state.arguments[1]) {
      console.log('Forneça um destino válido')
      return 1
    }

    if (!path.extname(state.arguments[1])) {
      console.log('Destino não pode ser um arquivo')
    }

    if (!validatePath(state) || !validatePath(state, state.arguments[1])) return 1

    const username = state.user.username
    const folderBase = path.basename(state.arguments[1])
    const origin = path.resolve(state.currentFolder, state.arguments[0])
    const destination = path.resolve(state.currentFolder, state.arguments[1])

    if (!path.extname(state.arguments[0])) { // Se for arquivo
      fs.renameSync(origin, destination)
      const fileName = path.basename(state.arguments[0])
      const index = tree[username].findIndex((folder: IFolder) =>
        path.resolve(folder.path) === path.dirname(origin)
      )
      tree[username][index].files = tree[username][index]?.files?.filter((file: IFile) => file.name !== fileName)
      return 0
    }

    fs.renameSync(origin, path.resolve(destination, folderBase))
    tree[username] = tree[username].filter((folder: IFolder) => path.resolve(folder.path) !== origin)
    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))

    return 0
  },

  /**
  * Busca um arquivo ou pasta foi encontrado e seu caminho
  * @param {IState} state
  *  Estado da aplicação com um array que contém o caminho e o arquivo a ser buscado
  */
  buscar: (state: IState): number => {
    const folderToSearch = path.resolve(state.currentFolder, state.arguments[1] || './')

    if (!validatePath(state, folderToSearch)) return 1

    if (path.basename(folderToSearch) === 'node_modules') return 1

    const dir = fs.readdirSync(folderToSearch, { withFileTypes: true })

    if (!dir) {
      console.log(`Nenhum diretório chamado "${folderToSearch}" encontrado`)
      return 1
    }

    if (dir.some(pasta => pasta.name === state.arguments[0])) {
      console.log('Achado em', path.resolve(folderToSearch, state.arguments[0]))
      return 0
    }

    for (let i = 0; i < dir.length; i++) {
      if (dir[i].isDirectory()) {
        acceptedCommands.buscar({ ...state, arguments: [state.arguments[0], path.resolve(folderToSearch, dir[i].name)] })
      }
    }

    console.log('Arquivo não encontrado')

    return 1
  },

  /**
 * Cria uma nova pasta no caminho informado
 * @param {IState} state
 * Estado da aplicação contendo um array com o caminho
  */
  cdir: (state: IState): number => {
    if (!validatePath(state)) return 1

    if (specialCharacters.test(state.arguments[0])) {
      console.log('Proibido caracteres especiais')
      return 1
    }

    const folder = state.arguments[0]
    const { username } = state.user

    const fullPath = path.resolve(state.currentFolder, folder)
    fs.mkdirSync(fullPath, { recursive: true })

    const newFolder: IFolder = {
      id: randomUUID(),
      created_at: Date.now(),
      path: path.resolve(state.currentFolder, folder).replace(process.cwd(), '').replaceAll('\\', '/').replace('/', ''),
      files: []
    }

    tree[username].push(newFolder)
    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))

    return 0
  },
  /**
 * Deleta a pasta vazia no caminho informado
 * @param {IState} state
 * Estado da aplicação contendo um array com o caminho
  */
  rdir: (state: IState): number => {
    if (!validatePath(state)) return 1
    const directory = path.resolve(state.currentFolder, state.arguments[0])
    const directoryContent = fs.readdirSync(directory)

    if (directoryContent.length === 0) return 1

    fs.rmdirSync(state.arguments[0])
    tree[state.user.username] = tree[state.user.username].filter((folder: IFolder) => path.resolve(folder.path) === directory)
    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))

    return 0
  },

  /**
  * Muda o diretório atual
  * @param {IState} state
  * Estado da aplicação um array com o nome do novo caminho
  */
  mudar: (state: IState): number => {
    if (!validatePath(state)) return 1

    const resolvedNewPath = path.resolve(state.currentFolder, state.arguments[0])

    if (fs.lstatSync(resolvedNewPath).isFile()) {
      console.log('O caminho provido não é um diretório')
      return 1
    }

    state.currentFolder = resolvedNewPath
  },

  /**
  * Renomeia o arquivo ou pasta no caminho indicado
  * @param {IState} state
  * Estado da aplicação contendo um array com o caminho
  */
  renomear: (state: IState): number => {
    const { currentFolder, arguments: [oldName, newName], user } = state

    if (!validatePath(state)) return 1

    if (specialCharacters.test(newName)) {
      console.log('Proibido caracteres especiais')
      return 1
    }

    const oldPath = path.resolve(currentFolder, oldName)
    const newPath = path.resolve(currentFolder, newName)

    const oldBaseName = path.basename(oldPath)
    const baseName = path.basename(newPath)

    fs.renameSync(oldPath, newPath)

    if (path.extname(oldName)) { // Se for arquivo
      const index = tree[user.username].findIndex((folder: IFolder) =>
        path.resolve(folder.path) === path.dirname(newPath)
      )
      const fileIndex = tree[user.username][index].files.findIndex((file: IFile) => file.name === oldBaseName)
      tree[user.username][index].files[fileIndex].name = baseName
    } else {
      const index = tree[user.username].findIndex((folder: IFolder) =>
        path.resolve(folder.path) === oldPath
      )
      tree[user.username][index].path = tree[user.username][index].path.replace(oldBaseName, baseName)
    }

    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))

    return 0
  },
  /**
  * Lista o caminho atual
  * @param {IState} state
  * Estado da aplicação
  */
  atual: ({ currentFolder }: IState): number => {
    console.log(currentFolder)
    return 0
  },

  /**
  * Cria um novo usuário e salva seu diretório no disco
  * @param {IState} state
  * Estado da aplicação contendo o usuário logado e um array com as credenciais do novo usuário
  */
  criarusr: (state: IState): number => {
    if (state.user.privilegeLevel < 1) {
      console.log('Você não tem permissão para isto')
      return 1
    }

    const [username, password] = state.arguments

    if (!username || !password) {
      console.log('Forneça credenciais válidas!')
      return 1
    }

    if (users.some(element => element.username === username)) {
      console.log('Usuário já existe')
      return 1
    }
    const salt = genSaltSync()
    const hashedPassword = hashSync(password, salt)

    const novoUser: IUser & { password: string } = {
      id: randomUUID(),
      username,
      password: hashedPassword,
      privilegeLevel: 0
    }

    users.push(novoUser)

    tree[username] = [{
      id: randomUUID(),
      created_at: Date.now(),
      path: `home/${username}`,
      files: []
    }]

    fs.mkdirSync(`./home/${username}`, { recursive: true })

    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))
    fs.writeFileSync('./src/config/users.json', JSON.stringify(users, null, 4))

    return 0
  },
  /**
  * Delete um usuário e seu diretório no disco
  * @param {IState} state
  * Estado da aplicação contendo o usuário logado e um array contendo o nome do usuário
  */
  deletarusr: (state: IState): number => {
    if (state.user.privilegeLevel < 1) {
      console.log('Você não tem permissão para isto')
      return 1
    }

    const username = state.arguments[0]

    if (!username) {
      console.log('Forneça o usuário a ser deletado!')
      return 1
    }

    if (username === 'root') {
      console.log('Não é possível deletar o usuário root')
      return 1
    }

    if (users.length === 1) { // Se o arquivo contendo os usuários tiver apenas 1, se este for deletado não teremos mais usuário e seria impossível fazer login
      console.log('Você não tem permissão para isto')
      return 1
    }

    if (!users.some(element => element.username === username) && !fs.existsSync(`home${username}`)) {
      console.log('Usuário não existe')
      return 1
    }

    const filteredUsers = users.filter(user => user.username !== username)
    delete tree[username]

    fs.writeFileSync('./src/config/users.json', JSON.stringify(filteredUsers, null, 4))
    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))
    fs.rmdirSync(`./home/${username}`)

    return 0
  },
  clear: console.clear,
  alterarusr: consultUser,
  sair: handleAuthentication,
  quit: () => { }
}
