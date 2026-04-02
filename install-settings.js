#!/usr/bin/env node
/**
 * AI Pet - Settings.json auto-configurator
 * Safely merges pet hooks and statusline into existing settings.json
 * Points hooks to ~/.claude/hooks/ (where install.sh copies them)
 *
 * Usage: node install-settings.js
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const SETTINGS_FILE = path.join(CLAUDE_DIR, "settings.json");

// Hooks live in ~/.claude/hooks/ after install (portable, not tied to project dir)
const HOOKS_DIR = path.join(CLAUDE_DIR, "hooks");
const hookPath = path.join(HOOKS_DIR, "pet-hook.js").replace(/\\/g, "/");

function main() {
  let settings = {};

  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    } catch (e) {
      console.error("    Error parsing settings.json:", e.message);
      process.exit(1);
    }
  }

  // Backup
  if (fs.existsSync(SETTINGS_FILE)) {
    const backup = SETTINGS_FILE + ".backup-" + Date.now();
    fs.copyFileSync(SETTINGS_FILE, backup);
  }

  let changed = false;

  // Always update hook paths (in case they moved)
  // Remove old project-dir hooks and replace with ~/.claude/hooks/ paths
  const oldRaw = JSON.stringify(settings);

  // StatusLine
  if (!settings.statusLine || !oldRaw.includes("pet-hook")) {
    settings.statusLine = {
      type: "command",
      command: `node "${hookPath}" statusline`,
    };
    changed = true;
    console.log("    + statusLine → " + hookPath);
  }

  // Hooks
  if (!settings.hooks) settings.hooks = {};

  // SessionStart
  const sessionCmd = `node "${hookPath}" on-session`;
  if (!settings.hooks.SessionStart) {
    settings.hooks.SessionStart = [{ matcher: "", hooks: [{ type: "command", command: sessionCmd }] }];
    changed = true;
    console.log("    + SessionStart hook");
  } else {
    // Update existing pet-hook entries to new path
    let found = false;
    for (const entry of settings.hooks.SessionStart) {
      for (const h of (entry.hooks || [])) {
        if (h.command?.includes("pet-hook")) { h.command = sessionCmd; found = true; }
      }
    }
    if (!found) {
      settings.hooks.SessionStart.push({ matcher: "", hooks: [{ type: "command", command: sessionCmd }] });
      changed = true;
      console.log("    + SessionStart hook (appended)");
    } else if (found) {
      changed = true;
      console.log("    ~ SessionStart hook path updated");
    }
  }

  // PostToolUse
  const codeCmd = `node "${hookPath}" on-code`;
  if (!settings.hooks.PostToolUse) {
    settings.hooks.PostToolUse = [{ matcher: "Write|Edit", hooks: [{ type: "command", command: codeCmd }] }];
    changed = true;
    console.log("    + PostToolUse hook");
  } else {
    let found = false;
    for (const entry of settings.hooks.PostToolUse) {
      for (const h of (entry.hooks || [])) {
        if (h.command?.includes("pet-hook")) { h.command = codeCmd; found = true; }
      }
    }
    if (!found) {
      settings.hooks.PostToolUse.push({ matcher: "Write|Edit", hooks: [{ type: "command", command: codeCmd }] });
      changed = true;
      console.log("    + PostToolUse hook (appended)");
    } else if (found) {
      changed = true;
      console.log("    ~ PostToolUse hook path updated");
    }
  }

  if (changed) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    console.log("    Settings saved.");
  } else {
    console.log("    Settings already up to date.");
  }
}

main();
