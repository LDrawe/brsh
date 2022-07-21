import path from 'path'
import { compareSync } from 'bcryptjs'
import { prompt } from '@utils/prompt'
import { IState, IUser } from 'types/Aplication'

import users from '@config/users.json'

function consultUser (appState: IState): IUser| null {
  const matchedUser = users.find(user =>
    user.username === appState.arguments[0] && compareSync(appState.arguments[1], user.password)
  )

  if (!matchedUser) {
    return null
  }

  const { password, ...user } = matchedUser

  appState.user = user
  appState.currentFolder = path.resolve('home', user.username)

  return user
}

function handleAuthentication (appState: IState): IUser {
  let user: IUser | null
  console.clear()

  do {
    const username = prompt('Usuário: ')
    const password = prompt('Senha: ', { echo: '*' })

    user = consultUser({ ...appState, arguments: [username, password] })
    // user = consultUser({ ...appState, arguments: ['eduardo', '123456'] })

    if (!user) {
      console.log('Usuário ou senha incorretos')
    }
  } while (!user)

  appState.user = user
  appState.currentFolder = path.resolve('home', appState.user.username)
  console.clear()

  return user
}

export { handleAuthentication, consultUser }
