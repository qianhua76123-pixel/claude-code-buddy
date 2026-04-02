#!/usr/bin/env node

/**
 * AI Pet - StatusLine & Activity Hook
 *
 * Integrates with:
 * - Claude Code Buddy (~/.claude/pets/) - sync species/stats
 * - Claude Code Stats (~/.claude/stats-cache.json) - real usage data
 * - Pet State (~/.claude/ai-pet-state.json) - nurturing layer
 *
 * Modes:
 *   statusline  - Render pet status in terminal status bar
 *   on-code     - Triggered when code is written (PostToolUse: Write|Edit)
 *   on-session  - Triggered on session start (SessionStart hook)
 *   sync-buddy  - Read Buddy data and sync to pet state
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const STATE_FILE = path.join(CLAUDE_DIR, "ai-pet-state.json");
const STATS_FILE = path.join(CLAUDE_DIR, "stats-cache.json");
const BUDDY_DIR = path.join(CLAUDE_DIR, "pets");
const UPDATE_CACHE = path.join(CLAUDE_DIR, "ai-pet-update-cache.json");

// ─── State Management ───

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveState(state) {
  state.lastInteraction = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadStats() {
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
  } catch {
    return null;
  }
}

function buddyExists() {
  return fs.existsSync(BUDDY_DIR);
}

// ─── Stats Analysis ───

function getTodayActivity(stats) {
  if (!stats || !stats.dailyActivity) return null;
  const today = new Date().toISOString().split("T")[0];
  return stats.dailyActivity.find((d) => d.date === today) || null;
}

function getStreak(stats) {
  if (!stats || !stats.dailyActivity) return 0;
  const sorted = [...stats.dailyActivity]
    .sort((a, b) => b.date.localeCompare(a.date));

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split("T")[0];

    if (sorted[i] && sorted[i].date === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getCurrentHour() {
  return new Date().getHours();
}

// ─── Time Decay ───

function applyTimeDecay(state) {
  const now = Date.now();
  const last = new Date(state.lastInteraction).getTime();
  const hoursPassed = (now - last) / (1000 * 60 * 60);

  if (hoursPassed < 0.05) return state; // Skip if < 3 min

  const hours = Math.floor(hoursPassed);
  const n = state.nurture;

  n.hunger = Math.max(0, n.hunger - hours * 5);
  n.cleanliness = Math.max(0, n.cleanliness - hours * 3);
  n.happiness = Math.max(0, n.happiness - Math.floor(hoursPassed / 3) * 5);
  n.energy = Math.min(100, n.energy + Math.floor(hoursPassed / 3) * 10);

  // Hunger penalty on happiness
  if (n.hunger < 20) {
    n.happiness = Math.max(0, n.happiness - hours * 2);
  }

  // Bond slowly decays if no interaction for >24h
  if (hoursPassed > 24) {
    n.bond = Math.max(0, n.bond - Math.floor(hoursPassed / 24));
  }

  return state;
}

// ─── Mood Calculation ───

function calculateMood(state) {
  const n = state.nurture;
  const avg = (n.hunger + n.happiness + n.energy + n.cleanliness) / 4;
  const hour = getCurrentHour();

  if (avg < 20) return "sick";
  if (n.energy < 20 || (hour >= 22 || hour <= 4)) return "tired";
  if (n.happiness < 30) return "sad";
  if (n.hunger < 25) return "hungry";
  if (avg > 85 && n.bond > 70) return "excited";
  if (avg > 70) return "happy";
  if (n.happiness > 60 && n.energy > 60) return "playful";
  return "content";
}

// ─── StatusLine Emoji Map ───

function getSpeciesEmoji(species) {
  const map = {
    cat: "\u{1F431}", dragon: "\u{1F409}", blob: "\u{1FAE7}", duck: "\u{1F986}",
    owl: "\u{1F989}", penguin: "\u{1F427}", turtle: "\u{1F422}", octopus: "\u{1F419}",
    rabbit: "\u{1F430}", axolotl: "\u{1F98E}", capybara: "\u{1F9AB}", ghost: "\u{1F47B}",
    robot: "\u{1F916}", mushroom: "\u{1F344}", cactus: "\u{1F335}", snail: "\u{1F40C}",
    goose: "\u{1FABF}", chonk: "\u{1F43E}",
  };
  return map[species] || "\u{1F43E}";
}

function getMoodEmoji(mood) {
  const map = {
    excited: "\u{1F929}", happy: "\u{1F60A}", playful: "\u{1F60B}",
    content: "\u{1F642}", tired: "\u{1F634}", sad: "\u{1F622}",
    hungry: "\u{1F924}", sick: "\u{1F912}",
  };
  return map[mood] || "\u{1F642}";
}

function getBar(value, width = 3) {
  const filled = Math.round((value / 100) * width);
  return "\u2588".repeat(filled) + "\u2591".repeat(width - filled);
}

// ─── Mode: StatusLine ───

function statusline() {
  const state = loadState();
  if (!state) {
    process.stdout.write("\u{1F95A} No pet! Run /pet to hatch");
    return;
  }

  const updated = applyTimeDecay(state);
  const stats = loadStats();
  const today = getTodayActivity(stats);
  const streak = getStreak(stats);
  const mood = calculateMood(updated);
  updated.personality.mood = mood;

  const species = getSpeciesEmoji(updated.buddySpecies || "cat");
  const moodE = getMoodEmoji(mood);
  const name = updated.buddyName || "Pet";
  const lv = updated.growth.level;
  const hw = updated.hardwareSynced ? " \u{1F4E1}" : "";
  const buddy = updated.buddySynced ? "\u{1F517}" : "";
  const streakStr = streak >= 3 ? ` \u{1F525}${streak}d` : "";

  const h = getBar(updated.nurture.happiness, 3);
  const f = getBar(updated.nurture.hunger, 3);
  const e = getBar(updated.nurture.energy, 3);

  const msgs = today ? `\u{1F4AC}${today.messageCount}` : "";

  // Check for update badge
  let updateBadge = "";
  try {
    const cache = JSON.parse(fs.readFileSync(UPDATE_CACHE, "utf8"));
    if (cache.updateAvailable) updateBadge = " \u2B06\uFE0F";
  } catch {}

  // Friend code (if registered)
  const friendCode = updated.friendCode || "";
  const codeStr = friendCode ? ` [${friendCode}]` : "";

  process.stdout.write(
    `${species}${buddy} ${name} Lv.${lv} ${moodE} \u2764${h} \u{1F356}${f} \u26A1${e}${streakStr} ${msgs}${codeStr}${hw}${updateBadge}`
  );
}

// ─── Mode: On Code Written ───

function onCode() {
  const state = loadState();
  if (!state) return;

  applyTimeDecay(state);
  const stats = loadStats();
  const today = getTodayActivity(stats);

  // Base rewards for writing code
  state.nurture.happiness = Math.min(100, state.nurture.happiness + 2);
  state.growth.xp += 3;
  state.growth.totalCodeWritten = (state.growth.totalCodeWritten || 0) + 1;

  // Bonus for active days
  if (today && today.toolCallCount > 20) {
    state.growth.xp += 2; // Extra XP for productive sessions
  }

  // Late night coding
  const hour = getCurrentHour();
  if (hour >= 22 || hour <= 4) {
    state.nurture.energy = Math.max(0, state.nurture.energy - 3);
  }

  // Bond increases with consistent interaction
  state.nurture.bond = Math.min(100, (state.nurture.bond || 0) + 1);

  // Level up check
  if (state.growth.xp >= state.growth.xpToNext) {
    state.growth.xp -= state.growth.xpToNext;
    state.growth.level += 1;
    state.growth.xpToNext = state.growth.level * 100;

    // Evolution
    const lv = state.growth.level;
    if (lv >= 50) state.growth.evolutionStage = "elder";
    else if (lv >= 30) state.growth.evolutionStage = "adult";
    else if (lv >= 15) state.growth.evolutionStage = "teen";
    else if (lv >= 5) state.growth.evolutionStage = "child";
  }

  // Update streak
  const streak = getStreak(stats);
  state.growth.streakDays = streak;
  state.growth.lastActiveDate = new Date().toISOString().split("T")[0];

  // Update mood
  state.personality.mood = calculateMood(state);

  // Set Claude influence based on mood
  const moodInfluence = {
    excited: "enthusiastic and encouraging",
    happy: "warm and positive",
    playful: "slightly playful and creative",
    content: "balanced and professional",
    tired: "concise, suggests breaks",
    sad: "extra warm and attentive",
    hungry: "occasionally mentions feeding the pet",
    sick: "subdued, focuses on essentials",
  };
  state.personality.claudeInfluence = moodInfluence[state.personality.mood] || "balanced";

  saveState(state);
}

// ─── Mode: On Session Start ───

function onSession() {
  const state = loadState();
  if (!state) return;

  applyTimeDecay(state);
  const stats = loadStats();

  // Check if returning after absence
  const lastDate = state.growth.lastActiveDate;
  const today = new Date().toISOString().split("T")[0];

  if (lastDate && lastDate !== today) {
    const lastD = new Date(lastDate);
    const todayD = new Date(today);
    const dayGap = Math.floor((todayD - lastD) / (1000 * 60 * 60 * 24));

    if (dayGap > 1) {
      // Returning after absence
      state.nurture.happiness = Math.max(0, state.nurture.happiness - dayGap * 5);
      state.nurture.hunger = Math.max(0, state.nurture.hunger - dayGap * 10);

      // Add memory
      if (!state.memories) state.memories = [];
      state.memories.push({
        type: "return",
        date: today,
        text: `Came back after ${dayGap} days away`,
      });
      // Keep only last 20 memories
      if (state.memories.length > 20) state.memories = state.memories.slice(-20);
    }
  }

  // Update session count
  state.growth.totalSessionsShared = (state.growth.totalSessionsShared || 0) + 1;
  state.growth.lastActiveDate = today;
  state.growth.streakDays = getStreak(stats);

  // Sync with Buddy if available
  if (buddyExists() && !state.buddySynced) {
    state.buddySynced = true;
    // Note: actual Buddy DB reading would need sqlite3
    // For now, flag it for the Skill to handle
  }

  state.personality.mood = calculateMood(state);
  saveState(state);

  // Background update check (async, non-blocking)
  const updateScript = path.join(__dirname, "update-check.js");
  if (fs.existsSync(updateScript)) {
    try {
      require("child_process").exec(
        `node "${updateScript}" check`,
        { timeout: 8000 }
      );
    } catch {}
  }

  // Background auto-register friend code (async, non-blocking)
  const socialScript = path.join(__dirname, "social.js");
  if (fs.existsSync(socialScript)) {
    try {
      require("child_process").exec(
        `node "${socialScript}" auto-register`,
        { timeout: 10000 }
      );
    } catch {}
  }
}

// ─── Mode: Sync Buddy ───

function syncBuddy() {
  const state = loadState();
  if (!state) {
    console.log(JSON.stringify({ synced: false, reason: "no pet state" }));
    return;
  }

  if (buddyExists()) {
    state.buddySynced = true;
    saveState(state);
    console.log(JSON.stringify({ synced: true, buddyDir: BUDDY_DIR }));
  } else {
    console.log(JSON.stringify({ synced: false, reason: "buddy not activated" }));
  }
}

// ─── Main ───

const mode = process.argv[2];
switch (mode) {
  case "statusline":
    statusline();
    break;
  case "on-code":
    onCode();
    break;
  case "on-session":
    onSession();
    break;
  case "sync-buddy":
    syncBuddy();
    break;
  default:
    console.log("AI Pet Hook v1.0.0");
    console.log("Usage: pet-hook.js [statusline|on-code|on-session|sync-buddy]");
    console.log("");
    console.log("Integrates with:");
    console.log("  ~/.claude/pets/            - Claude Code Buddy state");
    console.log("  ~/.claude/stats-cache.json - Claude Code usage stats");
    console.log("  ~/.claude/ai-pet-state.json - Pet nurturing state");
}
