import fs from 'fs'
import path from 'path'

/**
 * Retorna o se o arquivo ou pasta foi encontrado e seu caminho
 * @param {string} file
 * Arquivo ou pasta que deseja encontrar
 * @param {string} folder
 * Pasta em que se deseja procurar
 */
function buscar (file: string, folder: string) {
  if (folder === 'node_modules' || folder === '.git') {
    console.log('Você não tem accesso a este diretório')
    return ''
  }

  const dir = fs.readdirSync(folder, { withFileTypes: true })

  if (!dir) {
    console.log(`Nenhum diretório chamado "${folder}" encontrado`)
    return ''
  } else if (dir.map(pasta => pasta.name).includes(file)) {
    const finalPath = path.resolve(folder, file)
    console.log('Achado em', finalPath)
    return finalPath
  }

  for (let i = 0; i < dir.length; i++) {
    if (dir[i].isDirectory()) {
      buscar(file, path.resolve(folder, dir[i].name))
    }
  };
};

/**
 * Cria um novo arquivo
 * @param {string[]} commands
 * Arquivo ou pasta que deseja encontrar
 */
function criarArquivo (commands: string[]) {
  commands.shift()
  const file = commands[0]
  commands.shift()
  fs.writeFileSync(file, commands.join(' '))
}
/**
 * Muda o diretório atual
 * @param {string} currentDir
 * Diretório atual
* @param {string} destination
 * Diretório destino
 */
function mudar (currentDir: string, destination: string) {
  const pasta = path.resolve(destination)
  if (!fs.existsSync(pasta) || !destination) { return currentDir }
  return pasta
}

export { buscar, criarArquivo, mudar }
