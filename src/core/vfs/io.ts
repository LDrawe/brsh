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
        // Non-busy synchronous sleep in OS kernel without spinning the CPU in a busy loop
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
      } else {
        throw e;
      }
    }
  }
}