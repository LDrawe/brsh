import path from 'path'
import { boot } from '@lib/boot'
import { acceptedCommands } from '@lib/commands'
import { zsh } from '@utils/prompt'
import { IAppState } from 'types/AppState'

console.clear()
boot()

let cli = ''
const state: IAppState = {
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
    executeCommand?.(state)
  } catch (error) {
    console.log(error.message)
  }
} while (cli !== 'quit')
