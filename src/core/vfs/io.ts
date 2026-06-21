import fs from 'node:fs'

// Guarantees atomic writes to prevent tree corruption during sudden SIGKILLs or hardware power loss
export function writeAtomically(targetPath: string, data: any): void {

  const tempPath = `${targetPath}.tmp`

  fs.writeFileSync(tempPath, JSON.stringify(data, null, 4))

  fs.renameSync(tempPath, targetPath)

}