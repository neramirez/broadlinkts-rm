import { logger } from "../logger";
import winston from "winston";
import { Host } from "../types/host";
import { rm4DeviceTypes, rm4PlusDeviceTypes, rmDeviceTypes, rmPlusDeviceTypes } from "../device.types";
import dgram from "dgram";
import crypto from "crypto";
import { payloadHandlers } from "../types/payload.handler";

export class Device {
  protected request_header: Buffer;
  private logger: winston.Logger;
  private host: Host;
  private macAddress: Buffer;
  private deviceType: number;
  private port: number | undefined;
  private model: string;
  private rm4Type: string;
  private code_sending_header: Buffer;
  private requestCounter: number;
  private key: Buffer;
  private iv: Buffer;
  private socket: dgram.Socket;
  private id: Buffer;
  private isSending: boolean;
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
    this.isSending = false;
    this.logger.info(`${host.address} ${host.port} Device: ${macAddress.toString("hex")} - ${deviceType}`);
    this.host = host;
    this.macAddress = macAddress;
    this.deviceType = deviceType;
    this.port = port;
    this.model = rmDeviceTypes[(deviceType)] || rmPlusDeviceTypes[(deviceType)] || rm4DeviceTypes[(deviceType)] || rm4PlusDeviceTypes[(deviceType)];

    //Use different headers for rm4 devices
    this.rm4Type = (rm4DeviceTypes[(deviceType)] || rm4PlusDeviceTypes[deviceType]);
    this.request_header = this.rm4Type ? Buffer.from([0x04, 0x00]) : Buffer.from([]);
    this.code_sending_header = this.rm4Type ? Buffer.from([0xda, 0x00]) : Buffer.from([]);
    //except 5f36 and 6508 ¯\_(ツ)_/¯
    if (deviceType === parseInt(`0x5f36`) || deviceType === parseInt(`0x6508`)) {
      this.code_sending_header = Buffer.from([0xd0, 0x00]);
      this.request_header = Buffer.from([0x04, 0x00]);
    }

    this.requestCounter = 4123;
    this.key = Buffer.from([0x09, 0x76, 0x28, 0x34, 0x3f, 0xe9, 0x9e, 0x23, 0x76, 0x5c, 0x15, 0x13, 0xac, 0xcf, 0x8b, 0x02]);
    this.iv = Buffer.from([0x56, 0x2e, 0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58]);
    this.id = Buffer.from([0, 0, 0, 0]);

