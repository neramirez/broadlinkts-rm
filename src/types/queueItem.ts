import { PromiseExecutor } from "./promiseExecutor";

export type QueueItem = {
  buffer: Buffer,
  promiseExecutor: PromiseExecutor<Buffer>
};