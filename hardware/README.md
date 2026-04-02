# Hardware Extension

This folder contains everything for the physical pet device. It is **NOT installed** by the core `install.sh` - you opt-in when ready.

## Quick Start

```bash
# One-command setup (installs deps + configures MCP + auto-detects OpenClaw)
bash hardware/setup.sh

# Or just connect OpenClaw
node hardware/connect-openclaw.js
```

## What's Inside

```
hardware/
├── setup.sh              # One-command hardware setup
├── connect-openclaw.js   # Zero-config OpenClaw connector
├── mcp-bridge/           # MCP Bridge Server
│   ├── package.json      # Node.js dependencies
│   └── server.js         # MCP Server + WebSocket + Task Engine
├── esp32-firmware/       # ESP32 device firmware
│   ├── platformio.ini    # Build config
│   └── src/
│       ├── main.cpp      # Display + WiFi + WebSocket + TTS
│       └── pixel_arts.h  # Pixel art frame data
└── docs/
    └── openclaw-setup.md # Detailed OpenClaw guide
```

## Hardware Shopping List (~300 RMB)

Recommended: **Waveshare ESP32-S3 1.85" Round LCD Speaker Edition**

| Item | Price |
|------|-------|
| ESP32-S3 Round LCD + Speaker + Mic (all-in-one) | ~180 |
| 3D printed case | ~50-80 |
| Li-Po battery 3.7V 1000mAh | ~15 |
| **Total** | **~250-275** |

Search Taobao: "Waveshare ESP32-S3 1.85寸 圆形屏 音箱版"

**WiFi is built-in** - ESP32-S3 has WiFi + Bluetooth, no extra modules needed.

## Connection Flow

```
After setup.sh:

Claude Code ──MCP──> MCP Bridge ──WebSocket──> ESP32
                         │
OpenClaw ──MCP──────────┘
                         │
                    Task Engine (30s tick)
                    └─> Autonomous execution
```
