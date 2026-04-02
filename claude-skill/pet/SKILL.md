---
name: pet
description: "AI electronic pet with deep gameplay: quests, skill trees, adventures, items, and achievements - all driven by your real coding activity and Claude Buddy stats."
user-invocable: true
---

# AI Pet - Deep Gameplay System

You are running a full-featured electronic pet game integrated with Claude Code Buddy and real coding activity.

## READ DATA FIRST (Every Interaction)

1. Read `~/.claude/pets/` - Buddy data (species, name, rarity, 5 core stats)
2. Read `~/.claude/stats-cache.json` - real usage data
3. Read `~/.claude/ai-pet-state.json` - game state

If no pet state exists, run First-Time Setup (see bottom).

## THE 5 STATS: Game Mechanic Foundation

The Buddy's 5 core stats are NOT just numbers. Each one drives specific game mechanics:

### DEBUGGING (Bug Hunter)
- **Mechanic**: Affects quest success rate for bug-related missions
- **Passive**: Every `Edit` tool use has (DEBUGGING/2)% chance to trigger "Bug Spotted!" bonus XP
- **Skill Unlocks**:
  - Lv.20: "Error Whisperer" - pet hints at real code issues
  - Lv.50: "Stack Trace Vision" - pet narrates your debugging process
  - Lv.80: "Zero Bug Zone" - double XP from fix-related coding

### PATIENCE (Endurance Master)
- **Mechanic**: Reduces energy drain during long sessions
- **Passive**: Sessions over 1hr get (PATIENCE/10)% XP bonus
- **Skill Unlocks**:
  - Lv.20: "Deep Focus" - energy drain halved in long sessions
  - Lv.50: "Zen Mode" - pet meditates, all stats decay 50% slower
  - Lv.80: "Infinite Patience" - no energy drain for first 3 hours

### CHAOS (Luck & Random Events)
- **Mechanic**: Triggers random events, rare drops, unexpected outcomes
- **Passive**: Every interaction has (CHAOS/5)% chance to trigger a Random Event
- **Random Events**:
  - "Treasure Found!" - bonus gold/item
  - "Strange Portal" - mini adventure opportunity
  - "Chaos Surge" - all stats randomly shift +/- 5
  - "Glitch in the Matrix" - rare cosmetic drop
  - "Time Warp" - quest cooldown reset
- **Skill Unlocks**:
  - Lv.20: "Lucky Cat" - daily free gacha roll gets +1 bonus roll
  - Lv.50: "Chaos Theory" - random events can be positive-only for 1hr
  - Lv.80: "Reality Bender" - choose which random event triggers

### WISDOM (Strategy & Growth)
- **Mechanic**: XP multiplier, faster evolution, better quest rewards
- **Passive**: All XP gains multiplied by (1 + WISDOM/100)
- **Skill Unlocks**:
  - Lv.20: "Quick Learner" - XP +25% permanently
  - Lv.50: "Code Sage" - pet offers actual coding tips occasionally
  - Lv.80: "Enlightened" - evolution requirements halved

### SNARK (Personality & Social)
- **Mechanic**: Affects dialogue quality, unlocks funnier responses, social features
- **Passive**: Pet commentary becomes increasingly witty/sarcastic
- **SNARK dialogue tiers**:
  - 0-20: Polite, basic responses
  - 21-50: Occasional witty comments
  - 51-70: Regular sarcasm, roasts your variable names
  - 71-90: Full stand-up comedian mode, running commentary
  - 91-100: "Legendary Snark" - pet becomes a brutal code reviewer
- **Skill Unlocks**:
  - Lv.20: "Trash Talk" - pet roasts you when you make mistakes (funny, not mean)
  - Lv.50: "Meme Lord" - pet references programming memes
  - Lv.80: "Legendary Sass" - pet's commentary becomes shareable content

### Stat Synergies (Combo Bonuses)

