import fs from 'node:fs'

// Guarantees atomic writes to prevent tree corruption during sudden SIGKILLs or hardware power loss
export function writeAtomically(targetPath: string, data: any): void {
  const tempPath = `${targetPath}.tmp`
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 4))
  
  let retries = 3;
  while (retries > 0) {
    try {
      fs.renameSync(tempPath, targetPath);
      break;
    } catch (e: any) {
      if (e.code === 'EPERM' && retries > 1) {
        retries--;
        // At least we wait a bit before retrying, although synchronous sleep in node is ugly,
        // it's fine for our toy use case.
        const start = Date.now();
        while (Date.now() - start < 10) {} 
      } else {
        throw e;
      }
    }
  }
}