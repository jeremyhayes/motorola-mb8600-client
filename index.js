import { HnapClient } from './client.js';

// initialize client instance
const client = new HnapClient();

// login; must be called first
const username = 'admin';
const password = 'motorola';
await client.login(username, password);

// get modem status
const status = await client.getStatus();
console.log(status);