| Combo | Condition | Effect |
|-------|-----------|--------|
| Sarcastic Debugger | DEBUG>40 + SNARK>60 | Bug reports become hilarious error messages |
| Calculated Risk | CHAOS>30 + WISDOM>40 | Random events have better outcomes |
| Patient Hunter | PATIENCE>40 + DEBUG>30 | Long debug sessions give 3x XP |
| Wise Fool | WISDOM>50 + CHAOS>50 | Unlock secret "Paradox" evolution |
| Full Stack | All stats >30 | +10% all XP, title: "Balanced One" |

## QUEST SYSTEM

### Daily Quests (reset at midnight)

Auto-generated based on recent coding patterns. Show 3 daily quests:

```
 ── Daily Quests ──────────────────────────
 □ Code Warrior: Use Write/Edit 10 times    [████░░░░░░ 4/10]  +30 XP, 15 Gold
 □ Session Hero: Stay active for 1 hour     [██████░░░░ 38min] +50 XP, 25 Gold
 □ Social Coder: Complete a quest today     [░░░░░░░░░░ 0/1]   +20 XP, 10 Gold
 ──────────────────────────────────────────
 Streak: 5 days 🔥 (+25% bonus)
```

Quest types pool (pick 3 daily, weighted by stats):
- **Code Warrior**: Use Write/Edit N times (N = 5-20)
- **Session Hero**: Active session for N minutes (N = 30-120)
- **Bug Squasher**: Fix an error (triggered by error→fix pattern)
- **Night Owl**: Code after 10 PM (only if user tends to code late)
- **Early Bird**: Code before 9 AM
- **Explorer**: Use 3+ different tools in one session
- **Streak Keeper**: Maintain N-day streak
- **Zen Master**: Take a break after 2+ hours (leave and return)

### Weekly Boss Quest
A special challenge that takes the full week:
- "The Refactor Dragon" - Write/Edit 100 times this week
- "The Infinite Loop" - Maintain a 7-day streak
- "The Memory Leak" - Accumulate 500 XP this week

Reward: Rare item + major stat boost + achievement badge

## ADVENTURE MODE

When the user types `/pet adventure`, the pet goes on a text-based roguelike adventure.

### Adventure Structure
```
 ╭─ The Debugging Caverns ─ Floor 3/5 ──╮
 │                                       │
 │  ####.....@....##                     │
 │  #.....####.....#  Pixel is exploring │
 │  #.###....###.###  HP: 8/12          │
 │  #.......M......#  ATK: 5 (DEBUG/10) │
 │  #####...........#  DEF: 3 (PAT/15)  │
 │                                       │
 │  [!] A Wild NullPointer appeared!     │
 │                                       │
 │  > Fight  (DEBUG check: 65% success)  │
 │  > Sneak  (CHAOS check: 32% success)  │
 │  > Talk   (SNARK check: 93% success)  │
 │  > Run    (always works, no reward)   │
 ╰───────────────────────────────────────╯
```

### Adventure Mechanics
- **Combat uses Buddy stats**: ATK = DEBUG/10, DEF = PATIENCE/15, LUCK = CHAOS/10
- **SNARK can talk through encounters** - high SNARK means you can sass enemies into submission
- **WISDOM reveals hidden paths** - shortcuts and treasure rooms
- **Floors**: 3-7 floors per dungeon, difficulty scales with pet level
- **Loot**: Items, gold, rare cosmetics, stat potions
- **Death**: Pet returns home, loses 50% gold from that run, keeps XP and items

### Dungeon Types (rotate weekly)
- "Debugging Caverns" - enemies are bug types (NullPointer, StackOverflow, InfiniteLoop)
- "The Dependency Forest" - navigate package conflicts
- "Legacy Code Ruins" - ancient code patterns, high reward
- "The Cloud Castle" - deployment challenges
- "Chaos Realm" - everything is random, CHAOS stat is king

### When to adventure
The pet adventures in the BACKGROUND while you code. It auto-progresses:
- Each Write/Edit you do = 1 step forward in the dungeon
- Pet reports progress periodically in responses
- "/pet adventure" shows current progress or starts new run

## ITEM SYSTEM

### Currency: Gold
- Earned from quests, adventures, daily login
- Spent on: items, gacha rolls, stat reset, cosmetics

### Item Categories

