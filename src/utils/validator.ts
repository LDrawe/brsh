import path from 'path'
import fs from 'fs'
import { IAppState } from 'types/AppState'

export function validatePath (appState: IAppState, dir = appState.arguments[0] || './'): boolean {
  const rootDir = path.resolve('home', appState.user.username)
  const resolvedNewPath = path.resolve(appState.currentFolder, dir)

  if (resolvedNewPath.slice(0, rootDir.length) !== rootDir) {
    console.log('Você tem acesso somente a sua pasta')
    return false
  }

  if (appState.command !== 'cdir' && !fs.existsSync(resolvedNewPath)) {
    console.log('Caminho não existe')
    return false
  }

  return true
}
