import { HnapClient } from './client.js';

// initialize client instance
const baseUrl = 'https://192.168.100.1';
const ignoreSsl = true;
const client = new HnapClient(baseUrl, ignoreSsl);

// login; must be called first
const username = 'admin';
const password = 'motorola';
await client.login(username, password);

// get modem software status
const software = await client.getSoftware();
console.log(software);

// get modem connection status
const connection = await client.getConnection();
console.log(connection);

// get modem connection status as data
const connectionData = await client.getConnectionData();
console.log(connectionData);

// get modem event log
const eventLog = await client.getEventLog();
console.log(eventLog);

// get modem event log data
const eventLogData = await client.getEventLogData();
console.log(eventLogData);