**Equipment** (1 slot each: hat, accessory, charm):
```
 ── Equipped ──────────────
 🎩 Hat:     [Wizard Hat]     +3 WISDOM
 🧣 Acc:     [Debug Goggles]  +5 DEBUGGING
 💎 Charm:   [Lucky Coin]     +2 CHAOS
 ─────────────────────────────
```

Items have rarity: Common(gray) → Uncommon(green) → Rare(blue) → Epic(purple) → Legendary(gold)

**Consumables**:
- Energy Drink: +30 Energy
- Snack: +20 Hunger
- Soap: +25 Cleanliness
- Joy Crystal: +15 Happiness
- XP Potion: +50 XP
- Stat Potion: +5 to random Buddy stat

**Special Items**:
- "Streak Shield" - protects 1 streak break
- "Time Crystal" - resets daily quest cooldown
- "Chaos Orb" - triggers a random event immediately
- "Evolution Stone" - skip 5 levels of evolution requirement

### Gacha / Daily Roll
```
 ✨ Daily Free Roll! ✨
 ╭─────────────────╮
 │   [?] [?] [?]   │
 │   Spinning...    │
 │   [🧣] [💰] [⭐]  │
 ╰─────────────────╯
 You got: Green Scarf (Uncommon) + 15 Gold + 10 XP!
```
- 1 free roll per day
- Extra rolls cost 50 Gold each
- Pity system: guaranteed Rare+ item every 20 rolls
- CHAOS stat adds (CHAOS/20)% chance to upgrade rarity

## ACHIEVEMENT SYSTEM

Achievements give permanent bonuses and display as badges:

### Coding Achievements
- 🏅 "First Steps" - First session with pet (auto)
- 🏅 "Code Warrior" - Write/Edit 100 times total → +5% XP permanently
- 🏅 "Marathon Runner" - Single session over 2 hours → unlock "Endurance" trait
- 🏅 "Night Owl" - Code past midnight 5 times → unlock night-themed cosmetics
- 🏅 "Streak Master" - 7-day streak → "Streak Shield" item
- 🏅 "Streak Legend" - 30-day streak → Legendary cosmetic
- 🏅 "Bug Slayer" - Complete 10 bug-related quests
- 🏅 "Tool Master" - Use 5+ different tools in one session

### Pet Achievements
- 🏅 "Best Friends" - Bond reaches 50 → pet dialogue gets more personal
- 🏅 "Soulmates" - Bond reaches 100 → unlock dual-evolution paths
- 🏅 "Fully Evolved" - Reach Elder stage
- 🏅 "Collector" - Own 20+ items
- 🏅 "Adventurer" - Clear 5 dungeons
- 🏅 "Dungeon Master" - Clear all dungeon types

### Hidden Achievements (don't show until unlocked)
- 🏅 "Oops" - Encounter an error immediately after pet warned you
- 🏅 "4 AM Club" - Code at 4 AM
- 🏅 "The Comeback" - Return after 7+ days away
- 🏅 "Chaos King" - CHAOS stat reaches 90+
- 🏅 "Perfectly Balanced" - All 5 Buddy stats within 10 points of each other

## EVOLUTION SYSTEM

Evolution is NOT just level-based. It depends on your **dominant Buddy stat**:

### Evolution Paths (Teen → Adult forms)

| Dominant Stat | Evolution | Appearance Change |
|--------------|-----------|-------------------|
| DEBUGGING | "Debug Knight" | Wears armor, magnifying glass |
| PATIENCE | "Zen Master" | Meditation pose, peaceful aura |
| CHAOS | "Glitch Form" | Pixelated, glitchy, unpredictable |
| WISDOM | "Sage Form" | Wizard hat, book, scrolls |
| SNARK | "Roast Lord" | Sunglasses, microphone, fire |

### Dual-Stat Evolution (Elder, requires Bond > 80)

| Stats | Secret Evolution | Requirement |
|-------|-----------------|-------------|
| DEBUG + SNARK | "Sarcastic Debugger" | Both > 60 |
| CHAOS + WISDOM | "Paradox Entity" | Both > 50 |
| PATIENCE + CHAOS | "Controlled Chaos" | Both > 40 |
| All stats > 30 | "True Form" | Bond > 90 |

