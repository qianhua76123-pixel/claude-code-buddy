---
name: pet-sync
description: "Sync AI pet to ESP32 hardware, manage autonomous tasks, one-command OpenClaw connection. Hardware features are in the hardware/ folder and NOT installed by default."
user-invocable: true
---

# Pet Sync - Hardware & Autonomous Tasks

Hardware features live in `hardware/` and are NOT installed with the core plugin. Users opt-in when ready.

## Commands

### `/pet-sync` - Check status
Read `~/.claude/ai-pet-state.json` for `hardwareSynced`. Show:
- If hardware NOT set up: show quick setup instructions
- If hardware connected: show connection status via `pet_status` MCP tool

### `/pet-sync setup` - One-command hardware setup
Run the setup script:
```bash
bash /path/to/claude-code-buddy/hardware/setup.sh
```
This installs MCP Bridge dependencies, configures the MCP server in settings.json, and optionally connects OpenClaw.

### `/pet-sync openclaw` - One-command OpenClaw connection

**This is the zero-friction path.** Run:
```bash
node /path/to/claude-code-buddy/hardware/connect-openclaw.js
```

The script automatically:
1. Checks if OpenClaw is installed (if not: shows `npm install -g openclaw@latest`)
2. Installs MCP Bridge dependencies if needed
3. Registers `ai-pet` as an OpenClaw MCP server
4. Verifies the connection

After this, users can talk to their pet through OpenClaw:
```
OpenClaw> 让宠物每小时提醒我喝水
OpenClaw> 设置明早9点叫我起床
OpenClaw> 让宠物说"你好世界"
```

### `/pet-sync connect` - Connect to hardware
Calls `pet_status` MCP tool. If connected, pushes state with `pet_push_state`.

### `/pet-sync speak [text]` - Make pet speak
Calls `pet_speak` MCP tool. If no text, generate one based on pet personality + SNARK level.

### `/pet-sync emotion [type]` - Set display emotion
Types: happy, sad, angry, sleepy, excited, love, confused, sick, neutral

### `/pet-sync push` - Push full state to hardware

## Autonomous Tasks

### `/pet-sync task add [natural language]` - Add task

Parse natural language into a structured task. Be smart about parsing:

| User says | Parsed as |
|-----------|-----------|
| "每小时提醒喝水" | cron: "0 * * * *", speak: "该喝水啦~" |
| "每半小时提醒一次" | cron: "*/30 * * * *" |
| "每天早上8点报天气" | cron: "0 8 * * *", action: weather |
| "明早9点叫我" | once: tomorrow 09:00 |
| "30分钟后提醒" | once: now + 30min |
| "每写50行代码休息" | counter: 50, event: code_write |
| "每天晚上11点说晚安" | cron: "0 23 * * *", speak: "晚安~" |
| "工作日早上9点提醒开会" | cron: "0 9 * * 1-5" |

Call `pet_add_task` MCP tool with parsed parameters.

### `/pet-sync task list` - Show all tasks
Call `pet_list_tasks`, format as table.

### `/pet-sync task remove [id]` - Remove task
### `/pet-sync task clear` - Clear done tasks

## Hardware Not Installed Message

When hardware features are needed but not set up, show:

```
Hardware extension not installed yet.

Quick setup (2 minutes):
  bash hardware/setup.sh

Or just OpenClaw:
  node hardware/connect-openclaw.js

Hardware is optional - the core pet game
works perfectly without it!
```

## Important Rules
1. Never assume hardware is available - always check first
2. Natural language → task parsing is the key UX feature
3. Don't expose cron syntax to users - parse it for them
4. Show clear feedback after every task operation
5. hardware/ folder stuff is OPT-IN only
