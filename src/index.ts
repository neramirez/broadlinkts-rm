//
// const app = new Broadlink();
//
// (async () => {
// // Call the discover method to start discovering Broadlink devices
//
//   const devices = await app.discover();
//   const device = devices["ec0bae8c43f1"];
//   if (device) {
//     device.authenticate();
//     const hexString = shades.accessories[0].data.open;
//     const buffer = Buffer.from(hexString, "hex");
//
//     device.sendData(buffer);
//     device.on("deviceReady", () => {
//       logger.info("Device is ready");
//     });
//
//   }
//
// })();


// setTimeout(() => {
//   console.log("5 seconds have passed");
// }, 5000);
//
// logger.info(JSON.stringify(Object.keys(app.getDevices())));
// // Listen for when a device is ready
//

//
//
//
//
//
// const server = dgram.createSocket("udp4");
//
// server.on("error", (err: Error) => {
//   console.log(`Server error:\n${err.stack}`);
//   server.close();
// });
//
// server.on("message", (msg: string, rinfo: dgram.RemoteInfo) => {
//   console.log(`Server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
// });
//
// server.on("listening", () => {
//   const address = server.address();
//   console.log(`Server listening ${address.address}:${address.port}`);
// });
//
// server.bind(41234);
//
// let macAddressBuffer = Buffer.from("ec:0b:ae:8c:43:f1".split(":").map(byte => parseInt(byte, 16)));
// const device = new RFDevice({ port: 80, address: "10.55.1.140" }, macAddressBuffer, 0x2227);
// device.authenticate();
//
// shades.accessories.forEach((shade) => {
//   const { data } = shade;
//   if (data) {
//     const closeDataBuffer = Buffer.from(data.open, "hex");
//     device.sendData(closeDataBuffer);
//   }
// });
import { RFDevice } from "./device/rfdevice";
import { shades } from "./shades_old";
import { logger } from "./logger";

const device = new RFDevice({ port: 80, address: "10.55.1.140" }, Buffer.from("ec0bae8c43f1", "hex"), 0x2227);

(async () => {
  const authres = await device.authenticate();
  // await device.sendData(Buffer.from(shades.accessories[0].data.close, "hex"));
  //
  //
  // await device.sendData(Buffer.from(shades.accessories[1].data.close, "hex"));
  //
  //
  // await device.sendData(Buffer.from(shades.accessories[0].data.open, "hex"));
  //
  //
  // await device.sendData(Buffer.from(shades.accessories[1].data.open, "hex"));

  device.sendData(Buffer.from(shades.accessories[1].data.open, "hex"));
  device.sendData(Buffer.from(shades.accessories[0].data.open, "hex"));
  device.sendData(Buffer.from(shades.accessories[1].data.close, "hex"));
  device.sendData(Buffer.from(shades.accessories[0].data.close, "hex"));
  device.sendData(Buffer.from(shades.accessories[1].data.open, "hex"));
  device.sendData(Buffer.from(shades.accessories[0].data.open, "hex"));
  device.sendData(Buffer.from(shades.accessories[1].data.close, "hex"));
  device.sendData(Buffer.from(shades.accessories[0].data.close, "hex"));
  logger.info("All done");
})();

