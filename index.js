import { HnapClient } from './client.js';

// initialize client instance
const baseUrl = 'https://192.168.100.1';
const ignoreSsl = true;
const client = new HnapClient(baseUrl, ignoreSsl);

// login; must be called first
const username = 'admin';
const password = 'motorola';
await client.login(username, password);

// get modem status
const status = await client.getStatus();
console.log(status);
