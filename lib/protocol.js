'use strict';

// NOTE:
// These command IDs are based on common Russound ASCII control patterns.
// Power/source/mute/volume are commonly seen as below.
// Tone/Loudness and Query commands MUST be verified against CAM6.6 docs or real logs.
//
// Safe default: if a CMD_* is null, command builder returns '' (no-op).

const CMD_POWER = 1;
const CMD_MUTE = 2;
const CMD_SOURCE = 4;
const CMD_VOLUME = 5;

// TODO: verify/enable for CAM6.6
const CMD_BASS = null;
const CMD_TREBLE = null;
const CMD_BALANCE = null;
const CMD_LOUDNESS = null;

// TODO: verify query/status request command(s)
const CMD_QUERY_ZONE = null;

function clampInt(n, min, max) {
  const x = Math.round(Number(n));
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function build(zone, value, cmdId) {
  if (cmdId === null || cmdId === undefined) return '';
  return `!${zone},${value},${cmdId}\r`;
}

// Parse lines like:
// !<zone>,<value>,<cmd>
// #<zone>,<value>,<cmd>
// Some gateways may also deliver extra whitespace or multiple lines per chunk.
function parseLine(line) {
  const trimmed = String(line).trim();
  if (!trimmed) return null;

  const m = trimmed.match(/^[!#]\s*(\d+)\s*,\s*(-?\d+)\s*,\s*(\d+)\s*$/);
  if (!m) return null;

  const zone = Number(m[1]);
  const value = Number(m[2]);
  const cmd = Number(m[3]);

  if (Number.isNaN(zone) || Number.isNaN(value) || Number.isNaN(cmd)) return null;

  return { zone, value, cmd, raw: trimmed };
}

module.exports = {
  // Commands
  power(zone, on) { return build(zone, on ? 1 : 0, CMD_POWER); },

  volume(zone, value0to100) {
    const v = clampInt(value0to100, 0, 100);
    return build(zone, v, CMD_VOLUME);
  },

  mute(zone, on) { return build(zone, on ? 1 : 0, CMD_MUTE); },

  source(zone, src1to6) {
    const s = clampInt(src1to6, 1, 6);
    return build(zone, s, CMD_SOURCE);
  },

  allOff() { return build(0, 0, CMD_POWER); },

  bass(zone, bassMinus10to10) {
    const b = clampInt(bassMinus10to10, -10, 10);
    return build(zone, b, CMD_BASS);
  },

  treble(zone, trebleMinus10to10) {
    const t = clampInt(trebleMinus10to10, -10, 10);
    return build(zone, t, CMD_TREBLE);
  },

  balance(zone, balanceMinus10to10) {
    const bal = clampInt(balanceMinus10to10, -10, 10);
    return build(zone, bal, CMD_BALANCE);
  },

  loudness(zone, on) { return build(zone, on ? 1 : 0, CMD_LOUDNESS); },

  queryZone(zone) {
    // Placeholder until verified. Returns '' by default.
    return build(zone, 0, CMD_QUERY_ZONE);
  },

  // Parser -> updates controllerDevice via helper
  parse(dataChunk, controllerDevice) {
    const text = String(dataChunk);
    const lines = text.split(/\r?\n|\r/g);

    for (const line of lines) {
      const evt = parseLine(line);
      if (!evt) continue;

      controllerDevice.log('RECV_EVT:', evt.raw);

      // Dispatch based on cmd id we know
      // We assume zone 1..6. Ignore zone 0 in event updates.
      if (evt.zone < 1 || evt.zone > 6) continue;

      switch (evt.cmd) {
        case CMD_POWER:
          controllerDevice.updateZoneState(evt.zone, 'onoff', evt.value === 1);
          break;

        case CMD_MUTE:
          controllerDevice.updateZoneState(evt.zone, 'volume_mute', evt.value === 1);
          break;

        case CMD_SOURCE:
          controllerDevice.updateZoneState(evt.zone, 'source', String(clampInt(evt.value, 1, 6)));
          break;

        case CMD_VOLUME: {
          const v = clampInt(evt.value, 0, 100);
          controllerDevice.updateZoneState(evt.zone, 'volume_set', v / 100);
          break;
        }

        // Tone/Loudness: only update if enabled cmd ids are set
        default: {
          if (CMD_BASS !== null && evt.cmd === CMD_BASS) {
            controllerDevice.updateZoneState(evt.zone, 'bass', clampInt(evt.value, -10, 10));
          } else if (CMD_TREBLE !== null && evt.cmd === CMD_TREBLE) {
            controllerDevice.updateZoneState(evt.zone, 'treble', clampInt(evt.value, -10, 10));
          } else if (CMD_BALANCE !== null && evt.cmd === CMD_BALANCE) {
            controllerDevice.updateZoneState(evt.zone, 'balance', clampInt(evt.value, -10, 10));
          } else if (CMD_LOUDNESS !== null && evt.cmd === CMD_LOUDNESS) {
            controllerDevice.updateZoneState(evt.zone, 'loudness', evt.value === 1);
          }
          break;
        }
      }
    }
  }
};