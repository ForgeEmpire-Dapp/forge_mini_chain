"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor(name) {
        this.name = name;
    }
    info(message, metadata) {
        this.log('INFO', message, metadata);
    }
    warn(message, metadata) {
        this.log('WARN', message, metadata);
    }
    error(message, metadata) {
        this.log('ERROR', message, metadata);
    }
    debug(message, metadata) {
        this.log('DEBUG', message, metadata);
    }
    log(level, message, metadata) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            name: this.name,
            message,
            metadata
        };
        console.log(JSON.stringify(logEntry));
    }
}
exports.Logger = Logger;
