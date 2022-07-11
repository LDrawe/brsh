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
import { IFolder } from 'types/Files'

const specialCharacters = /[ `!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/

export const acceptedCommands = {
  /**
  * Lista o conteúdo do diretório em ordem alfabética
  *  @param {IAppState} appState
  * Estado da aplicação com um array que contém o diretório a ser listado
  */
  listar: (appState: IAppState): void => {
    if (!validatePath(appState, appState.arguments[0])) return

    const folderToList = appState.arguments[0] || appState.currentFolder

    const filesArray = fs.readdirSync(folderToList, { withFileTypes: true })
    filesArray.forEach(element => process.env.NODE_ENV !== 'test' && console.log(element.isDirectory() ? '📁 ' : '🗄️ ', element.name))
  },

  /**
  * Lista o conteúdo do diretório em ordem reversa
  * @param {IAppState} appState
  * Estado da aplicação com um array que contém o diretório a ser listado
  */
  listarinv: ({ currentFolder }: IAppState): void => {
    const filesArray = fs.readdirSync(currentFolder, { withFileTypes: true }).reverse()
    filesArray.forEach(element => process.env.NODE_ENV !== 'test' && console.log(element.isDirectory() ? '📁 ' : '🗄️ ', element.name))
  },

  /**
  * Lista todo os diretórios e subdiretórios em formato de árvore
  * @param {IAppState} appState
  * Estado da aplicação com um array que contém o diretório a ser listado
  */
  listartudo: ({ currentFolder }: IAppState): void => {
    const tree = dree.parse(currentFolder, {
      followLinks: true, // Pode não funcionar no Windows
      exclude: /node_modules/
    })
    console.log(tree)
  },

  /**
  * Lista os atributos do arquivo ou diretório
  * @param {IAppState} appState
  * Estado da aplicação com um array que contém o caminho de um diretório ou arquivo a ser listado
  */
  listaratr: (appState: IAppState): void => {
    if (!fs.existsSync(appState.arguments[0])) {
      console.log('Arquivo ou pasta não existe')
      return
    }

    if (!validatePath(appState, appState.arguments[0])) return

    console.log(fs.lstatSync(appState.arguments[0]))
  },
  /**
  * Busca um arquivo ou pasta foi encontrado e seu caminho
  * @param {IAppState} appState
  *  Estado da aplicação com um array que contém o caminho e o arquivo a ser buscado
  */
  buscar: (appState: IAppState): void => {
    const folderToSearch = path.resolve(appState.currentFolder, appState.arguments[1] || './')

    if (!validatePath(appState, folderToSearch)) return

    if (path.basename(folderToSearch) === 'node_modules') return

    const dir = fs.readdirSync(folderToSearch, { withFileTypes: true })

    if (!dir) {
      console.log(`Nenhum diretório chamado "${folderToSearch}" encontrado`)
      return
    }

    if (dir.some(pasta => pasta.name === appState.arguments[0])) {
      console.log('Achado em', path.resolve(folderToSearch, appState.arguments[0]))
      return
    }

    for (let i = 0; i < dir.length; i++) {
      if (dir[i].isDirectory()) {
        acceptedCommands.buscar({ ...appState, arguments: [appState.arguments[0], path.resolve(folderToSearch, dir[i].name)] })
      }
    }

    console.log('Arquivo não encontrado')
  },

  /**
  * Cria um novo arquivo
  * @param {IAppState} appState
  * Estado da aplicação com um array que contém o caminho do arquivo a ser criado e os dados a serem escritos
  */
  carq: (appState: IAppState): void => {
    const filePath = appState.arguments[0]
    const user = appState.user.username

    if (!filePath || !path.extname(filePath)) {
      console.log('Digite o nome de um arquivo válido')
      return
    }
    const baseName = path.basename(filePath)
    if (baseName.length > 14) {
      console.log('Tamanho do nome excede o limite de 14 caracteres')
      return
    }

    if (specialCharacters.test(baseName)) {
      console.log('Proibido caracteres especiais')
      return
    }

    appState.arguments.shift()

    const file = path.basename(filePath)
    const data = appState.arguments.join(' ')

    fs.writeFileSync(path.resolve(appState.currentFolder, file), data)
    const index = tree[user].findIndex((element: IFolder) => path.resolve(element.path) === appState.currentFolder)
    tree[user][index].files.push({
      id: randomUUID(),
      name: file,
      created_at: Date.now(),
      data
    })
    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))
  },

  /**
  * Cria um novo usuário e salva seu diretório no disco
  * @param {IAppState} appState
  * Estado da aplicação contendo o usuário logado e um array com as credenciais do novo usuário
  */
  criarusr: (appState: IAppState): void => {
    if (appState.user.privilegeLevel < 1) {
      console.log('Você não tem permissão para isto')
      return
    }

    const [username, password] = appState.arguments

    if (!username || !password) {
      console.log('Forneça credenciais válidas!')
      return
    }

    if (users.some(element => element.username === username)) {
      console.log('Usuário já existe')
      return
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

    tree[novoUser.username] = [{
      id: randomUUID(),
      name: username,
      created_at: Date.now(),
      path: `home/${username}`,
      files: []
    }]

    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))
  },

  /**
  * Delete um usuário e seu diretório no disco
  * @param {IAppState} appState
  * Estado da aplicação contendo o usuário logado e um array contendo o nome do usuário
  */
  deletarusr: (appState: IAppState): void => {
    if (appState.user.privilegeLevel < 1) {
      console.log('Você não tem permissão para isto')
      return
    }

    const username = appState.arguments[0]

    if (!username) {
      console.log('Forneça o usuário a ser deletado!')
      return
    }

    if (username === 'root') {
      console.log('Não é possível deletar o usuário root')
      return
    }

    if (users.length === 1) { // Se o arquivo contendo os usuários tiver apenas 1, se este for deletado não teremos mais usuário e seria impossível fazer login
      console.log('Você não tem permissão para isto')
      return
    }

    if (!users.some(element => element.username === username) && !fs.existsSync(`home${username}`)) {
      console.log('Usuário não existe')
      return
    }

    const filteredUsers = users.filter(user => user.username !== username)
    delete tree[username]
    fs.writeFileSync('./src/config/users.json', JSON.stringify(filteredUsers, null, 4))
    fs.writeFileSync('./src/config/tree.json', JSON.stringify(tree, null, 4))
    fs.rmdirSync(`./home/${username}`)
  },

  /**
 * Cria uma nova pasta no caminho informado
 * @param {IAppState} appState
 * Estado da aplicação contendo um array com o caminho
  */
  cdir: (appState: IAppState): void => {
    if (!validatePath(appState)) return

    if (specialCharacters.test(appState.arguments[0])) {
      console.log('Proibido caracteres especiais')
      return
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
  },
  /**
 * Deleta a pasta vazia no caminho informado
 * @param {IAppState} appState
 * Estado da aplicação contendo um array com o caminho
  */
  rdir: (appState: IAppState): void => {
    if (!validatePath(appState)) return

    fs.rmdirSync(appState.arguments[0])
  },
  /**
  * Delete a pasta ou arquivo no caminho informado
  * @param {IAppState} appState
  * Estado da aplicação contendo um array com o caminho
  */
  apagar: (appState: IAppState): void => {
    if (!validatePath(appState)) return

    fs.rmSync(appState.arguments[0], { recursive: true })
  },
  /**
  * Delete um usuário e seu diretório no disco
  * @param {IAppState} appState
  * Estado da aplicação contendo o usuário logado e um array contendo o nome do usuário
  */
  copiar: (appState: IAppState): void => {
    if (!validatePath(appState, appState.arguments[0]) || validatePath(appState, appState.arguments[1])) return

    fs.copyFileSync(appState.arguments[0], appState.arguments[1])
  },
  /**
  * Muda o caminho atual
  * @param {IAppState} appState
  * Estado da aplicação um array com o nome do novo caminho
  */
  mudar: (appState: IAppState): void => {
    if (!validatePath(appState)) return

    const resolvedNewPath = path.resolve(appState.currentFolder, appState.arguments[0])

    if (fs.lstatSync(resolvedNewPath).isFile()) {
      console.log('O caminho provido não é um diretório')
      return
    }

    appState.currentFolder = resolvedNewPath
  },

  /**
  * Renomeia o arquivo ou pasta no caminho indicado
  * @param {IAppState} appState
  * Estado da aplicação contendo um array com o caminho
  */
  renomear: ({ arguments: [oldName, newName] }: IAppState): void => {
    fs.renameSync(oldName, newName)
  },
  /**
  * Lista o caminho atual
  * @param {IAppState} appState
  * Estado da aplicação
  */
  atual: ({ currentFolder }: IAppState): void => {
    console.log(currentFolder)
  },
  clear: console.clear,
  alterarusr: handleLogin,
  sair: handleAuthentication
}
