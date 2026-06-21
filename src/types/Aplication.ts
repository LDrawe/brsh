export interface IUser {
    id: string;
    username: string;
    privilegeLevel: number;
}

// Memory map for the active REPL session
export interface TerminalContext {
    command: string;
    arguments: string[];
    currentFolder: string;
    user: IUser | null;
}