import path from 'node:path'
import { boot } from '@core/boot'
import { acceptedCommands } from '@cli/commands'
import { zsh } from '@cli/prompt'
import { TerminalContext } from 'types/Aplication'

boot()

let cli: string | null = ''

const state: TerminalContext = {
  command: '',
  arguments: [],
  currentFolder: path.resolve('home'),
  user: null
}

state.user = acceptedCommands.sair(state)

do {

  cli = zsh(state.user!.username, state.currentFolder)

  if (cli === null) process.exit(0)

  state.arguments = cli.trim().split(' ')
  state.command = state.arguments.shift()?.toLowerCase() || ''

  if (!state.command) continue

  try {

    const executeCommand = acceptedCommands[state.command]

    if (executeCommand)
      executeCommand(state)
    else 
      console.log('Comando não reconhecido. Digite "help" para obter uma lista.')

  } catch (error) {
    if (error instanceof Error) console.log(error.message)
    else console.log(String(error))
  }

} while (state.command !== 'quit')