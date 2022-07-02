import fs from 'fs'
import color from 'cli-color'

import { loginScreen } from '@lib/authentication'

import { prompt } from '@utils/prompt'
import { changeUser, criarUser } from '@utils/admin'
import { listar, listaratr, listartudo } from '@utils/ls'
import { buscar, criarArquivo, mudar } from '@utils/fileSystem'
import { IUser } from '../types/User'

let currentDir = process.cwd()

function interpretateCommand (cli = '', user: IUser) {
  const commands = cli.split(' ')

  try {
    switch (commands[0].toLowerCase()) {
      case 'criarusr':// Comandos de admin
        criarUser(commands, user)
        break
      case 'alterarusr':// Comandos de admin
        user = changeUser(commands[1], commands[2]) || user
        break
      case 'listar': // Comandos para listar
        listar(commands[1])
        break
      case 'listarinv':
        listar(commands[1], true)
        break
      case 'listaratr':
        console.log(listaratr(commands[1]))
        break
      case 'listartudo':
        listartudo()
        break // =================================
      case 'cdir':
        fs.mkdirSync(commands[1], { recursive: true })
        break
      case 'rdir':
        fs.rmdirSync(commands[1])
        break
      case 'remove':
        fs.rmSync(commands[1], { recursive: true })
        break
      case 'copiar':
        fs.copyFileSync(commands[1], commands[2])
        break
      case 'carq':
        criarArquivo(commands)
        // fs.appendFileSync(file, `${commands.toString().replaceAll(',', " ")}`);
        break
      case 'buscar':
        buscar(commands[1], commands[2])
        break
      case 'mudar':
        currentDir = mudar(currentDir, commands[1])
        break
      case 'renomear':
        fs.renameSync(commands[1], commands[2])
        break
      case 'atual':
        console.log(process.cwd())
        break
      case 'clear':
        console.clear()
        break
      case 'sair':
        loginScreen()
        break
    }
  } catch (error: any) {
    console.log(error.message)
  }
}

function terminal (user: IUser) {
  let cli = ''

  do {
    cli = prompt('💻 ' + color.red(color.bold(user.username)) + ' ' + color.cyan('in') + ' ' + currentDir + color.yellow(' > '))
    interpretateCommand(cli, user)
  } while (cli.toLowerCase() !== 'quit')
};

export { terminal, interpretateCommand }
