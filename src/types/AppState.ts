import { IUser } from 'types/User'

export interface IAppState {
    command: string,
    arguments: string[],
    currentFolder: string;
    user?: IUser | null
}
