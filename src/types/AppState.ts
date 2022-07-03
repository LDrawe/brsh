import { IUser } from 'types/User'

export interface IAppState {
    commands: string[],
    user?: IUser | null
}
