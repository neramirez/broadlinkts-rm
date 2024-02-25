import crypto from "crypto";
import { Logger } from "./logger";

export class PacketHandler {
  private key: Buffer;
  private iv: Buffer;
  private id: Buffer;
  private logger: Logger;

  constructor(logger: Logger) {
    this.key = Buffer.from([0x09, 0x76, 0x28, 0x34, 0x3f, 0xe9, 0x9e, 0x23, 0x76, 0x5c, 0x15, 0x13, 0xac, 0xcf, 0x8b, 0x02]);
    this.iv = Buffer.from([0x56, 0x2e, 0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58]);
    this.id = Buffer.from([0, 0, 0, 0]);
    this.logger = logger;
  }

  public createPacket = (command: number, payload: Buffer, macAddress: Buffer, requestCounter: number, deviceType: number): Buffer => {
    requestCounter = requestCounter & 0xffff;
    const requestId = requestCounter;

    let packet = Buffer.alloc(0x38, 0);

    packet[0x00] = 0x5a;
    packet[0x01] = 0xa5;
    packet[0x02] = 0xaa;
    packet[0x03] = 0x55;
    packet[0x04] = 0x5a;
    packet[0x05] = 0xa5;
    packet[0x06] = 0xaa;
    packet[0x07] = 0x55;
    packet[0x24] = deviceType & 0xff;
    packet[0x25] = deviceType >> 8;
    packet[0x26] = command;
    packet[0x28] = requestId & 0xff;
    packet[0x29] = requestId >> 8;
    packet[0x2a] = macAddress[5];
    packet[0x2b] = macAddress[4];
    packet[0x2c] = macAddress[3];
    packet[0x2d] = macAddress[2];
    packet[0x2e] = macAddress[1];
    packet[0x2f] = macAddress[0];
    packet[0x30] = this.id[0];
    packet[0x31] = this.id[1];
    packet[0x32] = this.id[2];
    packet[0x33] = this.id[3];
    this.logger.info(`(${macAddress.toString("hex")}) Packet ${requestCounter} with ${this.id.toString("hex")} and command:${command.toString(16)}, count:${requestCounter.toString(16)}, and type:${deviceType.toString(16)}`);

    if (payload) {
      this.logger.debug(`(${macAddress.toString("hex")}) Sending command:0x${command.toString(16)} with payload: ${payload.toString("hex")}`);
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
    this.logger.debug(`\x1b[33m[DEBUG]\x1b[0m (${macAddress.toString("hex")}) Packet :${packet.toString("hex")}`);

    const cipher = crypto.createCipheriv("aes-128-cbc", this.key, this.iv);
    payload = cipher.update(payload);
    this.logger.debug(`\x1b[33m[DEBUG]\x1b[0m (${macAddress.toString("hex")}) Payload+cipher:${payload.toString("hex")}`);

    packet = Buffer.concat([packet, payload]);
    this.logger.debug(`\x1b[33m[DEBUG]\x1b[0m (${macAddress.toString("hex")}) Payload+cipher+payload:${packet.toString("hex")}`);

    checksum = 0xbeaf;
    for (let i = 0; i < packet.length; i++) {
      checksum += packet[i];
    }
    checksum = checksum & 0xffff;
    packet[0x20] = checksum & 0xff;
    packet[0x21] = checksum >> 8;
    this.logger.debug(`\x1b[33m[DEBUG]\x1b[0m (${macAddress.toString("hex")}) Packet final:${packet.toString("hex")}`);
    return packet;
  };

  public updateKey = (key: Buffer) => {
    this.key = key;
  };
  public getKey = () => {
    return this.key;
  };

  public setId = (id: Buffer) => {
    this.id = id;
  };

  public getId = () => {
    return this.id;
  };

  public getIv = () => {
    return this.iv;
  };
}