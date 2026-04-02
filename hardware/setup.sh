#!/bin/bash
# AI Pet Hardware Extension Setup
# Run this ONLY when you have hardware or want OpenClaw integration
# This is separate from the core plugin install (install.sh)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BRIDGE_DIR="$SCRIPT_DIR/mcp-bridge"
CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

echo "=== AI Pet Hardware Extension ==="
echo ""
echo "This sets up:"
echo "  1. MCP Bridge Server (Claude Code ↔ ESP32)"
echo "  2. OpenClaw integration (optional)"
echo "  3. ESP32 firmware build tools (optional)"
echo ""

# ── Step 1: MCP Bridge ──

echo "[1/3] Setting up MCP Bridge..."

if ! command -v node &>/dev/null; then
  echo "  ERROR: Node.js not found. Install Node 22+ first."
  exit 1
fi

cd "$BRIDGE_DIR"
npm install --silent 2>/dev/null
echo "  Dependencies installed."

# Get absolute path for MCP config
BRIDGE_SCRIPT="$BRIDGE_DIR/server.js"
# Normalize for cross-platform
BRIDGE_SCRIPT=$(cd "$(dirname "$BRIDGE_SCRIPT")" && pwd)/$(basename "$BRIDGE_SCRIPT")

# Add MCP server to Claude Code settings
if [ -f "$SETTINGS_FILE" ]; then
  if grep -q "ai-pet-bridge" "$SETTINGS_FILE" 2>/dev/null; then
    echo "  MCP server already configured in settings.json"
  else
    echo "  Add this to your ~/.claude/settings.json under \"mcpServers\":"
    echo ""
    echo "    \"ai-pet-bridge\": {"
    echo "      \"command\": \"node\","
    echo "      \"args\": [\"$BRIDGE_SCRIPT\"]"
    echo "    }"
    echo ""
  fi
fi

echo "  To start manually: cd hardware/mcp-bridge && npm start"
echo ""

# ── Step 2: OpenClaw ──

echo "[2/3] OpenClaw integration..."

if command -v openclaw &>/dev/null; then
  echo "  OpenClaw detected! Adding AI Pet MCP server..."
  openclaw mcp add ai-pet -- node "$BRIDGE_SCRIPT" 2>/dev/null && \
    echo "  Done! AI Pet is now available in OpenClaw." || \
    echo "  Auto-add failed. Add manually: openclaw mcp add ai-pet -- node \"$BRIDGE_SCRIPT\""
else
  echo "  OpenClaw not installed (optional)."
  echo "  To install: npm install -g openclaw@latest && openclaw onboard"
  echo "  Then re-run this script to auto-connect."
fi
echo ""

# ── Step 3: ESP32 Firmware ──

echo "[3/3] ESP32 firmware..."

if command -v pio &>/dev/null; then
  echo "  PlatformIO detected! You can build firmware:"
  echo "    cd hardware/esp32-firmware && pio run -t upload"
else
  echo "  PlatformIO not installed (needed for ESP32 only)."
  echo "  Install: pip install platformio"
  echo "  Or use Arduino IDE with the .cpp files in hardware/esp32-firmware/src/"
fi

echo ""
echo "=== Hardware Setup Complete ==="
echo ""
echo "Quick start:"
echo "  1. Start bridge:  cd hardware/mcp-bridge && npm start"
echo "  2. In Claude Code: /pet-sync connect"
echo "  3. Add tasks:      /pet-sync task add 每小时提醒喝水"
echo ""
echo "ESP32 hardware:"
echo "  1. Flash firmware: cd hardware/esp32-firmware && pio run -t upload"
echo "  2. Connect to WiFi (captive portal: 'AI-Pet-Setup')"
echo "  3. Device auto-connects to MCP Bridge on port 8765"
echo ""
