import { Broadlink } from "./broadlink";


const app = new Broadlink();

// Call the discover method to start discovering Broadlink devices
app.discover();

process.exit();
//

//
// const device = new Device({ port: 80, address: "10.55.1.162" }, Buffer.from("ec0baea07a2f", "hex"), 0x21011);
// device.authenticate();
//
// shades.accessories.forEach((shade) => {
//   logger.info(JSON.stringify(shade));
//   const { data } = shade;
//   if (data) {
//     const closeDataBuffer = Buffer.from(data.close, "hex");
//     device.sendData(closeDataBuffer);
//   }
//
// });