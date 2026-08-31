export class VFSError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VFSError';
  }
}