    this.socket = this.setupSocket();
    this.socket.on("message", this.handleMessage.bind(this));


  }

  deviceReady = (message: Buffer) => {
    this.logger.debug(`(${this.macAddress.toString("hex")}) Device Ready: Message: ${message}`);
  };

  handleMessage = (response: Buffer) => {
    if (response.length < 0x39) return;
    const requestId = response.readUInt16LE(0x28);

    const encryptedPayload = Buffer.alloc(response.length - 0x38, 0);
    response.copy(encryptedPayload, 0, 0x38);

    const err = response[0x22] | (response[0x23] << 8);
    if (err != 0) return;

    const decipher = crypto.createDecipheriv("aes-128-cbc", this.key, this.iv);
    decipher.setAutoPadding(false);

    let payload = decipher.update(encryptedPayload);
    const { resolve, reject, timeout } = this.promises[requestId];
    clearTimeout(timeout);
    delete this.promises[requestId];
    const p2 = decipher.final();
    if (p2) payload = Buffer.concat([payload, p2]);

    if (!payload) reject();

    this.logger.info(`Response received: ${requestId}`);

    const command = response[0x26];
    if (command == 0xe9) {
      this.key = Buffer.alloc(0x10, 0);
      payload.copy(this.key, 0, 0x04, 0x14);

      const id = Buffer.alloc(0x04, 0);
      payload.copy(id, 0, 0x00, 0x04);
      this.id = id;
      resolve(payload);
      //this.emit("deviceReady");
    } else if (command == 0xee || command == 0xef) {
      const payloadHex = payload.toString("hex");
      const requestHeaderHex = this.request_header.toString("hex");

      const indexOfHeader = payloadHex.indexOf(requestHeaderHex);

      if (indexOfHeader > -1) {
        payload = payload.subarray(indexOfHeader + this.request_header.length, payload.length);
      }
      this.onPayloadReceived(err, payload);
      resolve(payload);
    } else if (command == 0x72) {
      this.logger.info("Command Acknowledged");
    } else {
      this.logger.info("Unhandled Command: ", command);
    }
  };

  // Create a UDP socket to receive messages from the broadlink device.
  setupSocket = (): dgram.Socket => {
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    socket.on("listening", () => {
      socket.setBroadcast(true);

      const address = socket.address();
      this.logger.debug(`Socket is listening on ${address.address}:${address.port}`);
    });
    socket.on("error", (err) => {
      this.logger.error(`Error in UDP socket: ${err}`);
    });
    return socket.bind();
  };

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

    return this.sendPacket(0x65, payload);
  };

  sendPacket = async (command: number, payload: Buffer) => {
    return await new Promise<Buffer>((resolve: (value: Buffer) => void, reject: (reason: any) => void) => {
      this.requestCounter = (this.requestCounter + 1) & 0xffff;
      const requestId = this.requestCounter;

      let packet = Buffer.alloc(0x38, 0);

      packet[0x00] = 0x5a;
      packet[0x01] = 0xa5;
      packet[0x02] = 0xaa;
      packet[0x03] = 0x55;
      packet[0x04] = 0x5a;
      packet[0x05] = 0xa5;
      packet[0x06] = 0xaa;
      packet[0x07] = 0x55;
      packet[0x24] = this.deviceType & 0xff;
      packet[0x25] = this.deviceType >> 8;
      packet[0x26] = command;
      packet[0x28] = requestId & 0xff;
      packet[0x29] = requestId >> 8;
      packet[0x2a] = this.macAddress[5];
      packet[0x2b] = this.macAddress[4];
      packet[0x2c] = this.macAddress[3];
      packet[0x2d] = this.macAddress[2];
      packet[0x2e] = this.macAddress[1];
      packet[0x2f] = this.macAddress[0];
      packet[0x30] = this.id[0];
      packet[0x31] = this.id[1];
      packet[0x32] = this.id[2];
      packet[0x33] = this.id[3];
      this.logger.info(`(${this.macAddress.toString("hex")}) Packet ${this.requestCounter} with ${this.id.toString("hex")} and command:${command.toString(16)}, count:${this.requestCounter.toString(16)}, and type:${this.deviceType.toString(16)} and id:${this.id.toString("hex")}`);

      if (payload) {
        this.logger.debug(`(${this.macAddress.toString("hex")}) Sending command:0x${command.toString(16)} with payload: ${payload.toString("hex")}`);
        const padPayload = Buffer.alloc(16 - payload.length % 16, 0);
        payload = Buffer.concat([payload, padPayload]);
      }

      let checksum = 0xbeaf;
      for (let i = 0; i < payload.length; i++) {
        checksum += payload[i];
      }
      checksum = checksum & 0xffff;

      packet[0x34] = checksum & 0xff;
      packet[0x35] = checksum >> 8;
      this.logger.debug(`\x1b[33m[DEBUG]\x1b[0m (${this.macAddress.toString("hex")}) Packet :${packet.toString("hex")}`);

      const cipher = crypto.createCipheriv("aes-128-cbc", this.key, this.iv);
      payload = cipher.update(payload);
      this.logger.debug(`\x1b[33m[DEBUG]\x1b[0m (${this.macAddress.toString("hex")}) Payload+cipher:${payload.toString("hex")}`);

      packet = Buffer.concat([packet, payload]);
      this.logger.debug(`\x1b[33m[DEBUG]\x1b[0m (${this.macAddress.toString("hex")}) Payload+cipher+payload:${packet.toString("hex")}`);

      checksum = 0xbeaf;
      for (let i = 0; i < packet.length; i++) {
        checksum += packet[i];
      }
      checksum = checksum & 0xffff;
      packet[0x20] = checksum & 0xff;
      packet[0x21] = checksum >> 8;
      this.logger.debug(`\x1b[33m[DEBUG]\x1b[0m (${this.macAddress.toString("hex")}) Packet final:${packet.toString("hex")}`);

      const timeout = setTimeout(() => {
        reject(new Error(`Timeout: handleMessage for ${requestId} was not called within the specified time.`));
        delete this.promises[this.requestCounter]; // remove the promise as it's no longer needed
      }, 5000); // 5000 milliseconds = 5 seconds
      this.promises[this.requestCounter] = { resolve, reject, timeout };

      this.socket.send(packet, 0, packet.length, this.host.port, this.host.address, (err, _bytes) => {
        if (err) {
          this.logger.debug("send packet error", err);
        } else {
          this.logger.debug(`Packet sent to ${this.host.address}:${this.host.port} with command 0x${command.toString(16)}`);
          this.logger.debug(`MAC Address: ${this.macAddress.toString("hex")}`);
          this.logger.debug(`Payload: ${payload.toString("hex")}`);
        }
      });
    });

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

  // Externally Accessed Methods

  checkData = () => {
    let packet = Buffer.from([0x04]);
    packet = Buffer.concat([this.request_header, packet]);
    this.sendPacket(0x6a, packet);
  };

  sendData = (data: Buffer): Promise<Buffer> => {
    let packet = Buffer.from([0x02, 0x00, 0x00, 0x00]);
    packet = Buffer.concat([this.code_sending_header, packet, data]);
    return this.sendPacket(0x6a, packet);
  };

  enterLearning = () => {
    let packet = Buffer.from([0x03]);
    packet = Buffer.concat([this.request_header, packet]);
    this.sendPacket(0x6a, packet);
  };

  checkTemperature = () => {
    let packet = (rm4DeviceTypes[(this.deviceType)] || rm4PlusDeviceTypes[(this.deviceType)]) ? Buffer.from([0x24]) : Buffer.from([0x1]);
    packet = Buffer.concat([this.request_header, packet]);
    this.sendPacket(0x6a, packet);
  };

  checkHumidity = () => {
    let packet = (rm4DeviceTypes[(this.deviceType)] || rm4PlusDeviceTypes[(this.deviceType)]) ? Buffer.from([0x24]) : Buffer.from([0x1]);
    packet = Buffer.concat([this.request_header, packet]);
    this.sendPacket(0x6a, packet);
  };

  cancelLearn = () => {
    let packet = Buffer.from([0x1e]);
    packet = Buffer.concat([this.request_header, packet]);
    this.sendPacket(0x6a, packet);
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

}