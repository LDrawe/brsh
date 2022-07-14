import path from 'path'
import fs from 'fs'
import { IState } from 'types/Aplication'

export function validatePath (state: IState, dir = state.arguments[0] || './'): boolean {
  const rootDir = path.resolve('home', state.user.username)
  const resolvedNewPath = path.resolve(state.currentFolder, dir)

  if (resolvedNewPath.slice(0, rootDir.length) !== rootDir) {
    console.log('Você tem acesso somente a sua pasta')
    return false
  }

  if (state.command === 'carq' && fs.existsSync(path.dirname(resolvedNewPath))) {
    return true
  }

  if (state.command !== 'cdir' && !fs.existsSync(resolvedNewPath)) {
    console.log('Caminho não existe')
    return false
  }

  return true
}
