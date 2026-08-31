import path from 'node:path'
import fs from 'node:fs'
import { TerminalContext, IUser } from 'types/Aplication'
import { handleAuthentication } from '@core/auth/authentication'
import { vfs } from '@core/vfs/vfs'
import { VFSError } from '@core/vfs/errors'
import usersData from '@config/users.json'

const users = usersData as unknown as IUser[]
const usersConfigPath = path.resolve('src', 'config', 'users.json')

export const authCommands = {
  sair: (state: TerminalContext) => handleAuthentication(state),
  
  alterarusr: (state: TerminalContext): number => {
    handleAuthentication(state)
    return 0
  },

  deletarusr: (state: TerminalContext): number => {
    if (state.user!.privilegeLevel < 1) throw new VFSError('Privilégios insuficientes.')

    const username = state.arguments[0]
    if (!username || username === 'root' || users.length === 1) {
      throw new VFSError('Não é possível remover este usuário.')
    }

    const targetHome = path.resolve('home', username)
    const filteredUsers = users.filter(user => user.username !== username)

    const tree = vfs.getTree()
    delete tree[username]

    fs.writeFileSync(usersConfigPath, JSON.stringify(filteredUsers, null, 4))
    vfs.save()

    if (fs.existsSync(targetHome)) fs.rmSync(targetHome, { recursive: true, force: true })

    console.log(`Usuário ${username} removido.`)
    return 0
  }
}
