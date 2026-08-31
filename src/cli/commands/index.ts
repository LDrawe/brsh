import { TerminalContext } from 'types/Aplication'
import { authCommands } from './auth'
import { systemCommands } from './system'
import { directoryCommands } from './directory'
import { fileCommands } from './file'

export const acceptedCommands: Record<string, (state: TerminalContext) => any> = {
  ...authCommands,
  ...systemCommands,
  ...directoryCommands,
  ...fileCommands
}
