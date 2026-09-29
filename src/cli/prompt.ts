import PromptSync from 'prompt-sync'
import color from 'cli-color'

const defaultPrompt = PromptSync({ sigint: true })

interface CustomPrompt {
  (ask: string, opts?: PromptSync.Option): string | null;
  (ask: string, value: string, opts?: PromptSync.Option): string | null;
  (opts?: PromptSync.Option): string | null;
  setPrompt: (fn: any) => void;
  resetPrompt: () => void;
}

let promptImpl: any = defaultPrompt

export const prompt = Object.assign(
  (...args: any[]) => promptImpl(...args),
  {
    setPrompt: (fn: any) => {
      promptImpl = fn
    },
    resetPrompt: () => {
      promptImpl = defaultPrompt
    }
  }
) as CustomPrompt

export function zsh(username: string, currentFolder: string): string | null {
  return prompt(`💻 ${color.red(color.bold(username))} ${color.cyan('in')} ${color.magenta(currentFolder)} ${color.yellow('> ')}`)
}