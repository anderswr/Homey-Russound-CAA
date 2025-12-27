'use strict';

const Homey = require('homey');

class RussoundApp extends Homey.App {

  async onInit() {
    this.log('CAx6.6 app started');

    /**
     * Helper: get device from args for device cards.
     * Homey usually injects args.device for device flow cards.
     */
    const getDeviceFromArgs = (args) => {
      const device = args?.device;
      if (!device) {
        throw new Error('Missing device context. Remove and re-add the Flow card, then try again.');
      }
      return device;
    };

    // Flow: All zones off (use Controller device, zone=0)
    this.homey.flow
      .getActionCard('all_zones_off')
      .registerRunListener(async (args) => {
        const device = getDeviceFromArgs(args);

        const zone = Number(device.getData()?.zone);
        if (zone !== 0) {
          throw new Error('Please select the Russound Controller device');
        }

        if (!device.client) throw new Error('Gateway not configured');

        device.client.sendAllOff();
        return true;
      });

    // Flow: Zone power (state = on/off)
    this.homey.flow
      .getActionCard('set_zone_power')
      .registerRunListener(async (args) => {
        const device = getDeviceFromArgs(args);
        const on = args.state === 'on';

        const zone = Number(device.getData()?.zone);
        if (!zone || zone < 1 || zone > 6) {
          throw new Error('Please select a Russound Zone device');
        }

        if (!device.client) throw new Error('Gateway not configured');

        device.client.setPower(zone, on);

        // Update UI optimistically
        await device.setCapabilityValue('onoff', on).catch(() => {});
        return true;
      });

    // Flow: Zone volume (0..100)
    this.homey.flow
      .getActionCard('set_zone_volume')
      .registerRunListener(async (args) => {
        const device = getDeviceFromArgs(args);
        const volume = Number(args.volume);

        if (!Number.isFinite(volume)) throw new Error('Invalid volume');

        const zone = Number(device.getData()?.zone);
        if (!zone || zone < 1 || zone > 6) {
          throw new Error('Please select a Russound Zone device');
        }

        const vol = Math.max(0, Math.min(100, Math.round(volume)));

        if (!device.client) throw new Error('Gateway not configured');

        device.client.setVolume(zone, vol);

        // Homey capability volume_set is 0..1
        await device.setCapabilityValue('volume_set', vol / 100).catch(() => {});
        return true;
      });

    // Flow: Zone source (1..6)
    this.homey.flow
      .getActionCard('set_zone_source')
      .registerRunListener(async (args) => {
        const device = getDeviceFromArgs(args);
        const source = Number(args.source);

        if (!Number.isFinite(source)) throw new Error('Invalid source');

        const zone = Number(device.getData()?.zone);
        if (!zone || zone < 1 || zone > 6) {
          throw new Error('Please select a Russound Zone device');
        }

        const src = Math.max(1, Math.min(6, Math.round(source)));

        if (!device.client) throw new Error('Gateway not configured');

        device.client.setSource(zone, src);

        // source capability is enum string ("1".."6")
        await device.setCapabilityValue('source', String(src)).catch(() => {});
        return true;
      });
  }
}

module.exports = RussoundApp;