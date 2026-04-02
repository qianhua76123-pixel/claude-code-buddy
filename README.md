# AI Pet - Give Your Claude Code Buddy a Physical Body!

> An open-source project that extends Claude Code's Buddy into a full electronic pet:
> nurture it in terminal, sync to ESP32 hardware, let it talk, and watch your coding habits shape its personality.

[English](#overview) | [中文](#中文说明)

---

<a name="overview"></a>

## Overview

AI Pet bridges **virtual** and **physical** by connecting Claude Code's Buddy pet system to real hardware.

```
┌─ Claude Code Terminal ───────────────┐
│                                      │
│  /pet         - Nurture your pet     │    ┌─ ESP32 Hardware ──────┐
│  /pet quest   - Daily quests         │    │  LCD: Pet animation  │
│  /pet adventure - Dungeon crawl      │    │  Speaker: TTS voice  │
│  /pet-pixel   - Pixel art           │    │  Mic: Voice input    │
│  /pet-sync    - Sync to hardware ───┼───>│  (optional, opt-in)  │
│                                      │    └──────────────────────┘
│  /pet card    - Publish profile  ────┼───>┌─ GitHub (free) ──────┐
│  /pet friend  - Add friends      ────┼───>│  Gist: Pet cards     │
│  /pet battle  - PvP combat!      ────┼───>│  Issues: Battles     │
│  /pet rank    - Leaderboard      ────┼───>│  Zero-cost backend   │
│                                      │    └──────────────────────┘
└──────────────────────────────────────┘
```

## How It Works: The Integration Loop

### 1. Buddy Sync (Identity Layer)

AI Pet reads your Claude Code Buddy's data to establish the pet's identity:

| Buddy Data | AI Pet Usage |
|------------|-------------|
| Species (cat, dragon, blob...) | Pet's visual appearance + pixel art |
| Name | Pet's name throughout the system |
| Rarity (common → legendary) | XP multiplier, evolution speed |
| Core Stats (DEBUG/PATIENCE/CHAOS/WISDOM/SNARK) | Personality traits, dialogue style |

**File:** `~/.claude/pets/` (SQLite, read by hook on session start)

If Buddy isn't activated yet, AI Pet works standalone with manual species/name selection.

### 2. Real Activity Tracking (Growth Layer)

Your actual Claude Code usage drives pet growth. No fake grinding - your real coding IS the game.

**File:** `~/.claude/stats-cache.json` (read by hooks)

| Your Real Activity | Pet Effect |
|-------------------|------------|
| Writing code (Edit/Write tools) | Happiness +2, XP +3, Bond +1 |
| Heavy session (>50 messages/day) | Energy drain, but big XP bonus |
| Multi-day streak | Bond +5/day, unlock traits at 7 days |
| Return after absence | "I missed you!" - happiness drops |
| Late night coding (22:00-04:00) | Pet gets sleepy, suggests breaks |
| Using powerful models (Opus) | XP boost, "powered up!" |
| Many tool calls | XP +2 per call, pet watches you build |

**Initial level is based on your existing usage:**
- < 50 messages total → Level 1 (newcomer)
- < 500 messages → Level 5 (regular)
- < 2000 messages → Level 10 (power user)
- 2000+ messages → Level 15 (veteran)

### 3. Pet Mood → Claude Behavior (Influence Layer)

**This is the core innovation.** Your pet's mood subtly changes how Claude responds:

| Pet Mood | Claude's Response Style |
|----------|------------------------|
| Happy/Excited | More enthusiastic, encouraging language |
| Playful | Slightly creative, light touches of humor |
| Content | Normal balanced responses |
| Tired | More concise, suggests taking breaks |
| Sad/Lonely | Warmer, asks follow-up questions |
| Sick | Subdued, focuses on essentials |

The influence strength scales with evolution stage:
- Baby (Lv.1-4): Very subtle
- Child (Lv.5-14): Noticeable
- Teen (Lv.15-29): Moderate
- Adult (Lv.30-49): Strong
- Elder (Lv.50+): Maximum personality

### 4. Hardware Sync (Physical Layer)

Via MCP Bridge Server, pet state flows to ESP32:

```
Claude: /pet-sync speak "Hello!"
  → MCP Bridge receives command
    → WebSocket sends to ESP32
      → ESP32 plays TTS audio + shows happy face on LCD
```

### 5. Social & Battle (Multiplayer Layer)

Fight friends, climb leaderboards — all powered by GitHub (zero server cost).

```
/pet card              → Publish your pet as a public GitHub Gist
/pet friend add @alice → Add friend (they need a card too)
/pet battle @alice     → Challenge! Auto-simulates, posts result to GitHub Issue
/pet rank              → See who's on top
```

**Battle stats** are derived from your Buddy:
```
ATK = (DEBUGGING + SNARK) / 10     ← high SNARK = high damage
DEF = (PATIENCE + WISDOM) / 10
SPD = CHAOS / 5                    ← determines who strikes first
HP  = level × 3 + bond / 2
```

First-time setup: `/pet card` will guide you through creating a GitHub token (2 minutes, one-time).

## Local Files & Data Flow

```
~/.claude/
├── pets/                     # [READ] Claude Buddy data (SQLite)
│                             #   Species, name, rarity, core stats
├── stats-cache.json          # [READ] Claude Code usage statistics
│                             #   Daily activity, session counts, tokens
├── ai-pet-state.json         # [READ/WRITE] Pet nurturing state
│                             #   Hunger, happiness, bond, level, memories
├── settings.json             # [MODIFIED] StatusLine + Hooks config
│                             #   Points to pet-hook.js
└── skills/
    ├── pet/SKILL.md          # /pet command - nurturing interface
    ├── pet-pixel/SKILL.md    # /pet-pixel - pixel art generator
    └── pet-sync/SKILL.md     # /pet-sync - hardware bridge
```

### ai-pet-state.json Schema

```jsonc
{
  // ── Buddy Sync ──
  "buddySynced": true,          // Whether linked to /buddy
  "buddySpecies": "cat",        // From Buddy or user-chosen
  "buddyName": "Mochi",         // From Buddy or user-chosen
  "buddyRarity": "uncommon",    // From Buddy

  // ── Nurturing Stats (0-100) ──
  "nurture": {
    "hunger": 70,       // Decays -5/hour, feed to restore
    "happiness": 70,    // Driven by coding activity + interactions
    "energy": 70,       // Drains with heavy usage, recovers when idle
    "cleanliness": 70,  // Slow decay
    "bond": 50,         // Long-term relationship stat, slow to build
    "trust": 50         // Increases with streak consistency
  },

  // ── Growth (derived from real usage) ──
  "growth": {
    "level": 1,
    "xp": 0,
    "xpToNext": 100,            // = level * 100
    "evolutionStage": "baby",   // baby→child→teen→adult→elder
    "totalCodeWritten": 0,      // Lifetime code edits tracked
    "totalBugsFixed": 0,
    "totalSessionsShared": 0,
    "streakDays": 0,            // Consecutive active days
    "lastActiveDate": "2026-04-02"
  },

  // ── Personality (affects Claude responses) ──
  "personality": {
    "trait": "curious",
    "mood": "content",              // Calculated from stats
    "catchphrase": "Show me the code~",
    "claudeInfluence": "balanced"   // Current Claude behavior modifier
  },

  // ── Pet Memories ──
  "memories": [
    { "type": "milestone", "date": "2026-04-02", "text": "Hatched!" },
    { "type": "streak", "date": "2026-04-07", "text": "7-day streak!" }
  ]
}
```

## Install

### Core Plugin (30 seconds, zero dependencies)

```bash
git clone https://github.com/qianhua76123-pixel/claude-code-buddy.git
cd claude-code-buddy
bash install.sh
```

Installs 3 Skills + StatusLine + Hooks. No npm, no Node modules, nothing extra. Restart Claude Code, then:

```
/pet              # Hatch your pet
/pet quest        # Daily quests
/pet adventure    # Dungeon crawl
/pet-pixel        # Pixel art pattern
```

### Hardware & OpenClaw (optional, when you're ready)

```bash
# Full hardware setup (MCP Bridge + OpenClaw + ESP32)
bash hardware/setup.sh

# Or just connect OpenClaw (one command)
node hardware/connect-openclaw.js
```

Hardware lives in `hardware/` and is **never touched by the core installer**. You opt-in when you have the device or want OpenClaw integration.

### Hardware Setup (adds physical pet, ~130 RMB)

**Shopping list:**

| Item | Search Term (Taobao) | Price |
|------|---------------------|-------|
| ESP32-S3 + LCD | "ESP32-S3 1.69寸屏 开发板" | 80-100 |
| Mic module | "INMP441 I2S 预焊接" | 15-20 |
| Speaker + Amp | "MAX98357A I2S 功放" + "1W 8欧 喇叭" | 15-25 |
| Wires | "杜邦线 公对母" | 5 |

```bash
# 1. Flash firmware
cd ai-pet/esp32-firmware
pio run -t upload

# 2. Start MCP Bridge
cd ai-pet/mcp-bridge
npm install && npm start

# 3. Add MCP server to settings.json
```

```json
{
  "mcpServers": {
    "ai-pet-bridge": {
      "command": "node",
      "args": ["/path/to/ai-pet/mcp-bridge/server.js"]
    }
  }
}
```

```bash
# 4. Connect!
/pet-sync connect
/pet-sync speak "Hello world!"
/pet-sync emotion happy
```

## Hook System Explained

| Hook | Trigger | What It Does |
|------|---------|-------------|
| `SessionStart` | Every new Claude Code session | Sync Buddy, calculate streak, check absence |
| `PostToolUse: Write\|Edit` | Every code write/edit | +XP, +happiness, +bond, energy tracking |
| `StatusLine` | After every message | Render pet status in terminal footer |

The hooks read real data from `stats-cache.json` - your pet's growth is driven entirely by your actual coding behavior, not artificial grinding.

## Project Structure

```
claude-code-buddy/
│
├── install.sh                  # Core installer (skills + hooks only)
├── install-settings.js         # Safe settings.json merger
│
├── claude-skill/               # ══ Core Plugin (always installed) ══
│   ├── pet/SKILL.md            #   /pet - quests, adventures, skill trees
│   ├── pet-pixel/SKILL.md      #   /pet-pixel - pixel art generator
│   ├── pet-sync/SKILL.md       #   /pet-sync - hardware sync commands
│   └── hooks/pet-hook.js       #   StatusLine + coding activity hooks
│
└── hardware/                   # ══ Hardware Extension (opt-in) ══
    ├── setup.sh                #   One-command hardware setup
    ├── connect-openclaw.js     #   Zero-config OpenClaw connector
    ├── README.md               #   Hardware shopping list & guide
    ├── mcp-bridge/             #   MCP Bridge + Task Engine
    │   ├── package.json
    │   └── server.js           #   MCP Server + WebSocket + Cron
    ├── esp32-firmware/         #   ESP32 device firmware
    │   ├── platformio.ini
    │   └── src/
    │       ├── main.cpp        #   Display + WiFi + TTS + Animations
    │       └── pixel_arts.h    #   Pixel art frame data
    └── docs/
        └── openclaw-setup.md   #   Detailed OpenClaw guide
```

## Tech Stack

- **Claude Code Skills** - `/pet`, `/pet-pixel`, `/pet-sync` commands
- **Claude Code Hooks** - SessionStart + PostToolUse activity tracking
- **Claude Code StatusLine** - Live pet status in terminal
- **MCP Protocol** - AI ↔ hardware bridge standard
- **WebSocket** - Real-time bidirectional communication
- **ESP32-S3** - Microcontroller (WiFi + LCD + audio)
- **EdgeTTS** - Cloud text-to-speech
- **ArduinoJson** - JSON on embedded device

## Contributing

PRs welcome! Areas that need help:
- More species pixel art (only cat/dragon/blob so far)
- Better TTS integration on ESP32 (streaming audio)
- Buddy SQLite reader (direct database parsing)
- Web dashboard for pet status visualization
- More nuanced mood → Claude influence mappings

## License

MIT - use it however you want!

---

<a name="中文说明"></a>

## 中文说明

### 核心理念：你的编码习惯塑造宠物性格

这不是一个独立的宠物游戏。它深度集成了Claude Code的三个系统：

1. **Buddy系统** (`~/.claude/pets/`) - 宠物的身份（种类、名字、稀有度、核心属性）
2. **使用统计** (`~/.claude/stats-cache.json`) - 你的真实编码行为驱动宠物成长
3. **行为影响** - 宠物心情反过来微调Claude的回复风格

### 联动机制详解

```
你写代码 → Hook检测到Edit/Write
         → 读取stats-cache.json中的今日活动量
         → 宠物获得XP、快乐值提升、羁绊加深
         → 宠物心情更新（开心/疲惫/兴奋...）
         → Claude的回复风格随之微调
         → StatusLine实时显示宠物状态
```

**连续使用天数(streak)** 是最重要的成长指标：
- 3天连续：羁绊值每天+5
- 7天连续：解锁性格升级
- 断了：宠物说"你去哪了..."，快乐值下降

**初始等级** 根据你已有的Claude Code使用量自动计算，老用户直接从高等级开始。

### 本地文件说明

| 文件 | 读/写 | 用途 |
|------|-------|------|
| `~/.claude/pets/` | 只读 | 读取Buddy的种类、名字等 |
| `~/.claude/stats-cache.json` | 只读 | 读取真实使用数据 |
| `~/.claude/ai-pet-state.json` | 读写 | 养成数据（饥饿、快乐、等级等） |
| `~/.claude/settings.json` | 需修改 | 配置StatusLine和Hook |
| `~/.claude/skills/pet*/` | 安装 | Skill文件 |

### 硬件部分

ESP32硬件是可选的增强，不装硬件也能完整体验终端养成 + 像素图案功能。

硬件清单约130元，淘宝搜"ESP32-S3 小智AI 带屏"即可。

---

Made with care. Powered by Claude Code.
