import { boot } from '@lib/boot'
import { acceptedCommands, zsh } from '@utils/prompt'
import { IUser } from 'types/User'

console.clear()
boot()

function main ():void {
  let cli = ''
  const user: IUser = acceptedCommands.sair()

  const state = {
    commands: [],
    user
  }

  do {
    cli = zsh(state.user.username)

    if (cli == null) process.exit()

    state.commands = cli.trim().split(' ')

    const command = state.commands.shift() // Pega qual foi a primeira string digitada pelo usuário (que é o comando a ser executado)

    try {
      const executeCommand = acceptedCommands[command]
      executeCommand?.(state)
    } catch (error) {
      console.log(error.message)
    }
  } while (cli !== 'quit')
}

main()
