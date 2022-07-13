import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { genSaltSync, hashSync } from 'bcrypt'
import dree from 'dree'
import { handleAuthentication, handleLogin } from '@lib/authentication'
import { validatePath } from '@utils/validator'
import users from '@config/users.json'
import tree from '@config/tree.json'
import { IUser } from 'types/User'
import { IAppState } from 'types/AppState'
import { IFile, IFolder } from 'types/Files'

const specialCharacters = /[ `!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/

export const acceptedCommands = {

  help: (appState: IAppState) => {
    console.log(
      'CDIR <nome_do_diretório> – cria um novo diretório', '\n',
      'CARQ <nome_do_arquivo> – cria um novo arquivo', '\n',
      'LISTARATR <nome_do_arq_ou_dir> – lista os atributos de um determinado arquivo ou diretório', '\n',
      'RDIR <nome_do_dir> – apaga um diretório vazio', '\n',
      'APAGAR <nome> – apaga um arquivo ou um diretório com arquivos (e faz isso recursivamente)', '\n',
      'LISTAR – lista o conteúdo do diretório atual, que deve estar em ordem alfabética', '\n',
      'LISTARINV – lista o conteúdo do diretório em ordem decrescente', '\n',
      'LISTARTUDO – lista o conteúdo do diretório e se houver, também listará o conteúdo dos subdiretórios', '\n',
      'MUDAR <end_destino> – altera o estado atual de uma pasta para outra qualquer', '\n',
      'ATUAL – mostra o nome do diretório atual', '\n',
      'COPIAR <origem> <destino> – copia um arquivo/diretório para um outro lugar informado', '\n',
      'RENOMEAR <nome_atual> <nome_final> – renomeia um arquivo ou diretório', '\n',
      'MOVER <origem> <destino> – move um arquivo/diretório para um outro lugar informado', '\n',
      'BUSCAR <nome_arquivo> <dir_de_busca> – busca um arquivo informado na hierarquia de diretório'
    )
  },
  /**
  * Lista o conteúdo do diretório em ordem alfabética
  *  @param {IAppState} appState
  * Estado da aplicação com um array que contém o diretório a ser listado
  */
  listar: (appState: IAppState): number => {
    if (!validatePath(appState, appState.arguments[0])) return 1

    const folderToList = appState.arguments[0] || appState.currentFolder

    const filesArray = fs.readdirSync(folderToList, { withFileTypes: true })
    filesArray.forEach(element => process.env.NODE_ENV !== 'test' && console.log(element.isDirectory() ? '📁 ' : '🗄️ ', element.name))

    return 0
  },

  /**
  * Lista o conteúdo do diretório em ordem reversa
  * @param {IAppState} appState
  * Estado da aplicação com um array que contém o diretório a ser listado
  */
  listarinv: ({ currentFolder }: IAppState): number => {
    const filesArray = fs.readdirSync(currentFolder, { withFileTypes: true }).reverse()
    filesArray.forEach(element => process.env.NODE_ENV !== 'test' && console.log(element.isDirectory() ? '📁 ' : '🗄️ ', element.name))
    return 0
  },

  /**
  * Lista todo os diretórios e subdiretórios em formato de árvore
  * @param {IAppState} appState
  * Estado da aplicação com um array que contém o diretório a ser listado
  */
  listartudo: ({ currentFolder }: IAppState): number => {
    const tree = dree.parse(currentFolder, {
      followLinks: true, // Pode não funcionar no Windows
      exclude: /node_modules/
    })
    console.log(tree)
    return 0
  },

  /**
  * Lista os atributos do arquivo ou diretório
  * @param {IAppState} appState
  * Estado da aplicação com um array que contém o caminho de um diretório ou arquivo a ser listado
  */
  listaratr: (appState: IAppState): number => {
    if (!validatePath(appState, appState.arguments[0])) return 1

    const pathToList = appState.arguments[0] || './'
    const stats: IFolder = tree[appState.user.username].find((folder: IFolder) => path.resolve(folder.path) === path.resolve(appState.currentFolder, pathToList))
    delete stats.files
    console.table({ ...stats, created_at: new Date(stats.created_at).toLocaleString() })

    return 0
  },
  /**
  * Busca um arquivo ou pasta foi encontrado e seu caminho
  * @param {IAppState} appState
  *  Estado da aplicação com um array que contém o caminho e o arquivo a ser buscado
  */
  buscar: (appState: IAppState): number => {
    const folderToSearch = path.resolve(appState.currentFolder, appState.arguments[1] || './')

    if (!validatePath(appState, folderToSearch)) return 1

    if (path.basename(folderToSearch) === 'node_modules') return 1

    const dir = fs.readdirSync(folderToSearch, { withFileTypes: true })

    if (!dir) {
      console.log(`Nenhum diretório chamado "${folderToSearch}" encontrado`)
      return 1
    }

    if (dir.some(pasta => pasta.name === appState.arguments[0])) {
      console.log('Achado em', path.resolve(folderToSearch, appState.arguments[0]))
      return 0
    }

    for (let i = 0; i < dir.length; i++) {
      if (dir[i].isDirectory()) {
        acceptedCommands.buscar({ ...appState, arguments: [appState.arguments[0], path.resolve(folderToSearch, dir[i].name)] })
      }
    }

    console.log('Arquivo não encontrado')

    return 1
  },

  /**
  * Cria um novo arquivo
  * @param {IAppState} appState
  * Estado da aplicação com um array que contém o caminho do arquivo a ser criado e os dados a serem escritos
  */
  carq: (appState: IAppState): number => {
    const user = appState.user.username
    const file = appState.arguments[0]
    const fileType = path.extname(file)

    if (!file || !fileType) {
      console.log('Digite o nome de um arquivo válido')
      return 1
    }
    const baseName = path.basename(file, fileType)

    if (baseName.length > 14) {
      console.log('Tamanho do nome excede o limite de 14 caracteres')
      return 1
    }

    if (specialCharacters.test(baseName)) {
      console.log('Proibido caracteres especiais')
      return 1
    }

    appState.arguments.shift()

    const data = appState.arguments.join(' ')
    const filePath = path.resolve(appState.currentFolder, file)
    fs.writeFileSync(filePath, data)
    const index = tree[user].findIndex((element: IFolder) => path.resolve(element.path) === appState.currentFolder)
    tree[user][index].files.push({
      id: randomUUID(),
      name: path.basename(file),
      created_at: Date.now(),
      data
    })
    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))

    return 0
  },

  /**
  * Cria um novo usuário e salva seu diretório no disco
  * @param {IAppState} appState
  * Estado da aplicação contendo o usuário logado e um array com as credenciais do novo usuário
  */
  criarusr: (appState: IAppState): number => {
    if (appState.user.privilegeLevel < 1) {
      console.log('Você não tem permissão para isto')
      return 1
    }

    const [username, password] = appState.arguments

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

    const novoUser: IUser = {
      id: randomUUID(),
      username,
      password: hashedPassword,
      privilegeLevel: 0
    }

    users.push(novoUser)
    fs.writeFileSync('./src/config/users.json', JSON.stringify(users, null, 4))
    fs.mkdirSync(`./home/${username}`, { recursive: true })

    tree[username] = [{
      id: randomUUID(),
      name: username,
      created_at: Date.now(),
      path: `home/${username}`,
      files: []
    }]

    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))

    return 0
  },

  /**
  * Delete um usuário e seu diretório no disco
  * @param {IAppState} appState
  * Estado da aplicação contendo o usuário logado e um array contendo o nome do usuário
  */
  deletarusr: (appState: IAppState): number => {
    if (appState.user.privilegeLevel < 1) {
      console.log('Você não tem permissão para isto')
      return 1
    }

    const username = appState.arguments[0]

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

  /**
 * Cria uma nova pasta no caminho informado
 * @param {IAppState} appState
 * Estado da aplicação contendo um array com o caminho
  */
  cdir: (appState: IAppState): number => {
    if (!validatePath(appState)) return 1

    if (specialCharacters.test(appState.arguments[0])) {
      console.log('Proibido caracteres especiais')
      return 1
    }

    const folder = appState.arguments[0]

    const fullPath = path.resolve(appState.currentFolder, folder)
    fs.mkdirSync(fullPath, { recursive: true })

    const { username } = appState.user

    const newFolder: IFolder = {
      id: randomUUID(),
      created_at: Date.now(),
      path: path.resolve(appState.currentFolder, folder).replace(process.cwd(), '').replaceAll('\\', '/').replace('/', ''),
      files: []
    }

    tree[username].push(newFolder)
    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))

    return 0
  },
  /**
 * Deleta a pasta vazia no caminho informado
 * @param {IAppState} appState
 * Estado da aplicação contendo um array com o caminho
  */
  rdir: (appState: IAppState): number => {
    if (!validatePath(appState)) return 1

    fs.rmdirSync(appState.arguments[0])
  },
  /**
  * Delete a pasta ou arquivo no caminho informado
  * @param {IAppState} appState
  * Estado da aplicação contendo um array com o caminho
  */
  apagar: (appState: IAppState): number => {
    if (!validatePath(appState)) return 1
    const username = appState.user.username
    const baseName = path.basename(appState.arguments[0])
    const caminho = path.resolve(appState.currentFolder, appState.arguments[0])

    fs.rmSync(caminho, { recursive: true })
    const index = tree[username].findIndex((folder: IFolder) => {
      const caminhodapasta = path.resolve(folder.path, caminho)
      const caminhodouser = path.resolve(appState.currentFolder, caminho)
      return caminhodapasta === caminhodouser
    })
    tree[username][index].files = tree[username][index].files.filter((file: IFile) => file.name !== baseName)
    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))

    return 0
  },
  /**
  * Delete um usuário e seu diretório no disco
  * @param {IAppState} appState
  * Estado da aplicação contendo o usuário logado e um array contendo o nome do usuário
  */
  copiar: (appState: IAppState): number => {
    if (!validatePath(appState, appState.arguments[0]) || validatePath(appState, appState.arguments[1])) return

    fs.copyFileSync(appState.arguments[0], appState.arguments[1])

    return 0
  },
  /**
  * Muda o caminho atual
  * @param {IAppState} appState
  * Estado da aplicação um array com o nome do novo caminho
  */
  mudar: (appState: IAppState): number => {
    if (!validatePath(appState)) return 1

    const resolvedNewPath = path.resolve(appState.currentFolder, appState.arguments[0])

    if (fs.lstatSync(resolvedNewPath).isFile()) {
      console.log('O caminho provido não é um diretório')
      return 1
    }

    appState.currentFolder = resolvedNewPath
  },

  /**
  * Renomeia o arquivo ou pasta no caminho indicado
  * @param {IAppState} appState
  * Estado da aplicação contendo um array com o caminho
  */
  renomear: ({ arguments: [oldName, newName] }: IAppState): number => {
    fs.renameSync(oldName, newName)
    return 0
  },
  /**
  * Lista o caminho atual
  * @param {IAppState} appState
  * Estado da aplicação
  */
  atual: ({ currentFolder }: IAppState): number => {
    console.log(currentFolder)
    return 0
  },
  clear: console.clear,
  alterarusr: handleLogin,
  sair: handleAuthentication
}
