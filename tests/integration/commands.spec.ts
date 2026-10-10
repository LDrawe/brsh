import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { acceptedCommands } from '../../src/cli/commands'
import { consultUser } from '../../src/core/auth/authentication'
import { boot } from '../../src/core/boot'
import { TerminalContext } from '../../src/types/Aplication'
import { VFSError } from '../../src/core/vfs/errors'

const treeConfigPath = path.resolve('src', 'config', 'tree.json')
const originalTree = fs.readFileSync(treeConfigPath, 'utf8')

const defaultState: TerminalContext = {
  command: '',
  arguments: [],
  currentFolder: path.resolve('home', 'eduardo'),
  user: {
    id: 'd8c7ad9a-6bd8-457e-8762-878d7488aeb3',
    username: 'eduardo',
    privilegeLevel: 0
  }
}

/** Helper para limpar a poluição visual de invocar comandos nos testes */
const exec = (cmd: keyof typeof acceptedCommands, args: string[] = [], overrides: Partial<TerminalContext> = {}) => {
  return acceptedCommands[cmd]({ ...defaultState, arguments: args, ...overrides } as TerminalContext)
}

describe('Listing & Navigation Commands', () => {
  before(() => {
    boot()
    exec('cdir', ['subfolder_nav'])
    exec('carq', ['file_nav.txt'])
    exec('carq', ['nested_nav.txt'], { currentFolder: path.resolve(defaultState.currentFolder, 'subfolder_nav') })
  })

  it('should be able list directory with mixed folders and files', () => {
    assert.strictEqual(exec('listar'), 0)
  })

  it('should be able list directory and subdirectories', () => {
    assert.strictEqual(exec('listartudo'), 0)
  })

  it('should be able list directory in reverse with mixed folders and files', () => {
    assert.strictEqual(exec('listarinv'), 0)
  })

  it('should be able to print current path', () => {
    assert.strictEqual(exec('atual'), 0)
  })

  it('should be able list avaiable commands', () => {
    assert.strictEqual(exec('help'), 0)
  })

  it('should fail listing when current folder is invalid', () => {
    const invalidState = { currentFolder: path.resolve('home', 'eduardo', 'invalid_sub') }
    assert.throws(() => exec('listar', [], invalidState), VFSError)
    assert.throws(() => exec('listarinv', [], invalidState), VFSError)
    assert.throws(() => exec('listartudo', [], invalidState), VFSError)
  })
})

describe('Directory Commands', () => {
  const testDir = `dir_${crypto.randomBytes(3).toString('hex')}`

  it('Should be able to create a directory', () => {
    assert.strictEqual(exec('cdir', [testDir]), 0)
  })

  it('Should fail to create an invalid directory', () => {
    assert.throws(() => exec('cdir', []), VFSError)
    assert.throws(() => exec('cdir', ['teste./*`']), VFSError)
    assert.throws(() => exec('cdir', [testDir]), VFSError) // Already exists
    assert.throws(() => exec('cdir', ['sub'], { currentFolder: path.resolve('home', 'eduardo', 'inexistente') }), VFSError)
  })

  it('Should fail to delete a non-empty directory with rdir', () => {
    exec('carq', ['temp.js'], { currentFolder: path.resolve(defaultState.currentFolder, testDir) })
    assert.throws(() => exec('rdir', [testDir]), VFSError)
  })

  it('Should fail rdir when argument is missing or directory not found', () => {
    assert.throws(() => exec('rdir', []), VFSError)
    assert.throws(() => exec('rdir', ['dir_nao_existe']), VFSError)
  })

  it('Should be able to delete an empty directory with rdir', () => {
    const emptyDir = `empty_${crypto.randomBytes(3).toString('hex')}`
    exec('cdir', [emptyDir])
    assert.strictEqual(exec('rdir', [emptyDir]), 0)
    assert.strictEqual(fs.existsSync(path.resolve(defaultState.currentFolder, emptyDir)), false)
  })

  it('Should be able to delete a directory recursively (apagar)', () => {
    assert.strictEqual(exec('apagar', [testDir]), 0)
  })

  it('Should be able to change path', () => {
    const user = consultUser({ ...defaultState, arguments: ['root', 'root'] }) as any
    assert.strictEqual(exec('mudar', ['../root'], { user }), 0)
  })

  it('Should fail to change path if target is not provided or invalid', () => {
    assert.throws(() => exec('mudar', []), VFSError)
    assert.throws(() => exec('mudar', ['pasta_inexistente']), VFSError)
  })
})

