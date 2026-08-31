import path from 'node:path'
import clc from 'cli-color'
import { boot } from '@core/boot'
import { acceptedCommands } from '@cli/commands'
import { zsh } from '@cli/prompt'
import { TerminalContext } from 'types/Aplication'
import { VFSError } from '@core/vfs/errors'

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
      console.log(clc.yellow('Comando não reconhecido. Digite "help" para obter uma lista.'))

  } catch (error) {
    if (error instanceof VFSError) {
      console.log(clc.redBright(`ERRO VFS: ${error.message}`))
    } else if (error instanceof Error) {
      console.log(clc.red(error.message))
    } else {
      console.log(clc.red(String(error)))
    }
  }

} while (state.command !== 'quit')