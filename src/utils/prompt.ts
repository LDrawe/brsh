import PromptSync from 'prompt-sync'
import color from 'cli-color'

const prompt = PromptSync()
const zsh = (username: string) => prompt(`💻 ${color.red(color.bold(username))} ${color.cyan('in')} ${color.magenta(process.cwd())} ${color.yellow('> ')}`)

export { zsh, prompt }
