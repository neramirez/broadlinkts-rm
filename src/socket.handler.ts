import dgram from "dgram";
import winston from "winston";
import { Host } from "./types/host";
import crypto from "crypto";
import { PacketHandler } from "./packet.handler";
import { rm4DeviceTypes, rm4PlusDeviceTypes } from "./device.types";
import { payloadHandlers } from "./types/payload.handler";

export class SocketHandler {
  private logger: winston.Logger;
  private host: Host;
  private socket: dgram.Socket;
  private macAddress: Buffer;
  // private requestCounter: number;
  private packetHandler: PacketHandler;
  private rm4Type: string;
  private request_header: Buffer;
  private code_sending_header: Buffer;
  private promises: {
    [key: number]: {
      startTime: bigint,
      resolve: (value: Buffer) => void,
      reject: (reason: any) => void,
      timeout: NodeJS.Timeout
    }
  };


  constructor(logger: winston.Logger, host: Host, macAddress: Buffer, deviceType: number, packetHandler: PacketHandler) {
    this.logger = logger;
    this.host = host;
    this.socket = this.setupSocket();
    this.macAddress = macAddress;
    // this.requestCounter = 0;
    this.promises = {};
    this.packetHandler = packetHandler;
    this.socket.on("message", this.handleMessage.bind(this));
    this.rm4Type = (rm4DeviceTypes[(deviceType)] || rm4PlusDeviceTypes[deviceType]);
    this.request_header = this.rm4Type ? Buffer.from([0x04, 0x00]) : Buffer.from([]);
    this.code_sending_header = this.rm4Type ? Buffer.from([0xda, 0x00]) : Buffer.from([]);
    //except 5f36 and 6508 ¯\_(ツ)_/¯
    if (deviceType === parseInt(`0x5f36`) || deviceType === parseInt(`0x6508`)) {
      this.code_sending_header = Buffer.from([0xd0, 0x00]);
      this.request_header = Buffer.from([0x04, 0x00]);
    }
  }

  handleMessage = (response: Buffer) => {
    if (response.length < 0x39) return;
    const requestId = response.readUInt16LE(0x28);

    const encryptedPayload = Buffer.alloc(response.length - 0x38, 0);
    response.copy(encryptedPayload, 0, 0x38);

    const err = response[0x22] | (response[0x23] << 8);
    if (err != 0) return;

    const decipher = crypto.createDecipheriv("aes-128-cbc", this.packetHandler.getKey(), this.packetHandler.getIv());
    decipher.setAutoPadding(false);

    let payload = decipher.update(encryptedPayload);
    const { resolve, reject, timeout, startTime } = this.promises[requestId];
    clearTimeout(timeout);
    delete this.promises[requestId];

    // Calculate the time difference
    const endTime = process.hrtime.bigint();
    const timeDiff = Number(endTime - startTime) / 1e6; // convert to milliseconds

    this.logger.info(`Response received: ${requestId}, Time taken: ${timeDiff} ms`);


    const p2 = decipher.final();
    if (p2) payload = Buffer.concat([payload, p2]);

    if (!payload) reject("No Payload");

    this.logger.info(`Response received: ${requestId}`);

    const command = response[0x26];
    if (command == 0xe9) {
      this.packetHandler.updateKey(Buffer.alloc(0x10, 0));
      payload.copy(this.packetHandler.getKey(), 0, 0x04, 0x14);

      const id = Buffer.alloc(0x04, 0);
      payload.copy(id, 0, 0x00, 0x04);
      this.packetHandler.setId(id);
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

  sendPacket = async (command: number, packet: Buffer, requestId: number) => {
    return await new Promise<Buffer>((resolve: (value: Buffer) => void, reject: (reason: any) => void) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout: handleMessage for ${requestId} was not called within the specified time.`));
        delete this.promises[requestId]; // remove the promise as it's no longer needed
      }, 5000); // 5000 milliseconds = 5 seconds
      const startTime = process.hrtime.bigint();

      this.promises[requestId] = { startTime, resolve, reject, timeout };

      this.socket.send(packet, 0, packet.length, this.host.port, this.host.address, (err, _bytes) => {
        if (err) {
          this.logger.debug("send packet error", err);
        } else {
          this.logger.debug(`Packet sent to ${this.host.address}:${this.host.port} with command 0x${command.toString(16)}`);
          this.logger.debug(`MAC Address: ${this.macAddress.toString("hex")}`);
          this.logger.debug(`Payload: ${packet.toString("hex")}`);
        }
      });
    });

  };

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

  onPayloadReceived = (_err: number, payload: Buffer) => {
    this.logger.debug(`(${this.macAddress.toString("hex")}) Payload received:${payload.toString("hex")}`);
    const param = payload[0];

    const PayloadHandlerClass = payloadHandlers[param];
    if (PayloadHandlerClass) {
      const handlerInstance = new PayloadHandlerClass(this.rm4Type);
      handlerInstance.handle(payload);
    }
  };
}