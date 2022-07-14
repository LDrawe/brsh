import path from 'path'
import { compareSync } from 'bcryptjs'
import { prompt } from '@utils/prompt'
import { IState, IUser } from 'types/Aplication'

import users from '@config/users.json'

function handleLogin (appState: IState): IUser | null {
  const loggedUser = users.find(user =>
    user.username === appState.arguments[0] && compareSync(appState.arguments[1], user.password)
  ) || null

  if (loggedUser) {
    appState.user = loggedUser
    appState.currentFolder = path.resolve('home', loggedUser.username)
  }

  return loggedUser
}

function getUserCredentials () {
  const username = prompt('Usuário: ')
  const password = prompt('Senha: ', { echo: '*' })

  return {
    username,
    password
  }
}

function handleAuthentication (appState?: IState): IUser {
  let user: IUser | null
  console.clear()

  do {
    const { username, password } = getUserCredentials()

    user = handleLogin({ ...appState, arguments: [username, password] })
    // user = handleLogin({ ...appState, arguments: ['eduardo', 'senha'] })

    if (!user) {
      console.log('Usuário ou senha incorretos')
    }
  } while (!user)

  if (appState) {
    appState.user = user
    appState.currentFolder = path.resolve('home', appState.user.username)
  }

  return user
}

export { handleAuthentication, handleLogin, getUserCredentials }
