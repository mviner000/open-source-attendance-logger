// lib/logger.ts

export type LogLevel = 'info' | 'error' | 'success' | 'warn';

interface LogMessage {
  message: string;
  level: LogLevel;
  timestamp: Date;
}

class Logger {
  private static instance: Logger;
  private logs: LogMessage[] = [];
  private listeners: ((log: LogMessage) => void)[] = [];

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  addListener(callback: (log: LogMessage) => void) {
    this.listeners.push(callback);
  }

  removeListener(callback: (log: LogMessage) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  log(message: string, level: LogLevel = 'info') {
    const logMessage = {
      message,
      level,
      timestamp: new Date()
    };
    
    this.logs.push(logMessage);
    this.listeners.forEach(listener => listener(logMessage));
    
    // Also log to console with appropriate styling
    const styles = {
      info: 'color: #3b82f6',
      error: 'color: #ef4444',
      success: 'color: #22c55e',
      warn: 'color: #f59e0b'
    };
    
    console.log(
      `%c[${level.toUpperCase()}] ${message}`,
      `${styles[level]} font-weight: bold`
    );
  }

  getLogs(): LogMessage[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = Logger.getInstance();