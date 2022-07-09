import PromptSync from 'prompt-sync'
import color from 'cli-color'

const prompt = PromptSync()
const zsh = (username: string, currentFolder: string) => prompt(`💻 ${color.red(color.bold(username))} ${color.cyan('in')} ${color.magenta(currentFolder)} ${color.yellow('> ')}`)

export { zsh, prompt }
