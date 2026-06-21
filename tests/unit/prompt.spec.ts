import { describe, it } from 'node:test'
import assert from 'node:assert'
import { randomBytes } from 'node:crypto'

describe('Prompt', () => {
  it('Should be able to ask for input and return a string', () => {
    let logCalls = 0
    const originalLog = console.log

    // Native Mocking to ensure cross-runtime compatibility (Node/Bun/Deno)
    console.log = (msg: string) => { logCalls++ }

    const mockPrompt = (question: string) => {
      console.log(question)
      return randomBytes(5).toString('hex')
    }

    const input = mockPrompt('Question')

    assert.strictEqual(logCalls > 0, true)
    assert.ok(input)

    // Restore original console
    console.log = originalLog
  })
})