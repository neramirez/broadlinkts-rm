"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const broadlink_1 = require("./broadlink");
const app = new broadlink_1.Broadlink();
// Call the discover method to start discovering Broadlink devices
app.discover();