describe('File Commands', () => {
  const testFile = `file_${crypto.randomBytes(3).toString('hex')}.js`
  const testFolder = `folder_${crypto.randomBytes(3).toString('hex')}`

  it('should be able to create file', () => {
    assert.strictEqual(exec('carq', [testFile]), 0)
    assert.strictEqual(fs.existsSync(path.resolve(defaultState.currentFolder, testFile)), true)
  })

  it('should fail to create invalid files', () => {
    assert.throws(() => exec('carq', []), VFSError)
    assert.throws(() => exec('carq', ['%&*./.js']), VFSError)
    assert.throws(() => exec('carq', [testFile]), VFSError) // Already exists
    assert.throws(() => exec('carq', ['abc.txt'], { currentFolder: path.resolve('home', 'eduardo', 'inexistente') }), VFSError)
  })

  it('should fail apagar if target missing or not found physically', () => {
    assert.throws(() => exec('apagar', []), VFSError)
    assert.throws(() => exec('apagar', ['fantasma.txt']), VFSError)
  })

  it('should be able to copy file', () => {
    exec('cdir', [testFolder])
    assert.strictEqual(exec('copiar', [testFile, testFolder]), 0)
    assert.strictEqual(fs.existsSync(path.resolve(defaultState.currentFolder, testFolder, testFile)), true)
  })

  it('should fail copy on invalid arguments or missing source', () => {
    assert.throws(() => exec('copiar', []), VFSError)
    assert.throws(() => exec('copiar', ['nao_existe.txt', testFolder]), VFSError)

    const diskOnly = path.resolve(defaultState.currentFolder, 'copy_disk_only.txt')
    fs.writeFileSync(diskOnly, '')
    try {
      assert.throws(() => exec('copiar', ['copy_disk_only.txt', testFolder]), VFSError)
    } finally {
      if (fs.existsSync(diskOnly)) fs.unlinkSync(diskOnly)
    }
  })

  it('should be able to move file', () => {
    exec('apagar', [testFile])
    assert.strictEqual(exec('mover', [`${testFolder}/${testFile}`, './']), 0)
    assert.strictEqual(fs.existsSync(path.resolve(defaultState.currentFolder, testFile)), true)
  })

  it('should fail move on invalid arguments or missing source', () => {
    assert.throws(() => exec('mover', []), VFSError)
    assert.throws(() => exec('mover', ['nao_existe.txt', './']), VFSError)

    const diskOnlyMove = path.resolve(defaultState.currentFolder, 'move_disk_only.txt')
    fs.writeFileSync(diskOnlyMove, '')
    try {
      assert.throws(() => exec('mover', ['move_disk_only.txt', './']), VFSError)
    } finally {
      if (fs.existsSync(diskOnlyMove)) fs.unlinkSync(diskOnlyMove)
    }
  })

  it('should be able to rename file and validate edge cases', () => {
    assert.throws(() => exec('renomear', []), VFSError)
    assert.throws(() => exec('renomear', [testFile, 'invalido*name']), VFSError)
    assert.throws(() => exec('renomear', ['fantasma.txt', 'novo.txt']), VFSError)

    const diskOnlyFile = path.resolve(defaultState.currentFolder, 'disk_only.txt')
    fs.writeFileSync(diskOnlyFile, '')
    try {
      assert.throws(() => exec('renomear', ['disk_only.txt', 'novo_disk.txt']), VFSError)
    } finally {
      if (fs.existsSync(diskOnlyFile)) fs.unlinkSync(diskOnlyFile)
    }

    const renamed = `renamed_${testFile}`
    assert.strictEqual(exec('renomear', [testFile, renamed]), 0)
    assert.strictEqual(fs.existsSync(path.resolve(defaultState.currentFolder, renamed)), true)
    assert.strictEqual(fs.existsSync(path.resolve(defaultState.currentFolder, testFile)), false)

    exec('renomear', [renamed, testFile])
  })

  it('should be able to search the file with and without targetDir', () => {
    assert.throws(() => exec('buscar', []), VFSError)
    assert.throws(() => exec('buscar', [testFile, 'pasta_fantasma']), VFSError)
    assert.throws(() => exec('buscar', ['arquivo_que_nunca_existiu.js']), VFSError)

    assert.strictEqual(exec('buscar', [testFile]), 0)
    assert.strictEqual(exec('buscar', [testFile, './']), 0)

    exec('cdir', ['search_subfolder'])
    exec('carq', ['nested_target.txt'], { currentFolder: path.resolve(defaultState.currentFolder, 'search_subfolder') })
    assert.strictEqual(exec('buscar', ['nested_target.txt']), 0)
    exec('apagar', ['search_subfolder'])
  })

  it('should be able to list attributes of file and folder', () => {
    assert.throws(() => exec('listaratr', []), VFSError)
    assert.throws(() => exec('listaratr', ['fantasma']), VFSError)
    assert.strictEqual(exec('listaratr', [testFile]), 0)
    assert.strictEqual(exec('listaratr', [testFolder]), 0)
  })

  it('should be able to stream and read file content with ler', async () => {
    assert.throws(() => exec('ler', []), VFSError)
    assert.throws(() => exec('ler', ['arquivo_inexistente.txt']), VFSError)
    assert.throws(() => exec('ler', [testFolder]), VFSError)

    const lerFile = 'ler_stream_test.txt'
    exec('carq', [lerFile])
    assert.strictEqual(exec('ler', [lerFile]), 0)

    await new Promise(resolve => setTimeout(resolve, 50))
    exec('apagar', [lerFile])
  })

  it('should be able to delete file', () => {
    assert.strictEqual(exec('apagar', [testFile]), 0)
    exec('apagar', [testFolder]) // Cleanup
    assert.strictEqual(fs.existsSync(path.resolve(defaultState.currentFolder, testFile)), false)
  })
})

