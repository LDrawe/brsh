import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { describe, it, before } from 'node:test'
import assert from 'node:assert'
import { acceptedCommands } from '../../src/cli/commands'
import { consultUser } from '../../src/core/auth/authentication'
import { boot } from '../../src/core/boot'
import { TerminalContext } from '../../src/types/Aplication'

const state: TerminalContext = {
  command: '',
  arguments: [],
  currentFolder: path.resolve('home', 'eduardo'),
  user: {
    id: 'd8c7ad9a-6bd8-457e-8762-878d7488aeb3',
    username: 'eduardo',
    privilegeLevel: 0
  }
}

describe('Listing & Navigation Commands', () => {
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

  it('should be able to print current path', () => {
    const code = acceptedCommands.atual(state)
    assert.strictEqual(code, 0)
  })

  it('should be able list avaiable commands', () => {
    const code = acceptedCommands.help(state)
    assert.strictEqual(code, 0)
  })
})

describe('Directory Commands', () => {
  const testDir = `dir_${crypto.randomBytes(3).toString('hex')}`

  it('Should be able to create a directory', () => {
    const code = acceptedCommands.cdir({ ...state, arguments: [testDir] })
    assert.strictEqual(code, 0)
  })

  it('Should fail to create an invalid directory', () => {
    const code1 = acceptedCommands.cdir({ ...state, arguments: [] })
    const code2 = acceptedCommands.cdir({ ...state, arguments: ['teste./*`'] })
    const code3 = acceptedCommands.cdir({ ...state, arguments: [testDir] }) // Already exists

    assert.strictEqual(code1, 1)
    assert.strictEqual(code2, 1)
    assert.strictEqual(code3, 1)
  })

  it('Should fail to delete a non-empty directory', () => {
    acceptedCommands.carq({ ...state, arguments: ['temp.js'], currentFolder: path.resolve(state.currentFolder, testDir) })
    const code = acceptedCommands.rdir({ ...state, arguments: [testDir] })
    assert.strictEqual(code, 1)
  })

  it('Should be able to delete a directory recursively (apagar)', () => {
    const code = acceptedCommands.apagar({ ...state, arguments: [testDir] })
    assert.strictEqual(code, 0)
  })

  it('Should be able to change path', () => {
    const user = consultUser({ ...state, arguments: ['root', 'root'] })
    const code1 = acceptedCommands.mudar({ ...state, user: user as any, arguments: ['../root'] })
    assert.strictEqual(code1, 0)
  })
})

describe('File Commands', () => {
  const testFile = `file_${crypto.randomBytes(3).toString('hex')}.js`
  const testFolder = `folder_${crypto.randomBytes(3).toString('hex')}`

  it('should be able to create file', () => {
    const code = acceptedCommands.carq({ ...state, arguments: [testFile] })
    const doesFileExists = fs.existsSync(path.resolve(state.currentFolder, testFile))

    assert.strictEqual(code, 0)
    assert.strictEqual(doesFileExists, true)
  })

  it('should fail to create invalid files', () => {
    const code1 = acceptedCommands.carq({ ...state, arguments: [] })
    const code2 = acceptedCommands.carq({ ...state, arguments: ['%&*./.js'] })
    const code3 = acceptedCommands.carq({ ...state, arguments: [testFile] }) // Already exists

    assert.strictEqual(code1, 1)
    assert.strictEqual(code2, 1)
    assert.strictEqual(code3, 1)
  })

  it('should be able to copy file', () => {
    acceptedCommands.cdir({ ...state, arguments: [testFolder] })
    const code = acceptedCommands.copiar({ ...state, arguments: [testFile, testFolder] })
    const doesFileExists = fs.existsSync(path.resolve(state.currentFolder, testFolder, testFile))

    assert.strictEqual(code, 0)
    assert.strictEqual(doesFileExists, true)
  })

  it('should be able to move file', () => {
    acceptedCommands.apagar({ ...state, arguments: [testFile] })
    const code = acceptedCommands.mover({ ...state, arguments: [`${testFolder}/${testFile}`, './'] })
    const doesFileExists = fs.existsSync(path.resolve(state.currentFolder, testFile))

    assert.strictEqual(code, 0)
    assert.strictEqual(doesFileExists, true)
  })

  it('should be able to search the file', () => {
    const code = acceptedCommands.buscar({ ...state, arguments: [testFile] })
    assert.strictEqual(code, 0)
  })

  it('should be able to delete file', () => {
    const code = acceptedCommands.apagar({ ...state, arguments: [testFile] })
    acceptedCommands.apagar({ ...state, arguments: [testFolder] }) // Cleanup
    const doesFileExists = fs.existsSync(path.resolve(state.currentFolder, testFile))

    assert.strictEqual(code, 0)
    assert.strictEqual(doesFileExists, false)
  })
})

describe('Admin Commands', () => {
  it('should fail to delete an user without privilege', () => {
    const code = acceptedCommands.deletarusr({ ...state, arguments: ['root'] })
    assert.strictEqual(code, 1)
  })
})