import { Device } from "./device";
import { Host } from "../types/host";

export class RFDevice extends Device {
  constructor(host: Host, macAddress: Buffer, deviceType: number, port?: number) {
    super(host, macAddress, deviceType, port);
  }

  enterRFSweep = () => {
    let packet = Buffer.from([0x19]);
    packet = Buffer.concat([this.request_header, packet]);
    this.sendPacket(0x6a, packet);
  };

  checkRFData = () => {
    let packet = Buffer.from([0x1a]);
    packet = Buffer.concat([this.request_header, packet]);
    this.sendPacket(0x6a, packet);
  };

  checkRFData2 = () => {
    let packet = Buffer.from([0x1b]);
    packet = Buffer.concat([this.request_header, packet]);
    this.sendPacket(0x6a, packet);
  };
}