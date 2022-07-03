import { prompt } from '@utils/prompt'
import users from '@config/users.json'
import { IUser } from 'types/User'
import { IAppState } from 'types/AppState'

function handleLogin (appState:IAppState): IUser | null {
  const loggedUser = users.find(user => user.username === appState.commands[0] && user.password === appState.commands[1]) || null

  if (loggedUser) {
    appState.user = loggedUser
  }

  return loggedUser
}

function getUserCredentials () {
  const username = prompt('Usuário: ')
  const password = prompt('Senha: ')

  return {
    username,
    password
  }
}

function handleAuthentication (appState?:IAppState): IUser {
  let user: IUser | null

  do {
    const { username, password } = getUserCredentials()

    user = handleLogin({ commands: [username, password] })
    // user = handleLogin({ commands: ['eduardo', 'senha'] })

    if (!user) {
      console.log('Usuário ou senha incorretos')
    }
  } while (!user)

  if (appState) {
    appState.user = user
  }

  return user
}

export { handleAuthentication, handleLogin, getUserCredentials }
