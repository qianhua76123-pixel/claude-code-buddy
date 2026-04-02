---
name: pet-sync
description: "Sync your AI pet to ESP32 hardware via MCP Bridge. Connects Claude Code pet to physical device for display, TTS voice, and real-time interaction."
user-invocable: true
---

# Pet Hardware Sync

Sync the AI pet from Claude Code to a physical ESP32 device via the MCP Bridge Server.

## Prerequisites

The MCP Bridge Server must be running and configured in Claude Code's MCP settings. The ESP32 device must be connected to the same network and running the ai-pet firmware.

## Commands

### `/pet-sync` (no args) - Check sync status
Show whether the MCP Bridge is connected and the ESP32 device status.

### `/pet-sync connect` - Connect to hardware
1. Check if MCP Bridge server is configured
2. Call `pet_status` MCP tool to verify connection
3. Push current pet state to hardware
4. Confirm sync is active

### `/pet-sync speak [text]` - Make pet speak on hardware
1. Read pet state for personality context
2. If no text provided, generate a contextual greeting based on pet personality
3. Call `pet_speak` MCP tool with the text
4. ESP32 will play TTS audio of the text

### `/pet-sync emotion [type]` - Set pet emotion on hardware display
Types: happy, sad, angry, sleepy, excited, love, confused, sick
1. Call `pet_emotion` MCP tool
2. ESP32 updates LCD display to show corresponding pixel animation

### `/pet-sync push` - Push full state to hardware
Send complete pet state (stats, appearance, evolution) to ESP32 for display.

### `/pet-sync disconnect` - Disconnect from hardware
Cleanly disconnect from the ESP32 device.

## MCP Tools Used

This skill uses the following MCP tools from the `ai-pet-bridge` server:

- `pet_status()` - Get hardware device status
- `pet_speak(text: string)` - Play TTS on ESP32 speaker
- `pet_emotion(emotion: string)` - Update pet display emotion
- `pet_push_state(state: object)` - Push full pet state to hardware
- `pet_animate(animation: string)` - Trigger animation on LCD
- `pet_listen()` - Start listening on ESP32 microphone, returns transcribed text

## Interaction Flow

When the user wants to talk to their pet through hardware:

1. User: `/pet-sync speak hello little friend`
2. Skill reads pet state, applies personality
3. Calls `pet_speak` with the text
4. ESP32 plays the TTS audio
5. Optionally calls `pet_emotion("happy")` to update display
6. Updates pet state (happiness +5 for interaction)
7. Saves state

## Error Handling

- If MCP Bridge not configured: show setup instructions
- If ESP32 not connected: show troubleshooting steps (check WiFi, check firmware)
- If command fails: retry once, then show error with diagnostics

## Setup Instructions (shown when not configured)

```
To connect your pet to ESP32 hardware:

1. Start the MCP Bridge Server:
   cd ai-pet/mcp-bridge && npm start

2. Add to your Claude Code MCP config (~/.claude/settings.json):
   {
     "mcpServers": {
       "ai-pet-bridge": {
         "command": "node",
         "args": ["path/to/ai-pet/mcp-bridge/server.js"]
       }
     }
   }

3. Make sure your ESP32 is powered on and connected to WiFi

4. Run: /pet-sync connect
```
