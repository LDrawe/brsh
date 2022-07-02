import fs from 'fs'
import { randomUUID } from 'crypto'
import users from '@config/users.json'
import { IUser } from '../types/User'

/**
 * Cria um novo usuário e salva seu diretório no disco
 * @param {string[]} commands
 * Array de de string que representa os comandos a serem executados
 * @param {IUser} user
 * Referência do usuário logado para checar permissões
 */
function criarUser (commands: string[], user: IUser) {
  if (user.privilegeLevel < 1) {
    console.log('Você não tem permissão para isto')
    return 1
  }

  const novoUser: IUser = {
    id: randomUUID(),
    username: commands[1],
    password: commands[2],
    privilegeLevel: 0
  }

  users.push(novoUser)
  fs.writeFileSync('./src/config/users.json', JSON.stringify(users))
  fs.mkdirSync(`./home/${commands[1]}`, { recursive: true })
  return 0
}

function changeUser (user: string, password: string) {
  const autenticatedUser = users.find((element: IUser) => element.username === user && element.password === password)

  if (!autenticatedUser) return null

  return autenticatedUser
}

export { criarUser, changeUser }
