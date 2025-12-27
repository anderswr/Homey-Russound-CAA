'use strict';

const Homey = require('homey');
const registry = require('../../lib/clientRegistry');

class RussoundDevice extends Homey.Device {

  async onInit() {
    this.log('Russound device init', this.getData());

    await this._ensureCapabilities();

    this.client = registry.getClient(this);
    if (!this.client) {
      this.error('Missing gateway settings (host/port)');
      return;
    }

    // Only controller initiates TCP connect
    if (this.zone === 0) {
      try {
        await this.client.connect();
      } catch (err) {
        this.error('TCP connect failed', err);
      }

      this.registerCapabilityListener('all_off', async (value) => {
        if (!value) return true;
        if (!this.client) throw new Error('Not connected');
        this.client.sendAllOff();
        return true;
      });

      return;
    }

    // Zones 1..6
    this.registerCapabilityListener('zone_off', async (value) => {
      if (!value) return true;
      if (!this.client) throw new Error('Not connected');

      this.client.setPower(this.zone, false);
      await this.setCapabilityValue('onoff', false).catch(() => {});
      return true;
    });

    this.registerCapabilityListener('onoff', async (value) => {
      if (!this.client) throw new Error('Not connected');
      this.client.setPower(this.zone, value);
      return true;
    });

    this.registerCapabilityListener('volume_set', async (value) => {
      if (!this.client) throw new Error('Not connected');
      const vol = Math.max(0, Math.min(100, Math.round(value * 100)));
      this.client.setVolume(this.zone, vol);
      return true;
    });

    this.registerCapabilityListener('volume_mute', async (value) => {
      if (!this.client) throw new Error('Not connected');
      this.client.setMute(this.zone, value);
      return true;
    });

    this.registerCapabilityListener('source', async (value) => {
      if (!this.client) throw new Error('Not connected');
      this.client.setSource(this.zone, Number(value));
      return true;
    });
  }

  async onSettings({ changedKeys }) {
    if (changedKeys.includes('host') || changedKeys.includes('port')) {
      this.client = registry.getClient(this);
      if (!this.client) return;

      if (this.zone === 0) {
        try {
          await this.client.connect();
        } catch (err) {
          this.error('TCP reconnect failed', err);
        }
      }
    }
  }

  get zone() {
    return Number(this.getData().zone);
  }

  async _ensureCapabilities() {
    const wantControllerCaps = ['all_off'];

    const wantZoneCaps = [
      'zone_off',
      'onoff',
      'volume_set',
      'volume_mute',
      'source'
    ];

    const want = this.zone === 0 ? wantControllerCaps : wantZoneCaps;

    for (const cap of this.getCapabilities()) {
      if (!want.includes(cap)) {
        await this.removeCapability(cap).catch(this.error);
      }
    }

    for (const cap of want) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(this.error);
      }
    }
  }
}

module.exports = RussoundDevice;