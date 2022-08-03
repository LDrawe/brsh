import path from 'path'
import { IState } from 'types/Aplication'
import { validatePath } from '@utils/validator'

describe('Validates the paths to the user directory only', () => {
  const state:IState = {
    currentFolder: path.resolve('home', 'eduardo'),
    arguments: [],
    command: '',
    user: {
      id: 'ae5b668a-bd73-41a0-84bd-1604a5ab79e9',
      username: 'eduardo',
      privilegeLevel: 0
    }
  }

  it('Should be able to reject provided path', () => {
    const pathBelongToUser = validatePath(state, '../root')
    expect(pathBelongToUser).toBe(false)
  })
  it('Should be able to acept provided path', () => {
    const pathBelongToUser = validatePath(state)
    expect(pathBelongToUser).toBe(true)
  })
})
