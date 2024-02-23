import { logger } from "../logger";
import winston from "winston";
import { Host } from "../types/host";
import { rm4DeviceTypes, rm4PlusDeviceTypes } from "../device.types";
import { payloadHandlers } from "../types/payload.handler";
import { PacketHandler } from "../packet.handler";
import { SocketHandler } from "../socket.handler";

export class BroadLinkDevice {
  protected request_header: Buffer;
  protected macAddress: Buffer;
  protected deviceType: number;
  protected packetHandler: PacketHandler;
  protected socketHandler: SocketHandler;
  protected requestCounter: number;
  private logger: winston.Logger;
  private host: Host;

  private rm4Type: string;
  private code_sending_header: Buffer;

  private readonly promises: {
    [key: number]: {
      resolve: (value: Buffer) => void, reject: (reason?: any) => void, timeout: NodeJS.Timeout
    }
  };
  private isProcessing: boolean;
  private queue: Buffer[];

  constructor(host: Host, macAddress: Buffer, deviceType: number, port?: number) {
    this.isProcessing = false;
    this.queue = [];
    this.logger = logger;
    this.promises = {};
    this.host = host;
    this.macAddress = macAddress;
    this.deviceType = deviceType;
    this.requestCounter = 4444;

    this.rm4Type = (rm4DeviceTypes[(deviceType)] || rm4PlusDeviceTypes[deviceType]);
    this.request_header = this.rm4Type ? Buffer.from([0x04, 0x00]) : Buffer.from([]);
    this.code_sending_header = this.rm4Type ? Buffer.from([0xda, 0x00]) : Buffer.from([]);
    //except 5f36 and 6508 ¯\_(ツ)_/¯
    if (deviceType === parseInt(`0x5f36`) || deviceType === parseInt(`0x6508`)) {
      this.code_sending_header = Buffer.from([0xd0, 0x00]);
      this.request_header = Buffer.from([0x04, 0x00]);
    }

    this.packetHandler = new PacketHandler(this.logger);
    this.socketHandler = new SocketHandler(this.logger, this.host, this.macAddress, this.deviceType, this.packetHandler);
  }


  authenticate = async () => {
    const payload = Buffer.alloc(0x50, 0);
    //This device id
    payload[0x04] = 0x31;
    payload[0x05] = 0x31;
    payload[0x06] = 0x31;
    payload[0x07] = 0x31;
    payload[0x08] = 0x31;
    payload[0x09] = 0x31;
    payload[0x0a] = 0x31;
    payload[0x0b] = 0x31;
    payload[0x0c] = 0x31;
    payload[0x0d] = 0x31;
    payload[0x0e] = 0x31;
    payload[0x0f] = 0x31;
    payload[0x10] = 0x31;
    payload[0x11] = 0x31;
    payload[0x12] = 0x31;

    payload[0x1e] = 0x01;
    payload[0x2d] = 0x01;
    payload[0x30] = "T".charCodeAt(0);
    payload[0x31] = "e".charCodeAt(0);
    payload[0x32] = "s".charCodeAt(0);
    payload[0x33] = "t".charCodeAt(0);
    payload[0x34] = " ".charCodeAt(0);
    payload[0x35] = " ".charCodeAt(0);
    payload[0x36] = "1".charCodeAt(0);

    return this.dispatchCommandAndIncrementCounter(0x65, payload);
  };

  onPayloadReceived = (_err: number, payload: Buffer) => {
    this.logger.debug(`(${this.macAddress.toString("hex")}) Payload received:${payload.toString("hex")}`);
    const param = payload[0];

    const PayloadHandlerClass = payloadHandlers[param];
    if (PayloadHandlerClass) {
      const handlerInstance = new PayloadHandlerClass(this.rm4Type);
      handlerInstance.handle(payload);
    }
  };

  checkData = () => {
    let packet = Buffer.from([0x04]);
    packet = Buffer.concat([this.request_header, packet]);
    return this.dispatchCommandAndIncrementCounter(0x65, packet);
  };

  // Externally Accessed Methods

  sendData = (data: Buffer): Promise<Buffer> => {
    let packet = Buffer.from([0x02, 0x00, 0x00, 0x00]);
    packet = Buffer.concat([this.code_sending_header, packet, data]);
    return this.dispatchCommandAndIncrementCounter(0x6a, packet);

  };

  enterLearning = () => {
    let packet = Buffer.from([0x03]);
    packet = Buffer.concat([this.request_header, packet]);
    return this.dispatchCommandAndIncrementCounter(0x6a, packet);

  };

  checkTemperature = () => {
    let packet = (rm4DeviceTypes[(this.deviceType)] || rm4PlusDeviceTypes[(this.deviceType)]) ? Buffer.from([0x24]) : Buffer.from([0x1]);
    packet = Buffer.concat([this.request_header, packet]);
    return this.dispatchCommandAndIncrementCounter(0x6a, packet);
  };

  checkHumidity = () => {
    let packet = (rm4DeviceTypes[(this.deviceType)] || rm4PlusDeviceTypes[(this.deviceType)]) ? Buffer.from([0x24]) : Buffer.from([0x1]);
    packet = Buffer.concat([this.request_header, packet]);
    return this.dispatchCommandAndIncrementCounter(0x6a, packet);
  };

  cancelLearn = () => {
    let packet = Buffer.from([0x1e]);
    packet = Buffer.concat([this.request_header, packet]);
    return this.dispatchCommandAndIncrementCounter(0x6a, packet);
  };

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

  public toJSON() {
    return {
      host: this.host,
      macAddress: this.macAddress,
      deviceType: this.deviceType,
      requestCounter: this.requestCounter,
      rm4Type: this.rm4Type,
      isProcessing: this.isProcessing,
      queue: this.queue
    };
  }

  protected dispatchCommandAndIncrementCounter(command: number, payload: Buffer) {
    const packet = this.packetHandler.createPacket(command, payload, this.macAddress, this.requestCounter, this.deviceType);
    const responsePromise = this.socketHandler.sendPacket(command, packet, this.requestCounter);
    this.requestCounter++;
    return responsePromise;
  }

}