"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
exports.IPC_CHANNELS = {
    CONNECTION: {
        GET_ALL: 'connection:getAll',
        CREATE: 'connection:create',
        UPDATE: 'connection:update',
        DELETE: 'connection:delete',
        TEST: 'connection:test',
    },
    GROUP: {
        GET_ALL: 'group:getAll',
        CREATE: 'group:create',
        UPDATE: 'group:update',
        DELETE: 'group:delete',
    },
    SNIPPET: {
        GET_ALL: 'snippet:getAll',
        CREATE: 'snippet:create',
        UPDATE: 'snippet:update',
        DELETE: 'snippet:delete',
    },
    LOG: {
        GET_ALL: 'log:getAll',
        GET_BY_CONNECTION: 'log:getByConnection',
        CREATE: 'log:create',
        UPDATE: 'log:update',
        CLEAR: 'log:clear',
    },
    SSH: {
        CONNECT: 'ssh:connect',
        DISCONNECT: 'ssh:disconnect',
        EXEC: 'ssh:exec',
        DATA: 'ssh:data',
        RESIZE: 'ssh:resize',
    },
    SFTP: {
        LIST: 'sftp:list',
        UPLOAD: 'sftp:upload',
        DOWNLOAD: 'sftp:download',
        DELETE: 'sftp:delete',
        MKDIR: 'sftp:mkdir',
        RENAME: 'sftp:rename',
    },
    PORT_FORWARD: {
        START: 'portForward:start',
        STOP: 'portForward:stop',
        LIST: 'portForward:list',
    },
};
//# sourceMappingURL=ipc-channels.js.map