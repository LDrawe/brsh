import path from 'path'
import { boot } from '@lib/boot'
import { acceptedCommands } from '@lib/commands'
import { zsh } from '@utils/prompt'
import { IState } from 'types/Aplication'

boot()

let cli = ''
const state: IState = {
  command: '',
  arguments: [],
  currentFolder: path.resolve('home'),
  user: null
}

state.user = acceptedCommands.sair(state)

do {
  cli = zsh(state.user.username, state.currentFolder)

  if (cli == null) process.exit()

  state.arguments = cli.trim().split(' ')

  state.command = state.arguments.shift() // Pega qual foi a primeira string digitada pelo usuário (que é o comando a ser executado)
  try {
    const executeCommand = acceptedCommands[state.command]
    if (executeCommand) {
      executeCommand(state)
    } else {
      console.log('Comando não reconhecido. Digite "help" para obter uma lista dos comandos disponíveis')
    }
  } catch (error) {
    console.log(error.message || error)
  }
} while (cli !== 'quit')
