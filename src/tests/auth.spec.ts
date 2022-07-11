import { handleLogin } from '@lib/authentication'

describe('Should be able to test login', () => {
  it('should be able fail login', () => {
    expect(handleLogin({ arguments: ['eduardo', 'teste'], command: '', currentFolder: '', user: null })).toBe(null)
  })

  it('should be able pass login', () => {
    const loggedUser = handleLogin({ arguments: ['eduardo', 'senha'], command: '', currentFolder: '', user: null })
    expect(loggedUser).toHaveProperty('id')
    expect(loggedUser).toHaveProperty('username')
    expect(loggedUser).toHaveProperty('password')
    expect(loggedUser).toHaveProperty('privilegeLevel')
  })
})
