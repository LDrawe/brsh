import path from 'node:path'
import { compareSync } from 'bcryptjs'
import { prompt } from '../../cli/prompt'
import { TerminalContext, IUser } from 'types/Aplication'

import usersData from '@config/users.json'

interface IUserAuth extends IUser {
  password: string;
}

// Forced cast bypasses incorrect JSON inference if local files get corrupted during dev
const users = usersData as unknown as IUserAuth[]

function consultUser (appState: TerminalContext): IUser | null {

  const [providedUsername, providedPassword] = appState.arguments

  const matchedUser = users.find(u => u.username === providedUsername && compareSync(providedPassword, u.password))

  if (!matchedUser) return null

  // Memory safety: strip password hash before loading user into the session context
  const { password, ...userSession } = matchedUser

  appState.user = userSession
  appState.currentFolder = path.resolve('home', userSession.username)

  return userSession

}

function handleAuthentication (appState: TerminalContext): IUser {

  let user: IUser | null = null
  
  console.clear()

  do {

    const username = prompt('Usuário: ')

    // Graceful exit on EOF (Ctrl+D) to prevent infinite loops with null inputs
    if (username === null) process.exit(0)

    const password = prompt('Senha: ', { echo: '*' })

    if (password === null) process.exit(0)

    user = consultUser({ ...appState, arguments: [username, password] })

    if (!user) console.log('Usuário ou senha incorretos')
    
  } while (!user)

  appState.user = user
  appState.currentFolder = path.resolve('home', appState.user.username)
  
  console.clear()

  return user

}

export { handleAuthentication, consultUser }