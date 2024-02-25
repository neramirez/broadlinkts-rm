// logger.ts
import winston from "winston";

export interface Logger {
  info(message: string, ...parameters: any[]): void;

  warn(message: string, ...parameters: any[]): void;

  error(message: string, ...parameters: any[]): void;

  debug(message: string, ...parameters: any[]): void;
}

export const winstonLogger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" })
  ]
});

if (process.env.NODE_ENV !== "production") {
  winstonLogger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export class WinstonLogger implements Logger {
  info(message: string, ...parameters: any[]): void {
    winstonLogger.info(message, ...parameters);
  }

  warn(message: string, ...parameters: any[]): void {
    winstonLogger.warn(message, ...parameters);
  }

  error(message: string, ...parameters: any[]): void {
    winstonLogger.error(message, ...parameters);
  }

  debug(message: string, ...parameters: any[]): void {
    winstonLogger.debug(message, ...parameters);
  }
}
