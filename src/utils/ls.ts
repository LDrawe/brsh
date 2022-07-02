import fs from 'fs'
import dree from 'dree'
/**
 * Retorna o conteúdo do diretório em ordem alfabética
 * @param {Boolean} reverse
 * Recebe false por padrão. Se passar true retorna o conteúdo
 * @param {string} folder
 * Diretório a ser listado
 */
function listar (folder: string, reverse: boolean = false) {
  let filesArray = fs.readdirSync(folder || './', { withFileTypes: true })
  if (reverse) filesArray = filesArray.reverse()
  filesArray.forEach(element => process.env.NODE_ENV !== 'test' && console.log(element.isDirectory() ? '📁 ' : '🗄️ ', element.name))
  return filesArray
}
/**
 * Retorna os atributos do arquivo ou diretório passado
 */
function listaratr (dir: string) {
  return fs.lstatSync(dir)
}
/**
 * Retorna todo os diretórios e subdiretórios em formato de árvore
 */
function listartudo () {
  const tree = dree.parse('./', {
    followLinks: true, // Pode não funcionar no Windows
    exclude: /node_modules/
  })
  console.log(tree)
}

export { listar, listaratr, listartudo }
