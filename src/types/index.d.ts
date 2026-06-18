export interface SSHConnection {
    id: string;
    name: string;
    host: string;
    port: number;
    username: string;
    authType: 'password' | 'privateKey';
    password?: string;
    privateKey?: string;
    passphrase?: string;
    groupId: string;
    createdAt: number;
    updatedAt: number;
}
export interface ConnectionGroup {
    id: string;
    name: string;
    parentId: string | null;
    type: 'environment' | 'project';
    createdAt: number;
}
export interface CommandSnippet {
    id: string;
    name: string;
    command: string;
    description: string;
    groupId: string;
    createdAt: number;
}
export interface PortForwardRule {
    id: string;
    connectionId: string;
    type: 'local' | 'remote' | 'dynamic';
    localPort: number;
    remoteHost: string;
    remotePort: number;
    status: 'running' | 'stopped';
}
export interface ConnectionLog {
    id: string;
    connectionId: string;
    connectionName: string;
    startTime: number;
    endTime?: number;
    status: 'connected' | 'disconnected' | 'failed';
    errorMessage?: string;
    commands: string[];
}
export interface SFTPFile {
    name: string;
    isDirectory: boolean;
    isFile: boolean;
    size: number;
    modifyTime: number;
    accessTime: number;
    rights: {
        user: string;
        group: string;
        other: string;
    };
    owner: number;
    group: number;
}
export interface TerminalTab {
    id: string;
    connectionId: string;
    connectionName: string;
    isConnected: boolean;
    isSFTPOpen: boolean;
    currentPath: string;
}
export interface AppState {
    connections: SSHConnection[];
    groups: ConnectionGroup[];
    snippets: CommandSnippet[];
    logs: ConnectionLog[];
    activeTabId: string | null;
    tabs: TerminalTab[];
    selectedConnectionId: string | null;
}
//# sourceMappingURL=index.d.ts.map