import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert'
import { prompt, zsh } from '../../src/cli/prompt'

describe('Prompt', () => {
  afterEach(() => {
    prompt.resetPrompt()
  })

  it('Should be able to ask for input and return a string using custom prompt', () => {
    prompt.setPrompt((ask?: string) => `response_to_${ask}`)
    const result = prompt('What is your name?')
    assert.strictEqual(result, 'response_to_What is your name?')
  })

  it('Should format zsh prompt correctly', () => {
    let capturedQuestion = ''
    prompt.setPrompt((ask?: string) => {
      capturedQuestion = ask || ''
      return 'ls -la'
    })

    const result = zsh('eduardo', '/home/eduardo')
    assert.strictEqual(result, 'ls -la')
    assert.ok(capturedQuestion.includes('eduardo'))
    assert.ok(capturedQuestion.includes('/home/eduardo'))
  })
})