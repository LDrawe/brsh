export interface IFile {
    id: string,
    name: string,
    created_at: number,
    data: string
}

export interface IFolder {
    id: string,
    created_at: number,
    path: string;
    files: IFile[]
}
