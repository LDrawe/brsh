import fs from 'node:fs'
import path from 'node:path'
import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert'
import { consultUser, handleAuthentication } from '../../src/core/auth/authentication'
import { authCommands } from '../../src/cli/commands/auth'
import { prompt } from '../../src/cli/prompt'
import { vfs } from '../../src/core/vfs/vfs'
import { TerminalContext, IUser } from '../../src/types/Aplication'

const defaultState: TerminalContext = { arguments: [], command: '', currentFolder: '', user: null }

describe('Authentication', () => {
  afterEach(() => prompt.resetPrompt())

  it('should be able fail login with wrong credentials', () => {
    assert.strictEqual(consultUser({ ...defaultState, arguments: ['eduardo', 'teste'] }), null)
  })

  it('should be able pass login with correct credentials', () => {
    const loggedUser = consultUser({ ...defaultState, arguments: ['eduardo', '123456'] })
    assert.ok(loggedUser && 'id' in loggedUser && 'username' in loggedUser && 'privilegeLevel' in loggedUser)
  })

  it('should handleAuthentication interactively and recover from wrong password', () => {
    const answers = ['eduardo', 'wrong_pass', 'eduardo', '123456']
    let index = 0
    prompt.setPrompt(() => answers[index++])

    const state = { ...defaultState }
    const loggedUser = handleAuthentication(state)

    assert.ok(loggedUser)
    assert.strictEqual(loggedUser.username, 'eduardo')
    assert.strictEqual(state.user?.username, 'eduardo')
  })

  it('should exit on EOF (null username) in handleAuthentication', () => {
    prompt.setPrompt(() => null)

    const originalExit = process.exit
    let exitedCode: number | null = null
    process.exit = ((code?: number) => {
      exitedCode = code ?? 0
      throw new Error('EXIT_CALLED')
    }) as any

    try {
      assert.throws(() => handleAuthentication({ ...defaultState }), /EXIT_CALLED/)
      assert.strictEqual(exitedCode, 0)
    } finally {
      process.exit = originalExit
    }
  })

  it('should exit on EOF (null password) in handleAuthentication', () => {
    let call = 0
    prompt.setPrompt(() => (++call === 1 ? 'eduardo' : null))

    const originalExit = process.exit
    let exitedCode: number | null = null
    process.exit = ((code?: number) => {
      exitedCode = code ?? 0
      throw new Error('EXIT_CALLED')
    }) as any

    try {
      assert.throws(() => handleAuthentication({ ...defaultState }), /EXIT_CALLED/)
      assert.strictEqual(exitedCode, 0)
    } finally {
      process.exit = originalExit
    }
  })
})

describe('Auth Commands', () => {
  const usersConfigPath = path.resolve('src', 'config', 'users.json')
  const originalUsersContent = fs.readFileSync(usersConfigPath, 'utf8')

  const adminState: TerminalContext = {
    ...defaultState,
    user: { id: '0', username: 'root', privilegeLevel: 1 }
  }

  afterEach(() => {
    prompt.resetPrompt()
    fs.writeFileSync(usersConfigPath, originalUsersContent)
    vfs.save()
  })

  it('should delegate sair command to handleAuthentication', () => {
    const answers = ['eduardo', '123456']
    let index = 0
    prompt.setPrompt(() => answers[index++])
    assert.strictEqual(authCommands.sair({ ...defaultState }).username, 'eduardo')
  })

  it('should delegate alterarusr command to handleAuthentication and return 0', () => {
    const answers = ['root', 'root']
    let index = 0
    prompt.setPrompt(() => answers[index++])

    const state = { ...defaultState }
    assert.strictEqual(authCommands.alterarusr(state), 0)
    assert.strictEqual(state.user?.username, 'root')
  })

  it('should validate privilege, username and user count on deletarusr', () => {
    const regularState: TerminalContext = { ...defaultState, arguments: ['eduardo'], user: { id: '1', username: 'eduardo', privilegeLevel: 0 } }
    assert.throws(() => authCommands.deletarusr(regularState), /Privilégios insuficientes/)
    assert.throws(() => authCommands.deletarusr(adminState), /Não é possível remover este usuário/)
    assert.throws(() => authCommands.deletarusr({ ...adminState, arguments: ['root'] }), /Não é possível remover este usuário/)

    const usersArray = require('../../src/config/users.json')
    const popped = usersArray.pop()
    try {
      assert.throws(() => authCommands.deletarusr({ ...adminState, arguments: ['other_user'] }), /Não é possível remover este usuário/)
    } finally {
      if (popped) usersArray.push(popped)
    }
  })

  it('should successfully remove a valid user when run by admin', () => {
    const currentUsers: IUser[] = JSON.parse(originalUsersContent)
    const tempUser: IUser = { id: 'temp-id', username: 'temp_user', privilegeLevel: 0 }
    fs.writeFileSync(usersConfigPath, JSON.stringify([...currentUsers, tempUser], null, 4))

    const tree = vfs.getTree()
    tree['temp_user'] = { id: 'temp-id', name: 'temp_user', type: 'folder', created_at: Date.now(), children: [] }

    const tempHome = path.resolve('home', 'temp_user')
    fs.mkdirSync(tempHome, { recursive: true })

    assert.strictEqual(authCommands.deletarusr({ ...adminState, arguments: ['temp_user'] }), 0)
    assert.strictEqual(tree['temp_user'], undefined)
    assert.strictEqual(fs.existsSync(tempHome), false)
  })

  it('should remove user even if home directory does not exist on disk', () => {
    const currentUsers: IUser[] = JSON.parse(originalUsersContent)
    const ghostUser: IUser = { id: 'ghost-id', username: 'ghost_user', privilegeLevel: 0 }
    fs.writeFileSync(usersConfigPath, JSON.stringify([...currentUsers, ghostUser], null, 4))

    const tree = vfs.getTree()
    tree['ghost_user'] = { id: 'ghost-id', name: 'ghost_user', type: 'folder', created_at: Date.now(), children: [] }

    assert.strictEqual(authCommands.deletarusr({ ...adminState, arguments: ['ghost_user'] }), 0)
    assert.strictEqual(tree['ghost_user'], undefined)
  })
})