import { logger } from "../logger";
import winston from "winston";
import { Host } from "../types/host";
import EventEmitter from "events";
import { rm4DeviceTypes, rm4PlusDeviceTypes, rmDeviceTypes, rmPlusDeviceTypes } from "../device.types";
import dgram from "dgram";
import crypto from "crypto";
import { payloadHandlers } from "../types/payload.handler";

export class Device extends EventEmitter {
  protected request_header: Buffer;
  private logger: winston.Logger;
  private host: Host;
  private macAddress: Buffer;
  private deviceType: number;
  private port: number | undefined;
  private model: string;
  private rm4Type: string;
  private code_sending_header: Buffer;
  private count: number;
  private key: Buffer;
  private iv: Buffer;
  private socket: dgram.Socket;
  private id: Buffer;


  constructor(host: Host, macAddress: Buffer, deviceType: number, port?: number) {
    super();
    this.logger = logger;

    this.logger.info(`${host.address} ${host.port} Device: ${macAddress.toString("hex")} - ${deviceType.toString(16)}`);
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

    this.count = Math.random() & 0xffff;
    this.key = Buffer.from([0x09, 0x76, 0x28, 0x34, 0x3f, 0xe9, 0x9e, 0x23, 0x76, 0x5c, 0x15, 0x13, 0xac, 0xcf, 0x8b, 0x02]);
    this.iv = Buffer.from([0x56, 0x2e, 0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58]);
    this.id = Buffer.from([0, 0, 0, 0]);

    this.socket = this.setupSocket();
    this.on("deviceReady", this.deviceReady.bind(this));


  }

  deviceReady = () => {
    this.logger.debug(`(${this.macAddress.toString("hex")}) Device Ready`);
  };

  // Create a UDP socket to receive messages from the broadlink device.
  setupSocket = (): dgram.Socket => {
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

    socket.on("message", (response) => {
      if (response.length < 0x39) return;
      const encryptedPayload = Buffer.alloc(response.length - 0x38, 0);
      response.copy(encryptedPayload, 0, 0x38);

      const err = response[0x22] | (response[0x23] << 8);
      if (err != 0) return;

      const decipher = crypto.createDecipheriv("aes-128-cbc", this.key, this.iv);
      decipher.setAutoPadding(false);

      let payload = decipher.update(encryptedPayload);

      const p2 = decipher.final();
      if (p2) payload = Buffer.concat([payload, p2]);

      if (!payload) return false;

      this.logger.debug("Response received: ", response.toString("hex"));

      const command = response[0x26];
      if (command == 0xe9) {
        this.key = Buffer.alloc(0x10, 0);
        payload.copy(this.key, 0, 0x04, 0x14);

        const id = Buffer.alloc(0x04, 0);
        payload.copy(id, 0, 0x00, 0x04);
        this.id = id;

        this.emit("deviceReady");
      } else if (command == 0xee || command == 0xef) {
        const payloadHex = payload.toString("hex");
        const requestHeaderHex = this.request_header.toString("hex");

        const indexOfHeader = payloadHex.indexOf(requestHeaderHex);

        if (indexOfHeader > -1) {
          payload = payload.subarray(indexOfHeader + this.request_header.length, payload.length);
        }
        this.onPayloadReceived(err, payload);
      } else if (command == 0x72) {
        this.logger.info("Command Acknowledged");
      } else {
        this.logger.info("Unhandled Command: ", command);
      }
    });

    socket.bind();
    return socket;

  };

  authenticate = () => {
    const payload = Buffer.alloc(0x50, 0);

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

    this.sendPacket(0x65, payload);
  };

  sendPacket = (command: any, payload: any) => {
    const { socket } = this;
    this.count = (this.count + 1) & 0xffff;

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
    packet[0x28] = this.count & 0xff;
    packet[0x29] = this.count >> 8;
    packet[0x2a] = this.macAddress[2];
    packet[0x2b] = this.macAddress[1];
    packet[0x2c] = this.macAddress[0];
    packet[0x2d] = this.macAddress[3];
    packet[0x2e] = this.macAddress[4];
    packet[0x2f] = this.macAddress[5];
    packet[0x30] = this.id[0];
    packet[0x31] = this.id[1];
    packet[0x32] = this.id[2];
    packet[0x33] = this.id[3];

    if (payload) {
      this.logger.debug(`(${this.macAddress.toString("hex")}) Sending command:${command.toString(16)} with payload: ${payload.toString("hex")}`);
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

    const cipher = crypto.createCipheriv("aes-128-cbc", this.key, this.iv);
    payload = cipher.update(payload);

    packet = Buffer.concat([packet, payload]);

    checksum = 0xbeaf;
    for (let i = 0; i < packet.length; i++) {
      checksum += packet[i];
    }
    checksum = checksum & 0xffff;
    packet[0x20] = checksum & 0xff;
    packet[0x21] = checksum >> 8;

    socket.send(packet, 0, packet.length, this.host.port, this.host.address, (err, _bytes) => {
      if (err) {
        this.logger.debug("send packet error", err);
      }
    });
  };

  onPayloadReceived = (_err: number, payload: Buffer) => {
    this.logger.debug(`(${this.macAddress.toString("hex")}) Payload received:${payload.toString("hex")}`);
    const param = payload[0];

    this.logger.debug(`(${this.macAddress.toString("hex")}) Payload received:${payload.toString("hex")}`);

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

  sendData = (data: Buffer) => {
    let packet = Buffer.from([0x02, 0x00, 0x00, 0x00]);
    packet = Buffer.concat([this.code_sending_header, packet, data]);
    this.sendPacket(0x6a, packet);
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


}