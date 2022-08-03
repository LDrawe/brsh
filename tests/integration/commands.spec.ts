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
  user: {
    id: 'd8c7ad9a-6bd8-457e-8762-878d7488aeb3',
    username: 'eduardo',
    privilegeLevel: 0
  }
}

beforeAll(() => {
  boot()
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

  it('should be able to print current path', () => {
    const code = acceptedCommands.atual(state)
    expect(code).toBe(0)
  })

  it('should be able list avaiable commands', () => {
    const code = acceptedCommands.help(state)
    expect(code).toBe(0)
  })
})

describe('Directory commands', () => {
  it('Should be able to create a directory', () => {
    const code = acceptedCommands.cdir({ ...state, command: 'cdir', arguments: ['teste'] })
    expect(code).toBe(0)
  })

  it('Should fail to create a directory', () => {
    const code = acceptedCommands.cdir({ ...state, command: 'cdir', arguments: [] })
    const code2 = acceptedCommands.cdir({ ...state, command: 'cdir', arguments: ['teste./*`'] })
    const code3 = acceptedCommands.cdir({ ...state, command: 'cdir', arguments: ['teste'] })
    expect(code).toBe(1)
    expect(code2).toBe(1)
    expect(code3).toBe(1)
  })

  it('Should fail to delete an empty directory', () => {
    acceptedCommands.carq({ ...state, command: 'carq', arguments: ['teste/index.js'] })
    const code = acceptedCommands.rdir({ ...state, arguments: ['teste'] })
    const code2 = acceptedCommands.rdir({ ...state, arguments: ['./'] })
    expect(code).toBe(1)
    expect(code2).toBe(1)
  })

  it('Should be able to delete an empty directory', () => {
    acceptedCommands.apagar({ ...state, command: 'apagar', arguments: ['teste/index.js'] })
    const code = acceptedCommands.rdir({ ...state, arguments: ['teste'] })
    expect(code).toBe(0)
  })

  it('Should fail to change path', () => {
    const code = acceptedCommands.mudar({ ...state, arguments: ['../root'] })
    expect(code).toBe(1)
  })

  it('Should be able to change path', () => {
    const user = consultUser({ ...state, arguments: ['root', 'root'] })
    const code1 = acceptedCommands.mudar({ ...state, user, arguments: ['../eduardo'] })
    const code2 = acceptedCommands.mudar({ ...state, user, arguments: ['../root'] })
    expect(code1).toBe(0)
    expect(code2).toBe(0)
  })
})

describe('File commands', () => {
  it('should be able to create file', () => {
    const code = acceptedCommands.carq({ ...state, command: 'carq', arguments: ['index.js'] })
    const doesFileExists = fs.existsSync(path.resolve(state.currentFolder, 'index.js'))
    expect(code).toBe(0)
    expect(doesFileExists).toBe(true)
  })

  it('should fail to create file', () => {
    const code1 = acceptedCommands.carq({ ...state, command: 'carq', arguments: [] })
    const code2 = acceptedCommands.carq({ ...state, command: 'carq', arguments: ['index'] })
    const code3 = acceptedCommands.carq({ ...state, command: 'carq', arguments: ['habfhjakbfhjavbfkguavwbawkhjabfa.js'] })
    const code4 = acceptedCommands.carq({ ...state, command: 'carq', arguments: ['%&*./.js'] })
    const code5 = acceptedCommands.carq({ ...state, command: 'carq', arguments: ['index.js'] })

    expect(code1).toBe(1)
    expect(code2).toBe(1)
    expect(code3).toBe(1)
    expect(code4).toBe(1)
    expect(code5).toBe(1)
  })

  it('should fail to copy file', () => {
    const code = acceptedCommands.copiar({ ...state, command: 'copiar', arguments: [] })
    expect(code).toBe(1)
  })

  it('should be able to copy file', () => {
    acceptedCommands.cdir({ ...state, command: 'cdir', arguments: ['trabalhos'] })
    const code = acceptedCommands.copiar({ ...state, command: 'copiar', arguments: ['index.js', 'trabalhos'] })
    const doesFileExists = fs.existsSync(path.resolve(state.currentFolder, 'trabalhos', 'index.js'))
    expect(code).toBe(0)
    expect(doesFileExists).toBe(true)
  })

  it('should fail to move file', () => {
    const code = acceptedCommands.mover({ ...state, command: 'mover', arguments: ['trabalhos/index.js'] })
    expect(code).toBe(1)
  })

  it('should be able to move file', () => {
    acceptedCommands.apagar({ ...state, command: 'apagar', arguments: ['index.js'] })
    const code = acceptedCommands.mover({ ...state, command: 'mover', arguments: ['trabalhos/index.js', './'] })
    const doesFileExists = fs.existsSync(path.resolve(state.currentFolder, 'index.js'))
    const code2 = acceptedCommands.rdir({ ...state, command: 'rdir', arguments: ['trabalhos'] })

    expect(code).toBe(0)
    expect(code2).toBe(0)
    expect(doesFileExists).toBe(true)
  })

  it('should be able to search the file', () => {
    const code = acceptedCommands.buscar({ ...state, command: 'buscar', arguments: ['index.js'] })
    expect(code).toBe(0)
  })

  it('should be able to delete file', () => {
    const code = acceptedCommands.apagar({ ...state, command: 'apagar', arguments: ['index.js'] })
    const doesFileExists = fs.existsSync(path.resolve(state.currentFolder, 'index.js'))
    expect(code).toBe(0)
    expect(doesFileExists).toBe(false)
  })
})

describe('Admin commands', () => {
  describe('Failing at executing admin commands', () => {
    it('should fail to create an user', () => {
      const code = acceptedCommands.criarusr({ ...state, arguments: ['rodrigo', 'faro'] })
      expect(code).toBe(1)
    })
    it('should fail to delete an user', () => {
      const code = acceptedCommands.deletarusr({ ...state, arguments: ['rodrigo'] })
      expect(code).toBe(1)
    })
  })

  describe('Sucess at executing admin commands', () => {
    const user = consultUser({ ...state, arguments: ['root', 'root'] })
    it('should be able to create a user', () => {
      const code = acceptedCommands.criarusr({ ...state, user, arguments: ['rodrigo-faro', 'elegosta'] })
      expect(code).toBe(0)
    })
    it('should be able to delete a user', () => {
      const code = acceptedCommands.deletarusr({ ...state, user, arguments: ['rodrigo-faro'] })
      expect(code).toBe(0)
    })
  })
})
