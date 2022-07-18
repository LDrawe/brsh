import { consultUser } from '@lib/authentication'

describe('Should be able to test login', () => {
  it('should be able fail login', () => {
    const user = consultUser({ arguments: ['eduardo', 'teste'], command: '', currentFolder: '', user: null })
    expect(user).toBe(null)
  })

  it('should be able pass login', () => {
    const loggedUser = consultUser({ arguments: ['eduardo', '123456'], command: '', currentFolder: '', user: null })
    expect(loggedUser).toHaveProperty('id')
    expect(loggedUser).toHaveProperty('username')
    expect(loggedUser).toHaveProperty('password')
    expect(loggedUser).toHaveProperty('privilegeLevel')
  })
})
