import PromptSync from 'prompt-sync'
import color from 'cli-color'

// Forces prompt-sync to delegate SIGINT (Ctrl+C) handling back to the OS
const prompt = PromptSync({ sigint: true })

const zsh = (username: string, currentFolder: string) => prompt(`💻 ${color.red(color.bold(username))} ${color.cyan('in')} ${color.magenta(currentFolder)} ${color.yellow('> ')}`)

export { zsh, prompt }