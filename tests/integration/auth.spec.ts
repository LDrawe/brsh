import { describe, it } from 'node:test'
import assert from 'node:assert'
import { consultUser } from '../../src/core/auth/authentication'
import { TerminalContext } from '../../src/types/Aplication'

describe('Authentication', () => {
  it('should be able fail login with wrong credentials', () => {
    const state: TerminalContext = { arguments: ['eduardo', 'teste'], command: '', currentFolder: '', user: null }
    const user = consultUser(state)
    assert.strictEqual(user, null)
  })

  it('should be able pass login with correct credentials', () => {
    const state: TerminalContext = { arguments: ['eduardo', '123456'], command: '', currentFolder: '', user: null }
    const loggedUser = consultUser(state)

    if (!loggedUser) return assert.fail('User should not be null')

    assert.ok('id' in loggedUser)
    assert.ok('username' in loggedUser)
    assert.ok('privilegeLevel' in loggedUser)
  })
})