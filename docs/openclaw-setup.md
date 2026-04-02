# OpenClaw Integration Guide

Connect your AI Pet to OpenClaw (小龙虾) for autonomous task execution.

## Prerequisites

- OpenClaw installed: `npm install -g openclaw@latest`
- Node 24+ (or Node 22.16+)
- AI Pet MCP Bridge (this project)

## Quick Setup (3 steps)

### Step 1: Install OpenClaw

```bash
npm install -g openclaw@latest
openclaw onboard      # Follow the setup wizard
```

### Step 2: Add AI Pet as MCP Server

```bash
# Option A: CLI (easiest)
openclaw mcp add ai-pet -- node /path/to/ai-pet/mcp-bridge/server.js

# Option B: Edit openclaw.json manually
```

In your OpenClaw config, add:
```json
{
  "mcpServers": {
    "ai-pet": {
      "command": "node",
      "args": ["/absolute/path/to/ai-pet/mcp-bridge/server.js"]
    }
  }
}
```

### Step 3: Test

```bash
# In OpenClaw chat:
> 让宠物说"你好世界"
> 添加一个每小时提醒喝水的任务
> 查看宠物状态
```

## Available MCP Tools

Once connected, OpenClaw can use these tools:

| Tool | Description |
|------|-------------|
| `pet_status` | Check ESP32 connection and task count |
| `pet_speak` | Play TTS on speaker |
| `pet_emotion` | Change LCD display emotion |
| `pet_animate` | Trigger animation |
| `pet_push_state` | Sync full pet state |
| `pet_listen` | Record from microphone |
| `pet_add_task` | Create autonomous task (cron/once/counter) |
| `pet_list_tasks` | List all tasks |
| `pet_remove_task` | Remove a task |
| `pet_clear_done` | Clear completed tasks |
| `pet_increment_counter` | Increment event counter |

## Autonomous Task Examples

### Via OpenClaw chat:

```
你: 帮我设置这些自动任务：
    1. 每小时提醒喝水
    2. 每天早上8点播报天气
    3. 每写100行代码提醒休息
    4. 晚上11点说晚安

OpenClaw: 好的，我来创建4个自主任务...
    [调用 pet_add_task x4]
    任务已创建！ESP32会自动执行这些任务。
```

### Via Claude Code:

```
/pet-sync task add 每小时提醒喝水
/pet-sync task add 明早9点叫我起床
/pet-sync task list
```

## Architecture

```
OpenClaw / Claude Code
    │
    │ MCP Protocol (stdio)
    ▼
MCP Bridge Server (Node.js)
    ├─ Stores tasks in ~/.claude/ai-pet-tasks.json
    ├─ 30s tick: checks cron/once/counter tasks
    ├─ Executes due tasks → sends to ESP32
    │
    │ WebSocket (port 8765)
    ▼
ESP32 Hardware
    ├─ Receives task commands
    ├─ Plays TTS / shows emotion / animates
    ├─ Also runs its own local task scheduler
    └─ Reports completion back to Bridge
```

## Dual-Access: Claude Code + OpenClaw

Both can control the pet simultaneously:
- Claude Code via `~/.claude/settings.json` mcpServers
- OpenClaw via its own MCP config

They share the same MCP Bridge process, so tasks created by either one are visible to both and executed by the same engine.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "ESP32 not connected" | Check ESP32 WiFi, verify WS_PORT (8765) |
| OpenClaw can't find tools | Restart OpenClaw after adding MCP config |
| Tasks not executing | Check MCP Bridge is running (`npm start` in mcp-bridge/) |
| Cron not firing | Verify cron expression format (5 fields: min hour dom mon dow) |
