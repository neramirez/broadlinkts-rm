import EventEmitter from "events";
import dgram, { Socket } from "dgram";
import os, { NetworkInterfaceInfo } from "os";
import { Logger } from "winston";
import { Host } from "./types/host";
import assert from "assert";
import {
  rm4DeviceTypes,
  rm4PlusDeviceTypes,
  rmDeviceTypes,
  rmPlusDeviceTypes,
  unsupportedDeviceTypes
} from "./device.types";
import { logger } from "./logger";
import { RFDevice } from "./device/rfdevice";
import { BroadLinkDevice } from "./device/broadLinkDevice";

export class Broadlink extends EventEmitter {
  public devices: NodeJS.Dict<BroadLinkDevice>;
  private sockets: dgram.Socket[];
  private logger: Logger;

  constructor() {
    super();

    this.devices = {};
    this.sockets = [];
    this.logger = logger;
  }

  discover = async (): Promise<NodeJS.Dict<BroadLinkDevice>> => {
    // Close existing sockets
    this.sockets.forEach((socket) => {
      socket.close();
    });

    this.sockets = [];

    // Open a UDP socket on each network interface/IP address
    const ipAddresses = this.getIPAddresses();

    ipAddresses.forEach((ipAddress) => {
      const socket: dgram.Socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
      this.sockets.push(socket);

      socket.on("listening", this.onListening.bind(this, socket, ipAddress));
      socket.on("message", this.onMessage.bind(this));
      socket.on("error", (err) => {
        this.logger.error(`Error in UDP socket: ${err}`);
      });
      socket.bind(0, ipAddress);
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.devices);
      }, 10000);
    });
  };

  getIPAddresses = () => {
    const interfaces = os.networkInterfaces();
    const ipAddresses: string[] = [];

    Object.keys(interfaces).forEach((interfaceID: string) => {
      const currentInterface: NetworkInterfaceInfo[] | undefined =
        interfaces[interfaceID];
      if (currentInterface) {
        currentInterface.forEach((address: NetworkInterfaceInfo) => {
          if (address.family === "IPv4" && !address.internal) {
            ipAddresses.push(address.address);
          }
        });
      }
    });

    return ipAddresses;
  };

  onListening = (socket: Socket, ipAddress: string) => {
    // Broadcast a multicast UDP message to let Broadlink devices know we're listening
    socket.setBroadcast(true);

    const splitIPAddress = ipAddress.split(".");
    const port = socket.address().port;
    this.logger.info(
      `Listening for Broadlink devices on ${ipAddress}:${port} (UDP)`
    );

    const now = new Date();

    const timezone = now.getTimezoneOffset() / -3600;
    const packet = Buffer.alloc(0x30, 0);

    const year = now.getFullYear();

    if (timezone < 0) {
      packet[0x08] = 0xff + timezone - 1;
      packet[0x09] = 0xff;
      packet[0x0a] = 0xff;
      packet[0x0b] = 0xff;
    } else {
      packet[0x08] = timezone;
      packet[0x09] = 0;
      packet[0x0a] = 0;
      packet[0x0b] = 0;
    }

    packet[0x0c] = year & 0xff;
    packet[0x0d] = year >> 8;
    packet[0x0e] = now.getMinutes();
    packet[0x0f] = now.getHours();

    packet[0x10] = year % 100;
    packet[0x11] = now.getDay();
    packet[0x12] = now.getDate();
    packet[0x13] = now.getMonth();
    packet[0x18] = parseInt(splitIPAddress[0]);
    packet[0x19] = parseInt(splitIPAddress[1]);
    packet[0x1a] = parseInt(splitIPAddress[2]);
    packet[0x1b] = parseInt(splitIPAddress[3]);
    packet[0x1c] = port & 0xff;
    packet[0x1d] = port >> 8;
    packet[0x26] = 6;

    let checksum = 0xbeaf;

    for (let i = 0; i < packet.length; i++) {
      checksum += packet[i];
    }

    checksum = checksum & 0xffff;
    packet[0x20] = checksum & 0xff;
    packet[0x21] = checksum >> 8;

    socket.send(packet, 0, packet.length, 80, "255.255.255.255");
  };

  onMessage = (message: Buffer, host: Host) => {
    this.logger.info(`Received a message from ${host.address}:${host.port} to broadcast message`);
    // Broadlink device has responded
    const macAddress = Buffer.alloc(6, 0);

    message.copy(macAddress, 0x00, 0x3f);
    message.copy(macAddress, 0x01, 0x3e);
    message.copy(macAddress, 0x02, 0x3d);
    message.copy(macAddress, 0x03, 0x3c);
    message.copy(macAddress, 0x04, 0x3b);
    message.copy(macAddress, 0x05, 0x3a);

    // Ignore if we already know about this device
    const key = macAddress.toString("hex");
    if (this.devices[key]) return;

    const deviceType = message[0x34] | (message[0x35] << 8);

    // Create a Device instance
    this.addDevice(host, macAddress, deviceType);
  };

  addDevice = (host: Host, macAddressBuffer: Buffer, deviceType: number) => {
    const macAddress: string = macAddressBuffer.toString("hex");
    this.logger.info(
      `Discovered Broadlink device at ${host.address} (${macAddress}) with device type ${deviceType}`
    );
    //Ignore if we already know about this device
    if (this.devices[macAddress]) return;

    const isHostObjectValid =
      typeof host === "object" &&
      (host.port || host.port === 0) &&
      host.address;

    assert(
      isHostObjectValid,
      `createDevice: host should be an object e.g. { address: '192.168.1.32', port: 80 }`
    );
    assert(macAddress, `createDevice: A unique macAddress should be provided`);
    assert(
      deviceType,
      `createDevice: A deviceType from the rmDeviceTypes, rm4DeviceTypes, rm4PlusDeviceTypes, or rmPlusDeviceTypes list should be provided`
    );


    // Ignore devices that don't support infrared or RF.
    if (unsupportedDeviceTypes[deviceType]) return null;
    if (deviceType >= 0x7530 && deviceType <= 0x7918) return null; // OEM branded SPMini2

    // If we don't know anything about the device we ask the user to provide details so that
    // we can handle it correctly.
    const isKnownDevice =
      rmDeviceTypes[deviceType] ||
      rmPlusDeviceTypes[deviceType] ||
      rm4DeviceTypes[deviceType] ||
      rm4PlusDeviceTypes[deviceType];

    if (!isKnownDevice) {
      this.logger.error(
        `We've discovered an unknown Broadlink device code (code: "${deviceType.toString(16)}"):"${host.address}".\n`
      );

      return null;
    }

    // Dynamically add relevant RF methods if the device supports it
    const isRFSupported = rmPlusDeviceTypes[(deviceType)] || rm4PlusDeviceTypes[(deviceType)];
    if (isRFSupported) {
      this.logger.info(`Adding RF Support to device ${macAddress.toString()} with type ${deviceType}`);
      this.devices[macAddress] = new RFDevice(host, macAddressBuffer, deviceType);
    } else {
      // The Broadlink device is something we can use.
      this.devices[macAddress] = new BroadLinkDevice(host, macAddressBuffer, deviceType);
    }

    const device = this.devices[macAddress];
    if (device) {
      // Authenticate the device and let others know when it's ready.
      device.authenticate();
    }

  };

  getDevices = () => {
    return this.devices;
  };
}
