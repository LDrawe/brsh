import { prompt } from '@utils/prompt'
import { terminal } from '@lib/terminal'
import users from '@config/users.json'
import { IUser } from '../types/User'

function handleLogin (username: string, password: string): IUser | null {
  for (let i = 0; i < users.length; i++) {
    if (users[i].username === username && users[i].password === password) return users[i]
  }
  return null
}

function authenticateUser () {
  const username = prompt('Usuário: ')
  const password = prompt('Senha: ')

  return {
    username,
    password
  }
}

function loginScreen () {
  let user = null
  let isUserLogged = false

  while (!isUserLogged) {
    // const { username, password } = authenticateUser();

    // login = handleLogin(username, password);
    user = handleLogin('eduardo', 'senha')
    isUserLogged = Boolean(user)

    if (user) {
      console.clear()
      terminal(user)
    } else {
      console.log('Usuário ou senha incorretos')
    }
  }
}

export { loginScreen, handleLogin, authenticateUser }