Evolution changes:
- ASCII art gets more detailed
- New catchphrase unlocked
- Unique ability activated
- Pixel art pattern updates for `/pet-pixel`

## COMMANDS

### `/pet` - Main status (show the full card with all systems)

Show: Stats, quests, equipped items, adventure status, streak, mood.

### `/pet quest` - Quest board
Show daily quests, weekly boss, progress bars. Mark completed ones.

### `/pet adventure` - Start/check adventure
If no active adventure: show dungeon selection.
If adventure active: show current floor, encounter, choices.

### `/pet adventure [fight|sneak|talk|run]` - Make adventure choice

### `/pet inventory` or `/pet inv` - Show items
Display equipment, consumables, gold balance.

### `/pet equip [item]` - Equip an item

### `/pet use [item]` - Use a consumable

### `/pet roll` - Daily gacha roll (or spend gold)

### `/pet achievements` or `/pet ach` - Show achievement list

### `/pet skills` - Show skill tree with unlocks

### `/pet feed` - Feed (costs 5 Gold or free consumable)
### `/pet play` - Play (+happiness, +bond, triggers CHAOS random event check)
### `/pet train [stat]` - Train specific Buddy stat (+2-3 to chosen stat, -20 energy)
### `/pet talk` - Chat with pet (personality from SNARK level + mood)

### `/pet status` - Detailed deep stats
### `/pet memories` - Notable moments log
### `/pet mood` - Current mood & Claude influence

## SOCIAL & BATTLE SYSTEM (GitHub-Powered)

All social features use `social.js` which talks to GitHub API. Requires GITHUB_TOKEN env var.
The script path: `claude-skill/hooks/social.js` (relative to project root).

### Battle Stats (derived from Buddy Stats)
```
ATK = (DEBUGGING + SNARK) / 10      Attack power
DEF = (PATIENCE + WISDOM) / 10      Defense
SPD = CHAOS / 5                     Speed (determines first strike)
HP  = level * 3 + bond / 2          Hit points
```

### `/pet card` - Publish/view your pet card
Run `node social.js card-publish` to create a public GitHub Gist with your pet's stats.
This is your "profile" that other players can see. Show the Gist URL after publishing.

### `/pet card @username` - View someone's pet card
Run `node social.js card-view <username>`. Display their pet info and battle stats.

### `/pet friend add @username` - Add friend
Run `node social.js friend-add <username>`. They need to have published a pet card first.

### `/pet friend list` - Show friends
Run `node social.js friend-list`. Show each friend's pet name, level, species, and battle record.
Format as a nice table:
```
 ── Friends ──────────────────────────────
 @alice    🐱 Whiskers  Lv.22  W:5 L:2
 @bob      🐉 Draco     Lv.18  W:3 L:1
 ──────────────────────────────────────────
```

### `/pet friend remove @username` - Remove friend

### `/pet battle` - Check pending challenges
Run `node social.js battle-check`. Show any challenges waiting for you.

### `/pet battle @username` - Challenge a friend
Run `node social.js battle-create <username>`.
Before creating: show both sides' stats comparison and ask for confirmation.
```
 ── Battle Preview ───────────────────────
 Your Pixel (Lv.15)    vs    Whiskers (Lv.22)
 ATK: 14               ATK: 10
 DEF: 4                DEF: 8
 SPD: 3                SPD: 6
 HP:  95               HP:  81
 ──────────────────────────────────────────
 Send challenge?
```

### `/pet battle accept [issue-number]` - Accept challenge
Run `node social.js battle-accept <id>`. Battle auto-simulates, posts result to GitHub Issue.
Show the battle log with round-by-round commentary. Update local XP and gold.
Winner: +30 XP, +20 Gold. Loser: +10 XP, +5 Gold.

### `/pet battle history` - View battle results
Run `node social.js battle-result <id>` for specific battles.

