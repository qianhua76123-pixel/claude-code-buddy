#!/usr/bin/env node
/**
 * AI Pet - Settings.json auto-configurator
 * Safely merges pet hooks and statusline into existing settings.json
 *
 * Usage: node install-settings.js
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const SETTINGS_FILE = path.join(os.homedir(), ".claude", "settings.json");
const HOOK_SCRIPT = path.join(__dirname, "claude-skill", "hooks", "pet-hook.js");

// Normalize path for JSON (forward slashes work everywhere)
const hookPath = HOOK_SCRIPT.replace(/\\/g, "/");

function main() {
  let settings = {};

  // Read existing settings
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    } catch (e) {
      console.error("Error parsing settings.json:", e.message);
      console.error("Please fix the JSON syntax first.");
      process.exit(1);
    }
  }

  // Check if already installed
  const raw = JSON.stringify(settings);
  if (raw.includes("pet-hook") || raw.includes("ai-pet")) {
    console.log("AI Pet is already configured in settings.json");
    return;
  }

  // Backup
  if (fs.existsSync(SETTINGS_FILE)) {
    const backup = SETTINGS_FILE + ".backup-" + Date.now();
    fs.copyFileSync(SETTINGS_FILE, backup);
    console.log("Backup saved:", backup);
  }

  // Add statusLine
  if (!settings.statusLine) {
    settings.statusLine = {
      type: "command",
      command: `node "${hookPath}" statusline`,
    };
    console.log("+ Added statusLine");
  } else {
    console.log("~ statusLine already exists, skipping (add manually if needed)");
  }

  // Add hooks
  if (!settings.hooks) settings.hooks = {};

  // SessionStart hook
  if (!settings.hooks.SessionStart) {
    settings.hooks.SessionStart = [
      {
        matcher: "",
        hooks: [
          {
            type: "command",
            command: `node "${hookPath}" on-session`,
          },
        ],
      },
    ];
    console.log("+ Added SessionStart hook");
  } else {
    // Append to existing
    const exists = settings.hooks.SessionStart.some((h) =>
      JSON.stringify(h).includes("pet-hook")
    );
    if (!exists) {
      settings.hooks.SessionStart.push({
        matcher: "",
        hooks: [
          { type: "command", command: `node "${hookPath}" on-session` },
        ],
      });
      console.log("+ Appended to existing SessionStart hooks");
    }
  }

  // PostToolUse hook
  if (!settings.hooks.PostToolUse) {
    settings.hooks.PostToolUse = [
      {
        matcher: "Write|Edit",
        hooks: [
          {
            type: "command",
            command: `node "${hookPath}" on-code`,
          },
        ],
      },
    ];
    console.log("+ Added PostToolUse hook");
  } else {
    const exists = settings.hooks.PostToolUse.some((h) =>
      JSON.stringify(h).includes("pet-hook")
    );
    if (!exists) {
      settings.hooks.PostToolUse.push({
        matcher: "Write|Edit",
        hooks: [
          { type: "command", command: `node "${hookPath}" on-code` },
        ],
      });
      console.log("+ Appended to existing PostToolUse hooks");
    }
  }

  // Write settings
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  console.log("\nSettings saved to:", SETTINGS_FILE);
  console.log("Restart Claude Code to activate AI Pet!");
}

main();
