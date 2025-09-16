export class Logger {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  info(message: string, metadata?: any): void {
    this.log('INFO', message, metadata);
  }

  warn(message: string, metadata?: any): void {
    this.log('WARN', message, metadata);
  }

  error(message: string, metadata?: any): void {
    this.log('ERROR', message, metadata);
  }

  debug(message: string, metadata?: any): void {
    this.log('DEBUG', message, metadata);
  }

  private log(level: string, message: string, metadata?: any): void {
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