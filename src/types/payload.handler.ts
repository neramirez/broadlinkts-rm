import EventEmitter from "events";

export abstract class PayloadHandler extends EventEmitter {
  protected rm4Type: string;

  constructor(rm4Type: string) {
    super();
    this.rm4Type = rm4Type;
  }

  abstract handle(payload: Buffer): void;
}

export class Rm3CheckTemperatureHandler extends PayloadHandler {
  public handle(payload: Buffer): void {
    const temp = (payload[0x4] * 10 + payload[0x5]) / 10.0;
    this.emit("temperature", temp);
  }
}

export class GetFromCheckDataHandler extends PayloadHandler {
  handle(payload: Buffer): void {
    const data = Buffer.alloc(payload.length - 4, 0);
    payload.copy(data, 0, 4);
    this.emit("rawData", data);
  }
}

export class Rm4ProCheckRfFrequencyFoundHandler extends PayloadHandler {
  handle(payload: Buffer): void {
    const data = Buffer.alloc(1, 0);
    payload.copy(data, 0, 0x6);
    if (data[0] !== 0x1) {
      return;
    }
    this.emit("rawRFData", data);
  }
}


export class RM3CheckTemperatureHumidityHandler extends PayloadHandler {
  handle(payload: Buffer): void {
    const temp = (payload[0x6] * 100 + payload[0x7]) / 100.0;
    const humidity = (payload[0x8] * 100 + payload[0x9]) / 100.0;
    this.emit("temperature", temp, humidity);
  }
}

export class GetCheckFromDataHandler extends PayloadHandler {
  handle(payload: Buffer): void {
    const data = Buffer.alloc(1, 0);
    payload.copy(data, 0, 0x4);
    if (data[0] !== 0x1) {
      return;
    }
    this.emit("rawRFData", data);
  }
}

export class RmProCheckRFFrequencyFoundHandler extends PayloadHandler {
  handle(payload: Buffer): void {
    const data = Buffer.alloc(1, 0);
    payload.copy(data, 0, 0x4);
    if (data[0] !== 0x1 && !this.rm4Type) {
      return;
    } //Check if Fequency identified
    this.emit("rawRFData2", data);
  }
}

export class RawDataHandler extends PayloadHandler {
  handle(payload: Buffer): void {
    this.emit("rawData", payload);

  }
}

export class GetLearntDataHandler extends PayloadHandler {
  handle(payload: Buffer): void {
    const data = Buffer.alloc(payload.length - 4, 0);
    payload.copy(data, 0, 6);
    this.emit("rawData", data);
  }
}

export const payloadHandlers: Record<number, new(rm4type: string) => PayloadHandler> = {
  [0x1]: Rm3CheckTemperatureHandler,
  [0x4]: GetFromCheckDataHandler,
  [0x9]: Rm4ProCheckRfFrequencyFoundHandler,
  [0xa9]: RawDataHandler,
  [0xb0]: RawDataHandler,
  [0xb1]: RawDataHandler,
  [0xb2]: RawDataHandler,
  [0x26]: RawDataHandler,
  [0xa]: RM3CheckTemperatureHumidityHandler,
  [0x1a]: GetCheckFromDataHandler,
  [0x1b]: RmProCheckRFFrequencyFoundHandler,
  [0x5e]: GetLearntDataHandler
};