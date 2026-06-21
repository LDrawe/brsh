import path from 'node:path'

// Acts as a strict chroot jail, preventing directory traversal exploits escaping the user home
export function isPathSafe(userHomePath: string, targetPath: string): boolean {

  const relativePath = path.relative(userHomePath, targetPath)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return false

  return true

}

// Sanitizes VFS inputs to prevent injection or parsing errors at the OS level
export function isNameSafe(name: string): boolean {

  const specialCharacters = /[!@#$%^&*()+\=\[\]{};':"\\|,<>\/?]+/

  if (specialCharacters.test(name)) return false

  return true

}
