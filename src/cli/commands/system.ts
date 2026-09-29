import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { TerminalContext, IUser } from 'types/Aplication'
import { vfs } from '@core/vfs/vfs'
import usersData from '@config/users.json'

const users = usersData as unknown as IUser[]

export const systemCommands = {
  quit: () => process.exit(0),

  help: (): number => {
    console.log(`
      CDIR <nome_do_diretório> – Cria um novo diretório
      CARQ <nome_do_arquivo> – Cria um novo arquivo
      LISTARATR <nome_do_arq_ou_dir> – Lista os atributos de um arquivo ou diretório
      RDIR <nome_do_dir> – Apaga um diretório vazio
      APAGAR <nome> – Apaga um arquivo ou um diretório com arquivos
      LISTAR – Lista o conteúdo do diretório atual, em ordem alfabética
      LISTARINV – Lista o conteúdo do diretório em ordem decrescente
      LISTARTUDO – Lista o conteúdo e subdiretórios
      MUDAR <end_destino> – Altera o estado atual da pasta
      ATUAL – Mostra o nome do diretório atual
      COPIAR <origem> <destino> – Copia um arquivo/diretório
      RENOMEAR <nome_atual> <nome_final> – Renomeia um arquivo ou diretório
      MOVER <origem> <destino> – Move um arquivo/diretório
      BUSCAR <nome_arquivo> [dir_de_busca] – Busca um arquivo na hierarquia
      ALTERARUSR <login> <senha> - Fará o login de outro usuário
      DELETARUSR <login> - Deleta um usuário do sistema
      RESETAR - Formata o VFS e apaga todos os arquivos criados
      SAIR - Faz logout do usuário atual
      CLEAR - Limpa a tela
      QUIT - Encerra o programa
    `.trim())
    return 0
  },

  resetar: (state: TerminalContext): number => {
    const homeDir = path.resolve('home')
    if (fs.existsSync(homeDir)) {
      fs.rmSync(homeDir, { recursive: true, force: true })
    }
    
    const tree = vfs.getTree()
    for (const key of Object.keys(tree)) {
      delete tree[key]
    }
    
    users.forEach(user => {
      tree[user.username] = {
        id: crypto.randomUUID(),
        name: user.username,
        type: 'folder',
        created_at: Date.now(),
        children: []
      }
      const userHome = path.resolve('home', user.username)
      fs.mkdirSync(userHome, { recursive: true })
    })

    vfs.save()
    console.log('Sistema de arquivos virtual formatado com sucesso.')
    
    state.currentFolder = path.resolve('home', state.user!.username)
    return 0
  },

  clear: (): number => {
    console.clear()
    return 0
  }
}
