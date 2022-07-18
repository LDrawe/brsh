import { randomBytes } from 'crypto'

const prompt = jest.fn((question: string) => {
  console.log(question)
  return randomBytes(5).toString('hex')
})

const logMock = jest.spyOn(console, 'log').mockImplementation()

it('Should be able to ask for input and return a string', () => {
  const input = prompt('Question')
  expect(prompt).toHaveBeenCalled()
  expect(console.log).toHaveBeenCalled()
  expect(logMock).toHaveBeenCalled()
  expect(input).toBeTruthy()
})
