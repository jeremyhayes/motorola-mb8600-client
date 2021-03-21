import { HnapClient } from './client.js';

// initialize client instance
const baseUrl = 'https://192.168.100.1';
const ignoreSsl = true;
const client = new HnapClient(baseUrl, ignoreSsl);

// login; must be called first
const username = 'admin';
const password = 'motorola';
await client.login(username, password);

// get software
const software = await client.getSoftware();
console.log(software);

// get startup sequence
const startupSequence = await client.getStartupSequence();
console.log(startupSequence);

// get connection info
const connectionInfo = await client.getConnectionInfo();
console.log(connectionInfo);

// get downstream channel info
const downstreamChannelInfo = await client.getDownstreamChannelInfo();
console.log(downstreamChannelInfo);

// get downstream channel info parsed
const downstreamParsed = await client.getDownstreamChannelInfoParsed();
console.log(downstreamParsed);

// get upstream channel info
const upstreamChannelInfo = await client.getUpstreamChannelInfo();
console.log(upstreamChannelInfo);

// get upstream channel info as data
const upstreamParsed = await client.getUpstreamChannelInfoParsed();
console.log(upstreamParsed);

// get log
const log = await client.getLog();
console.log(log);

// get log parsed
const logParsed = await client.getLogParsed();
console.log(logParsed);

// reboot modem
// const reboot = await client.reboot();
// console.log(reboot);
