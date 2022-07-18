import path from 'path'
import fs from 'fs'
import { IState } from 'types/Aplication'

export function validatePath (state: IState, dir = state.arguments[0] || './'): boolean {
  const userRootDir = path.resolve('home', state.user.username)
  const newPath = path.resolve(state.currentFolder, dir)

  const pathRootDir = newPath.slice(0, userRootDir.length)

  if (state.user.privilegeLevel > 0) {
    const homeDir = path.resolve('home')
    const newPathIsAtHomeDir = newPath.slice(0, homeDir.length)

    if (newPathIsAtHomeDir !== homeDir) {
      console.log('Somente o diretório home está disponível')
      return false
    }

    return true
  }

  if (pathRootDir !== userRootDir) {
    console.log('Você tem acesso somente a sua pasta')
    return false
  }

  if (state.command === 'carq' && fs.existsSync(path.dirname(newPath))) {
    return true
  }

  if (state.command !== 'cdir' && !fs.existsSync(newPath)) {
    console.log('Caminho não existe')
    return false
  }

  return true
}
