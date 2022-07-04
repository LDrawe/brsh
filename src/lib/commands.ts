import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import dree from 'dree'
import users from '@config/users.json'
import { IUser } from 'types/User'
import { IAppState } from 'types/AppState'
import { handleAuthentication, handleLogin } from '@lib/authentication'

/**
  * Lista o conteúdo do diretório em ordem alfabética
  * @param {string} folder
  * Array de comandos
*/
function listar ({ commands: [path = './'] }: IAppState):void {
  const filesArray = fs.readdirSync(path, { withFileTypes: true })
  filesArray.forEach(element => process.env.NODE_ENV !== 'test' && console.log(element.isDirectory() ? '📁 ' : '🗄️ ', element.name))
}

/**
  * Lista o conteúdo do diretório em ordem reversa
  * @param {IAppState} appState
  * Estado da aplicação com um array que contém o diretório a ser listado
*/
function listarinv ({ commands: [path = './'] }: IAppState):void {
  const filesArray = fs.readdirSync(path, { withFileTypes: true }).reverse()
  filesArray.forEach(element => process.env.NODE_ENV !== 'test' && console.log(element.isDirectory() ? '📁 ' : '🗄️ ', element.name))
}

/**
  * Lista todo os diretórios e subdiretórios em formato de árvore
  * @param {IAppState} appState
  * Estado da aplicação com um array que contém o diretório a ser listado
*/
function listartudo ({ commands: [path = './'] }: IAppState):void {
  const tree = dree.parse(path, {
    followLinks: true, // Pode não funcionar no Windows
    exclude: /node_modules/
  })
  console.log(tree)
}

/**
  * Lista os atributos do arquivo ou diretório
  * @param {IAppState} appState
  * Estado da aplicação com um array que contém o caminho de um diretório ou arquivo a ser listado
*/
function listaratr ({ commands: [path = './'] }: IAppState):void {
  console.log(fs.lstatSync(path))
}

/**
  * Busca um arquivo ou pasta foi encontrado e seu caminho
  * @param {IAppState} appState
  *  Estado da aplicação com um array que contém o caminho e o arquivo a ser buscado
*/
function buscar ({ commands: [arquivo, pathToSearch = './'] }: IAppState):void {
  if (path.basename(pathToSearch) === 'node_modules') return

  const dir = fs.readdirSync(pathToSearch, { withFileTypes: true })

  if (!dir) {
    console.log(`Nenhum diretório chamado "${pathToSearch}" encontrado`)
    return
  }

  if (dir.some(pasta => pasta.name === arquivo)) {
    console.log('Achado em', path.resolve(pathToSearch, arquivo))
    return
  }

  for (let i = 0; i < dir.length; i++) {
    if (dir[i].isDirectory()) {
      buscar({ commands: [arquivo, path.resolve(pathToSearch, dir[i].name)] })
    }
  };
};

/**
  * Cria um novo arquivo
  * @param {IAppState} appState
  * Estado da aplicação com um array que contém o caminho do arquivo a ser criado e os dados a serem escritos
*/
function carq ({ commands }: IAppState):void {
  const file = commands[0]

  if (!file || !path.extname(file)) {
    console.log('Digite o nome de um arquivo válido')
    return
  }

  if (path.basename(file).length > 14) {
    console.log('Tamanho do nome excede o limite de 14 caracteres')
    return
  }

  commands.shift()
  fs.writeFileSync(file, commands.join(' '))
}

/**
  * Cria um novo usuário e salva seu diretório no disco
  * @param {IAppState} appState
  * Estado da aplicação contendo o usuário logado e um array com as credenciais do novo usuário
*/
function criarusr (appState: IAppState):void {
  if (appState.user.privilegeLevel < 1) {
    console.log('Você não tem permissão para isto')
    return
  }

  if (!appState.commands[0] || !appState.commands[1]) {
    console.log('Forneça credenciais válidas!')
    return
  }

  if (users.some(element => element.username === appState.commands[0])) {
    console.log('Usuário já existe')
    return
  }

  const novoUser: IUser = {
    id: randomUUID(),
    username: appState.commands[0],
    password: appState.commands[1],
    privilegeLevel: 0
  }

  users.push(novoUser)
  fs.writeFileSync('./src/config/users.json', JSON.stringify(users))
  fs.mkdirSync(`./home/${appState.commands[0]}`, { recursive: true })
}

/**
  * Delete um usuário e seu diretório no disco
  * @param {IAppState} appState
  * Estado da aplicação contendo o usuário logado e um array contendo o nome do usuário
*/
function deletarusr (appState: IAppState):void {
  if (appState.user.privilegeLevel < 1) {
    console.log('Você não tem permissão para isto')
    return
  }

  if (!appState.commands[0]) {
    console.log('Forneça o usuário a ser deletado!')
    return
  }

  if (users.length === 1) {
    console.log('Você não tem permissão para isto')
    return
  }

  if (appState.commands[0] === 'root') {
    console.log('Não é possível deletar o usuário root')
    return
  }

  if (!users.some(element => element.username === appState.commands[0]) && !fs.existsSync(`home${appState.commands[0]}`)) {
    console.log('Usuário não existe')
    return
  }

  const filteredUsers = users.filter(user => user.username !== appState.commands[0])
  fs.writeFileSync('./src/config/users.json', JSON.stringify(filteredUsers))
  fs.rmdirSync(`./home/${appState.commands[0]}`)
}

/**
 * Cria uma nova pasta no caminho informado
 * @param {IAppState} appState
 * Estado da aplicação contendo um array com o caminho
*/
function cdir ({ commands: [path] }: IAppState):void {
  fs.mkdirSync(path, { recursive: true })
}

/**
 * Delete a pasta vazia no caminho informado
 * @param {IAppState} appState
 * Estado da aplicação contendo um array com o caminho
*/
function rdir ({ commands: [path] }: IAppState):void {
  fs.rmdirSync(path)
}

/**
  * Delete a pasta ou arquivo no caminho informado
  * @param {IAppState} appState
  * Estado da aplicação contendo um array com o caminho
*/
function apagar ({ commands: [path] }: IAppState):void {
  fs.rmSync(path, { recursive: true })
}

/**
  * Delete um usuário e seu diretório no disco
  * @param {IAppState} appState
  * Estado da aplicação contendo o usuário logado e um array contendo o nome do usuário
*/
function copiar ({ commands: [origin, destination] }: IAppState):void {
  fs.copyFileSync(origin, destination)
}

/**
  * Muda o caminho atual
  * @param {IAppState} appState
  * Estado da aplicação um array com o nome do novo caminho
*/
function mudar ({ commands: [path] }: IAppState):void {
  process.chdir(path)
}

/**
  * Renomeia o arquivo ou pasta no caminho indicado
  * @param {IAppState} appState
  * Estado da aplicação contendo um array com o caminho
*/
function renomear ({ commands: [oldName, newName] }: IAppState):void {
  fs.renameSync(oldName, newName)
}

/**
  * Lista o caminho atual
  * @param {IAppState} appState
  * Estado da aplicação
*/
function atual (appState: IAppState):void {
  console.log(process.cwd())
}

export const acceptedCommands = {
  listar,
  listarinv,
  listaratr,
  listartudo,
  buscar,
  carq,
  atual,
  renomear,
  mudar,
  cdir,
  copiar,
  criarusr,
  deletarusr,
  rdir,
  apagar,
  clear: console.clear,
  alterarusr: handleLogin,
  sair: handleAuthentication
}
