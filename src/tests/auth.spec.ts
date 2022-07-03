import { handleLogin } from '@lib/authentication'

describe('Should be able to test login', () => {
  it('should be able fail login', () => {
    expect(handleLogin({ commands: ['eduardo', 'teste'] })).toBe(null)
  })

  it('should be able pass login', () => {
    const loggedUser = handleLogin({ commands: ['eduardo', 'senha'] })
    expect(loggedUser).toHaveProperty('id')
    expect(loggedUser).toHaveProperty('username')
    expect(loggedUser).toHaveProperty('password')
    expect(loggedUser).toHaveProperty('privilegeLevel')
  })
})
