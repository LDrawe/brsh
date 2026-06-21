import path from 'node:path'
import fs from 'node:fs'
import { describe, it, before } from 'node:test'
import assert from 'node:assert'
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

describe('Listing commands', () => {
  before(() => {
    boot()
  })

  it('should be able list directory', () => {
    const code = acceptedCommands.listar(state)
    assert.strictEqual(code, 0)
  })

  it('should be able list directory and subdirectories', () => {
    const code = acceptedCommands.listartudo(state)
    assert.strictEqual(code, 0)
  })

  it('should be able list directory in reverse', () => {
    const code = acceptedCommands.listarinv(state)
    assert.strictEqual(code, 0)
  })

  it('should be able list directory properties', () => {
    const code = acceptedCommands.listaratr(state)
    assert.strictEqual(code, 0)
  })

  it('should be able to print current path', () => {
    const code = acceptedCommands.atual(state)
    assert.strictEqual(code, 0)
  })

  it('should be able list avaiable commands', () => {
    const code = acceptedCommands.help(state)
    assert.strictEqual(code, 0)
  })
})

describe('Directory commands', () => {
  it('Should be able to create a directory', () => {
    const code = acceptedCommands.cdir({ ...state, command: 'cdir', arguments: ['teste'] })
    assert.strictEqual(code, 0)
  })

  it('Should fail to create a directory', () => {
    const code = acceptedCommands.cdir({ ...state, command: 'cdir', arguments: [] })
    const code2 = acceptedCommands.cdir({ ...state, command: 'cdir', arguments: ['teste./*`'] })
    const code3 = acceptedCommands.cdir({ ...state, command: 'cdir', arguments: ['teste'] })

    assert.strictEqual(code, 1)
    
    assert.strictEqual(code2, 1)
    
    assert.strictEqual(code3, 1)
  })

  it('Should fail to delete an empty directory', () => {
    acceptedCommands.carq({ ...state, command: 'carq', arguments: ['teste/index.js'] })
    const code = acceptedCommands.rdir({ ...state, arguments: ['teste'] })
    const code2 = acceptedCommands.rdir({ ...state, arguments: ['./'] })

    assert.strictEqual(code, 1)
    
    assert.strictEqual(code2, 1)
  })

  it('Should be able to delete an empty directory', () => {
    acceptedCommands.apagar({ ...state, command: 'apagar', arguments: ['teste/index.js'] })
    const code = acceptedCommands.rdir({ ...state, arguments: ['teste'] })
    assert.strictEqual(code, 0)
  })

  it('Should fail to change path', () => {
    const code = acceptedCommands.mudar({ ...state, arguments: ['../root'] })
    assert.strictEqual(code, 1)
  })

  it('Should be able to change path', () => {
    const user = consultUser({ ...state, arguments: ['root', 'root'] })
    const code1 = acceptedCommands.mudar({ ...state, user: user as any, arguments: ['../eduardo'] })
    const code2 = acceptedCommands.mudar({ ...state, user: user as any, arguments: ['../root'] })

    assert.strictEqual(code1, 0)
    
    assert.strictEqual(code2, 0)
  })
})

describe('File commands', () => {
  it('should be able to create file', () => {
    const code = acceptedCommands.carq({ ...state, command: 'carq', arguments: ['index.js'] })
    const doesFileExists = fs.existsSync(path.resolve(state.currentFolder, 'index.js'))

    assert.strictEqual(code, 0)
    
    assert.strictEqual(doesFileExists, true)
  })

  it('should fail to create file', () => {
    const code1 = acceptedCommands.carq({ ...state, command: 'carq', arguments: [] })
    const code2 = acceptedCommands.carq({ ...state, command: 'carq', arguments: ['index'] })
    const code3 = acceptedCommands.carq({ ...state, command: 'carq', arguments: ['habfhjakbfhjavbfkguavwbawkhjabfa.js'] })
    const code4 = acceptedCommands.carq({ ...state, command: 'carq', arguments: ['%&*./.js'] })
    const code5 = acceptedCommands.carq({ ...state, command: 'carq', arguments: ['index.js'] })

    assert.strictEqual(code1, 1)
    
    assert.strictEqual(code2, 1)
    
    assert.strictEqual(code3, 1)
    
    assert.strictEqual(code4, 1)
    
    assert.strictEqual(code5, 1)
  })

  it('should fail to copy file', () => {
    const code = acceptedCommands.copiar({ ...state, command: 'copiar', arguments: [] })
    assert.strictEqual(code, 1)
  })

  it('should be able to copy file', () => {
    acceptedCommands.cdir({ ...state, command: 'cdir', arguments: ['trabalhos'] })
    const code = acceptedCommands.copiar({ ...state, command: 'copiar', arguments: ['index.js', 'trabalhos'] })
    const doesFileExists = fs.existsSync(path.resolve(state.currentFolder, 'trabalhos', 'index.js'))

    assert.strictEqual(code, 0)
    
    assert.strictEqual(doesFileExists, true)
  })

  it('should fail to move file', () => {
    const code = acceptedCommands.mover({ ...state, command: 'mover', arguments: ['trabalhos/index.js'] })
    assert.strictEqual(code, 1)
  })

  it('should be able to move file', () => {
    acceptedCommands.apagar({ ...state, command: 'apagar', arguments: ['index.js'] })
    const code = acceptedCommands.mover({ ...state, command: 'mover', arguments: ['trabalhos/index.js', './'] })
    const doesFileExists = fs.existsSync(path.resolve(state.currentFolder, 'index.js'))
    const code2 = acceptedCommands.rdir({ ...state, command: 'rdir', arguments: ['trabalhos'] })

    assert.strictEqual(code, 0)
    
    assert.strictEqual(code2, 0)
    
    assert.strictEqual(doesFileExists, true)
  })

  it('should be able to search the file', () => {
    const code = acceptedCommands.buscar({ ...state, command: 'buscar', arguments: ['index.js'] })
    assert.strictEqual(code, 0)
  })

  it('should be able to delete file', () => {
    const code = acceptedCommands.apagar({ ...state, command: 'apagar', arguments: ['index.js'] })
    const doesFileExists = fs.existsSync(path.resolve(state.currentFolder, 'index.js'))

    assert.strictEqual(code, 0)
    
    assert.strictEqual(doesFileExists, false)
  })
})

describe('Admin commands', () => {
  describe('Failing at executing admin commands', () => {
    it('should fail to create an user', () => {
      const code = acceptedCommands.criarusr({ ...state, arguments: ['rodrigo', 'faro'] })
      assert.strictEqual(code, 1)
    })
    
    it('should fail to delete an user', () => {
      const code = acceptedCommands.deletarusr({ ...state, arguments: ['rodrigo'] })
      assert.strictEqual(code, 1)
    })
  })

  describe('Sucess at executing admin commands', () => {
    const user = consultUser({ ...state, arguments: ['root', 'root'] })

    it('should be able to create a user', () => {
      const code = acceptedCommands.criarusr({ ...state, user: user as any, arguments: ['rodrigo-faro', 'elegosta'] })
      assert.strictEqual(code, 0)
    })

    it('should be able to delete a user', () => {
      const code = acceptedCommands.deletarusr({ ...state, user: user as any, arguments: ['rodrigo-faro'] })
      assert.strictEqual(code, 0)
    })
  })
})