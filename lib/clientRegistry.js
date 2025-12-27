'use strict';

const TcpClient = require('./tcpClient');

class ClientRegistry {
  constructor() {
    this._clients = new Map(); // key = host:port
  }

  getClient(device) {
    const { host, port } = device.getSettings();
    if (!host || !port) return null;

    const key = `${host}:${port}`;
    if (!this._clients.has(key)) {
      this._clients.set(key, new TcpClient(device));
    }
    return this._clients.get(key);
  }
}

module.exports = new ClientRegistry();