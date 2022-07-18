import path from 'path'
import fs from 'fs'
import { acceptedCommands } from '@lib/commands'
import { consultUser } from '@lib/authentication'
import { boot } from '@lib/boot'
import { IState } from 'types/Aplication'

const state: IState = {
  command: '',
  arguments: [],
  currentFolder: path.resolve('home', 'eduardo'),
  user: null
}

beforeAll(() => {
  boot()
  state.user = consultUser({ ...state, arguments: ['eduardo', 'senha'] })
})

describe('Listing commands', () => {
  it('should be able list directory', () => {
    const code = acceptedCommands.listar(state)
    expect(code).toBe(0)
  })

  it('should be able list directory and subdirectories', () => {
    const code = acceptedCommands.listartudo(state)
    expect(code).toBe(0)
  })

  it('should be able list directory in reverse', () => {
    const code = acceptedCommands.listarinv(state)
    expect(code).toBe(0)
  })

  it('should be able list directory properties', () => {
    const code = acceptedCommands.listaratr(state)
    expect(code).toBe(0)
  })
})

describe('File commands', () => {
  it('should be able to create file', () => {
    const code = acceptedCommands.carq({ ...state, command: 'carq', arguments: ['index.js'] })
    const doesFileExists = fs.existsSync(path.resolve(state.currentFolder, 'index.js'))
    expect(code).toBe(0)
    expect(doesFileExists).toBe(true)
  })
  it('should be able to delete file', () => {
    const code = acceptedCommands.apagar({ ...state, command: 'apagar', arguments: ['index.js'] })
    const doesFileExists = fs.existsSync(path.resolve(state.currentFolder, 'index.js'))
    expect(code).toBe(0)
    expect(doesFileExists).toBe(false)
  })
})

describe('Failing at executing admin commands', () => {
  it('should be able to fail at creating user', () => {
    const code = acceptedCommands.criarusr({ ...state, arguments: ['rodrigo', 'faro'] })
    expect(code).toBe(1)
  })
  it('should be able to fail at deleting user', () => {
    const code = acceptedCommands.deletarusr({ ...state, arguments: ['rodrigo'] })
    expect(code).toBe(1)
  })
})

describe('Sucess at executing admin commands', () => {
  const user = consultUser({ ...state, arguments: ['root', 'root'] })
  it('should be able to fail at creating user', () => {
    const code = acceptedCommands.criarusr({ ...state, user, arguments: ['rodrigo-faro', 'elegosta'] })
    expect(code).toBe(0)
  })
  it('should be able to fail at deleting user', () => {
    const code = acceptedCommands.deletarusr({ ...state, user, arguments: ['rodrigo-faro'] })
    expect(code).toBe(0)
  })
})
