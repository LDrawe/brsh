import PromptSync from 'prompt-sync'
import color from 'cli-color'
import { handleAuthentication, handleLogin } from '@lib/authentication'
import {
  listar,
  listarinv,
  listaratr,
  listartudo,
  criarusr,
  deletarusr,
  buscar,
  carq,
  atual,
  renomear,
  mudar,
  cdir,
  copiar,
  rdir,
  apagar
} from '@lib/commands'

const prompt = PromptSync()
const zsh = (username: string) => prompt(`💻 ${color.red(color.bold(username))} ${color.cyan('in')} ${color.magenta(process.cwd())} ${color.yellow('> ')}`)

const acceptedCommands = {
  listar,
  listarinv,
  listaratr,
  listartudo,
  buscar,
  carq,
  atual,
  renomear,
  mudar,
  cdir,
  copiar,
  criarusr,
  deletarusr,
  rdir,
  apagar,
  clear: console.clear,
  alterarusr: handleLogin,
  sair: handleAuthentication
}

export { acceptedCommands, zsh, prompt }
