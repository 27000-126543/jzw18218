export declare const IPC_CHANNELS: {
    CONNECTION: {
        GET_ALL: string;
        CREATE: string;
        UPDATE: string;
        DELETE: string;
        TEST: string;
    };
    GROUP: {
        GET_ALL: string;
        CREATE: string;
        UPDATE: string;
        DELETE: string;
    };
    SNIPPET: {
        GET_ALL: string;
        CREATE: string;
        UPDATE: string;
        DELETE: string;
    };
    LOG: {
        GET_ALL: string;
        GET_BY_CONNECTION: string;
        CREATE: string;
        UPDATE: string;
        CLEAR: string;
    };
    SSH: {
        CONNECT: string;
        DISCONNECT: string;
        EXEC: string;
        DATA: string;
        RESIZE: string;
    };
    SFTP: {
        LIST: string;
        UPLOAD: string;
        DOWNLOAD: string;
        DELETE: string;
        MKDIR: string;
        RENAME: string;
    };
    PORT_FORWARD: {
        START: string;
        STOP: string;
        LIST: string;
    };
};
//# sourceMappingURL=ipc-channels.d.ts.map