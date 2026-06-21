import { randomBytes } from 'node:crypto'
import { describe, it, mock } from 'node:test'
import assert from 'node:assert'

const prompt = mock.fn((question: string) => {
  console.log(question)
  return randomBytes(5).toString('hex')
})

mock.method(console, 'log', () => {})

describe('Prompt', () => {
  it('Should be able to ask for input and return a string', () => {
    const input = prompt('Question')

    assert.strictEqual(prompt.mock.calls.length > 0, true)
    
    const logMockCalls = (console.log as any).mock.calls.length

    assert.strictEqual(logMockCalls > 0, true)

    assert.ok(input)
  })
})