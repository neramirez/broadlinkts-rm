import winston from "winston";
import { SocketHandler } from "./socket.handler";

export class CommandProcessor {
  private logger: winston.Logger;
  private socketHandler: SocketHandler;
  private isProcessing: boolean;
  private queue: Buffer[];

  constructor(logger: winston.Logger, socketHandler: SocketHandler) {
    this.logger = logger;
    this.socketHandler = socketHandler;
    this.isProcessing = false;
    this.queue = [];
  }

  enqueue(command: Buffer) {
    this.queue.push(command);
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const command = this.queue.shift();
    if (command) {
      try {
        await this.sendData(command);
      } catch (err) {
        console.error(`Error processing command: ${err}`);
      }
      this.processQueue();
    }
  }
}