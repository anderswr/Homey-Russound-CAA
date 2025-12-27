CAx6.6 for Homey (Pro 2023)

Because your multiroom audio deserves fewer remotes and less guesswork.

This app controls compatible Russound CA-series amplifiers via ASCII RS-232 over TCP using a
serial-to-network gateway (MOXA NPort, ser2net, or similar). It creates one Controller device
and six Zone devices automatically.

Features
- Turn zones on/off
- Set volume (0–100) and mute
- Select source (1–6)
- Use it in Flows without memorizing serial commands
- "All zones off" action on the Controller device

Requirements
- Russound CA-series with ASCII RS-232 protocol enabled
- RS-232 to TCP gateway (TCP server mode recommended)
- Serial settings: 9600 8N1, no flow control
- Correct RS-232 cabling (TX/RX/GND, and if needed a null-modem adapter depending on your setup)

Compatibility / IMPORTANT
⚠️ Some Russound CAM6.6 units are hardware-locked to the RNET protocol (binary) and will NOT work with this app.
If you see unreadable binary data (“gibberish”) in your terminal when monitoring the RS-232 port, your unit is using RNET.

Quick test
1) Connect to the gateway:
   nc <gateway-ip> <port>
2) Send:
   !Z01ON<ENTER>
If the zone turns on, your unit likely supports ASCII control.
If nothing happens and you only see binary output when using the remote/keypads, your unit is RNET-only.

Notes
- This is not an official Russound product.
- The app may use "optimistic state" for some settings (it assumes the last command was applied).