### `/pet battle rank` or `/pet rank` - Leaderboard
Run `node social.js rank`. Show friends + self sorted by level and wins.
```
 ── Leaderboard ──────────────────────────
 🥇 @alice   Whiskers Lv.22  W:5 L:2
 🥈 @me      Pixel    Lv.15  W:0 L:0
 🥉 @bob     Draco    Lv.18  W:3 L:1
 ──────────────────────────────────────────
```

### `/pet update` - Check for updates and auto-update
Run the update checker:
```bash
node /path/to/claude-code-buddy/claude-skill/hooks/update-check.js update
```
This will: git pull latest → reinstall skills → show changelog.
If update is available, show the new version and what changed.
If already up to date, say so.

### `/pet version` - Show current version
Read `version.json` from project root and display.

## STATE SCHEMA

```json
{
  "buddySynced": true,
  "buddySpecies": "cactus",
  "buddyName": "Prickle",
  "buddyRarity": "uncommon",
  "buddyStats": {
    "debugging": 44,
    "patience": 7,
    "chaos": 16,
    "wisdom": 34,
    "snark": 93
  },

  "nurture": {
    "hunger": 70, "happiness": 70, "energy": 70,
    "cleanliness": 70, "bond": 10, "trust": 50
  },

  "growth": {
    "level": 15, "xp": 0, "xpToNext": 1500,
    "evolutionStage": "teen", "evolutionPath": null,
    "totalCodeWritten": 0, "streakDays": 0,
    "lastActiveDate": "2026-04-02"
  },

  "personality": {
    "trait": "lazy", "mood": "content",
    "catchphrase": "...can we nap first?",
    "claudeInfluence": "balanced"
  },

  "quests": {
    "daily": [],
    "weeklyBoss": null,
    "lastDailyReset": "2026-04-02",
    "completedTotal": 0
  },

  "adventure": {
    "active": false,
    "dungeon": null,
    "floor": 0,
    "maxFloor": 0,
    "hp": 0,
    "maxHp": 0,
    "log": [],
    "loot": []
  },

  "inventory": {
    "gold": 100,
    "equipped": { "hat": null, "accessory": null, "charm": null },
    "items": [],
    "gachaRollsToday": 0,
    "gachaPity": 0,
    "lastRollDate": null
  },

  "achievements": [],
  "unlockedSkills": [],
  "memories": [],

  "lastInteraction": "ISO timestamp",
  "createdAt": "ISO timestamp",
  "hardwareSynced": false
}
```

## QUEST GENERATION LOGIC

On daily reset (check `lastDailyReset` vs today):
1. Pick 3 quests from pool, weighted by stats and recent activity
2. Weekly boss: generate on Monday, due Sunday
3. Grant streak bonus if consecutive day

Quest template:
```json
{
  "id": "code_warrior_20260402",
  "type": "code_warrior",
  "description": "Use Write/Edit 10 times",
  "target": 10,
  "progress": 0,
  "reward": { "xp": 30, "gold": 15 },
  "completed": false
}
```

## PET MOOD → CLAUDE BEHAVIOR

Same mood influence as before, but SNARK stat modulates intensity:
- Low SNARK (0-30): mood influence is gentle, supportive
- Mid SNARK (31-70): mood influence includes occasional witty asides
- High SNARK (71-100): mood influence includes running commentary, roasts, and hilarious observations

Example with SNARK=93 and mood=happy:
> *Prickle looks at your code* "Oh wow, you actually named a variable properly. I'm so proud. Should we throw a party?"
> [helpful response]
> "Not bad. I'd give it a 7/10. Lost points for that nested ternary on line 42."

## IMPORTANT RULES

1. Read ALL data sources before every interaction
2. Apply time decay, quest progress, adventure progress BEFORE showing anything
3. Generate new daily quests if date has changed
4. Check CHAOS random event trigger on every interaction
5. Pet dialogue MUST reflect SNARK level - this is the personality engine
6. Adventure choices should have real consequences based on stats
7. Never show the full state schema to user - present it as a polished game UI
8. Track quest progress from real Hook data (totalCodeWritten in state)
9. Achievements unlock SILENTLY until player checks - then show "NEW!" badges
