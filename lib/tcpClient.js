'use strict';

const net = require('net');
const Protocol = require('./protocol');

class TcpClient {
  constructor(controllerDevice) {
    this.device = controllerDevice;

    this.socket = null;
    this.isConnected = false;

    this._reconnectTimer = null;
    this._reconnectAttempt = 0;

    this._queue = [];
    this._draining = false;
  }

  async connect() {
    const { host, port } = this.device.getSettings();

    if (!host || !port) {
      this.device.log('TCP connect skipped: host/port missing');
      return;
    }

    // clear reconnect timer
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      this.socket.setKeepAlive(true);

      this.socket.on('connect', () => {
        this.isConnected = true;
        this._reconnectAttempt = 0;
        this.device.log('TCP connected');
        resolve(true);
        this._drainQueue().catch(() => {});
      });

      this.socket.on('error', (err) => {
        this.isConnected = false;
        reject(err);
      });

      this.socket.on('close', () => {
        const wasConnected = this.isConnected;
        this.isConnected = false;

        if (this.socket) {
          this.socket.destroy();
          this.socket = null;
        }

        // Avoid log spam: only log disconnect when it was actually connected
        if (wasConnected) this.device.log('TCP disconnected');

        this._scheduleReconnect();
      });

      this.socket.connect(Number(port), host);
    });
  }

  disconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._reconnectAttempt = 0;

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.isConnected = false;
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) return;

    const delays = [1000, 2000, 5000, 10000, 30000];
    const delay = delays[Math.min(this._reconnectAttempt, delays.length - 1)];
    this._reconnectAttempt += 1;

    // Reduce log spam: log only the first reconnect scheduling message
    if (this._reconnectAttempt === 1) {
      this.device.log(`Scheduling reconnect in ${delay}ms`);
    }

    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      try {
        await this.connect();
      } catch (err) {
        // Keep one error log line, but avoid endless chatter elsewhere
        this.device.error('Reconnect failed', err);
        this._scheduleReconnect();
      }
    }, delay);
  }

  send(cmd) {
    if (!cmd || typeof cmd !== 'string' || cmd.trim().length === 0) return;

    this._queue.push(cmd);
    this._drainQueue().catch(() => {});
  }

  async _drainQueue() {
    if (this._draining) return;
    if (!this.socket || !this.isConnected) return;

    this._draining = true;
    try {
      while (this._queue.length && this.socket && this.isConnected) {
        const cmd = this._queue.shift();
        const payload = `${cmd}\r`; // ASCII protocol expects CR
        this.socket.write(payload, 'ascii');
        await new Promise((r) => setTimeout(r, 40)); // be nice to old serial gear
      }
    } finally {
      this._draining = false;
    }
  }

  // Commands (ASCII)
  setPower(zone, on) { this.send(Protocol.power(zone, on)); }
  setMute(zone, on) { this.send(Protocol.mute(zone, on)); }
  setSource(zone, src) { this.send(Protocol.source(zone, src)); }
  setVolume(zone, vol0to100) { this.send(Protocol.volume(zone, vol0to100)); }

  allOff() { this.send(Protocol.allOff()); }
}

module.exports = TcpClient;