describe('System Commands', () => {
  it('should clear screen and return 0', () => {
    assert.strictEqual(exec('clear'), 0)
  })

  it('should handle quit via process.exit', () => {
    const originalExit = process.exit
    let exitCode: number | null = null
    process.exit = ((code?: number) => {
      exitCode = code ?? 0
      throw new Error('QUIT_CALLED')
    }) as any

    try {
      assert.throws(() => exec('quit'), /QUIT_CALLED/)
      assert.strictEqual(exitCode, 0)
    } finally {
      process.exit = originalExit
    }
  })

  it('should reset VFS structure and recreate home directories', () => {
    assert.strictEqual(exec('resetar'), 0)
    assert.strictEqual(fs.existsSync(path.resolve('home', 'eduardo')), true)
    assert.strictEqual(fs.existsSync(path.resolve('home', 'root')), true)
  })

  it('should reset VFS structure even when homeDir does not exist beforehand', () => {
    const homeDir = path.resolve('home')
    if (fs.existsSync(homeDir)) {
      fs.rmSync(homeDir, { recursive: true, force: true })
    }
    assert.strictEqual(exec('resetar'), 0)
    assert.strictEqual(fs.existsSync(path.resolve('home', 'eduardo')), true)
  })
})

describe('Admin Commands', () => {
  after(() => {
    fs.writeFileSync(treeConfigPath, originalTree)
  })

  it('should fail to delete an user without privilege', () => {
    assert.throws(() => exec('deletarusr', ['root']), VFSError)
  })
})