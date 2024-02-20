import { Device } from "./device";
import { Host } from "../types/host";

export class RFDevice extends Device {
  constructor(host: Host, macAddress: Buffer, deviceType: number, port?: number) {
    super(host, macAddress, deviceType, port);
  }

  enterRFSweep = () => {
    let packet = Buffer.from([0x19]);
    packet = Buffer.concat([this.request_header, packet]);
    const packetToSend = this.packetHandler.createPacket(0x6a, packet, this.macAddress, this.id, this.requestCounter, this.deviceType);
    return this.sendPacket(0x6a, packetToSend, this.requestCounter);
  };

  checkRFData = () => {
    let packet = Buffer.from([0x1a]);
    packet = Buffer.concat([this.request_header, packet]);
    const packetToSend = this.packetHandler.createPacket(0x6a, packet, this.macAddress, this.id, this.requestCounter, this.deviceType);
    return this.sendPacket(0x6a, packetToSend, this.requestCounter);

  };

  checkRFData2 = () => {
    let packet = Buffer.from([0x1b]);
    packet = Buffer.concat([this.request_header, packet]);
    const packetToSend = this.packetHandler.createPacket(0x6a, packet, this.macAddress, this.id, this.requestCounter, this.deviceType);
    return this.sendPacket(0x6a, packetToSend, this.requestCounter);
  };
}