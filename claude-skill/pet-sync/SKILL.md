---
name: pet-sync
description: "Sync AI pet to ESP32 hardware, manage autonomous tasks (cron/one-time/counter), and let the pet do things independently after conversation ends. Also supports OpenClaw integration."
user-invocable: true
---

# Pet Hardware Sync & Autonomous Task Manager

## Commands

### `/pet-sync` - Check sync status
Show hardware connection and active task count.

### `/pet-sync connect` - Connect to hardware
Call `pet_status` MCP tool. If connected, push state with `pet_push_state`.

### `/pet-sync speak [text]` - Make pet speak
Call `pet_speak` MCP tool. If no text, generate one based on pet personality.

### `/pet-sync emotion [type]` - Set display emotion
Types: happy, sad, angry, sleepy, excited, love, confused, sick, neutral

### `/pet-sync push` - Push full state to hardware

## Autonomous Tasks

### `/pet-sync task add [description]` - Add autonomous task from natural language

Parse user's natural language into a structured task. Examples:

User: "每小时提醒我喝水"
→ Call `pet_add_task` with:
  - id: "drink_water"
  - type: "cron"
  - cron: "0 * * * *"
  - action: "speak"
  - payload: "该喝水啦~ 休息一下眼睛吧！"

User: "明早9点叫我起床"
→ Call `pet_add_task` with:
  - id: "morning_alarm"
  - type: "once"
  - fireAt: "2026-04-03T09:00:00"
  - action: "speak"
  - payload: "早上好！新的一天开始啦！"

User: "每写50行代码提醒我休息"
→ Call `pet_add_task` with:
  - id: "code_break"
  - type: "counter"
  - threshold: 50
  - triggerEvent: "code_write"
  - action: "speak"
  - payload: "写了50行了，站起来活动活动！"

User: "每天早上播放开心动画"
→ Call `pet_add_task` with:
  - id: "morning_dance"
  - type: "cron"
  - cron: "0 8 * * *"
  - action: "animate"
  - payload: "dance"

### `/pet-sync task list` - List all tasks
Call `pet_list_tasks`, display in formatted table:

```
 ── Autonomous Tasks ─────────────────────────────────
 [ACTIVE] drink_water (cron: every hour)
          → speak: "该喝水啦~"

 [ACTIVE] morning_alarm (once: 2026-04-03 09:00)
          → speak: "早上好！"

 [ACTIVE] code_break (counter: 12/50 code_write)
          → speak: "写了50行了，休息一下！"

 [DONE]   test_task (once: 2026-04-02 15:00)
          → speak: "测试完成"
 ─────────────────────────────────────────────────────
 Total: 4 tasks (3 active, 1 done)
```

### `/pet-sync task remove [id]` - Remove a task
Call `pet_remove_task` with the task ID.

### `/pet-sync task clear` - Clear completed tasks
Call `pet_clear_done`.

### `/pet-sync disconnect` - Disconnect

## OpenClaw Integration

### How to connect via OpenClaw

If the user has OpenClaw installed, they can add our MCP Bridge as an OpenClaw MCP server:

**Option 1: OpenClaw config file**
```json
{
  "mcpServers": {
    "ai-pet": {
      "command": "node",
      "args": ["/path/to/ai-pet/mcp-bridge/server.js"]
    }
  }
}
```

**Option 2: OpenClaw CLI**
```bash
openclaw mcp add ai-pet -- node /path/to/ai-pet/mcp-bridge/server.js
```

Once connected, OpenClaw can use all pet tools (speak, emotion, animate, add_task, etc.) just like Claude Code does. The autonomous task engine runs in the MCP Bridge process - it works regardless of whether Claude Code or OpenClaw initiated the tasks.

### `/pet-sync openclaw` - Show OpenClaw setup instructions

## Task Flow Architecture

```
User says: "每半小时提醒我喝水，睡前说晚安"
    │
    ▼
Claude/OpenClaw parses into 2 tasks:
    ├─ pet_add_task(id:"drink", type:"cron", cron:"*/30 * * * *", action:"speak", payload:"喝水~")
    └─ pet_add_task(id:"goodnight", type:"cron", cron:"0 23 * * *", action:"speak", payload:"晚安~")
    │
    ▼
MCP Bridge stores tasks in ~/.claude/ai-pet-tasks.json
MCP Bridge pushes task queue to ESP32 via WebSocket
    │
    ▼
ESP32 runs independently:
    ├─ 30s tick loop checks cron schedule
    ├─ Due task → play TTS / show emotion / animate
    └─ Reports completion back to Bridge
    │
    ▼
User is NOT in Claude Code / OpenClaw
Pet is doing its own thing autonomously!
```

## Important
- Natural language → structured task parsing is the KEY feature. Don't ask users to write cron expressions - parse them yourself.
- Always confirm the parsed task before creating it.
- Show a summary of what was created after adding tasks.
- MCP tools used: pet_add_task, pet_list_tasks, pet_remove_task, pet_clear_done, pet_increment_counter
