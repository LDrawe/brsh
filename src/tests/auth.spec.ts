import { handleLogin } from '@lib/authentication'
import users from '@config/users.json'

describe('Should be able to test login', () => {
  it('should be able fail login', () => {
    expect(handleLogin('eduardo', 'teste')).toBe(null)
  })

  it('should be able pass login', () => {
    const loggedUser = handleLogin('eduardo', 'senha')
    expect(loggedUser).toHaveProperty('id')
    expect(loggedUser).toHaveProperty('username')
    expect(loggedUser).toHaveProperty('password')
    expect(loggedUser).toHaveProperty('privilegeLevel')

    const isUserinArray = users.includes(loggedUser)
    expect(isUserinArray).toBe(true)
  })
})
