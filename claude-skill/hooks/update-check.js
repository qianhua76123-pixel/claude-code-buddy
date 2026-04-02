#!/usr/bin/env node
/**
 * AI Pet - Version Check & Auto-Updater
 *
 * Modes:
 *   check     - Compare local vs remote version, output status line
 *   update    - Pull latest from git + re-install skills
 *   version   - Print current version
 *
 * Called by:
 *   - SessionStart hook (check, silent unless update available)
 *   - /pet-sync update command (update)
 *   - StatusLine (version badge)
 *
 * Zero dependencies - uses only Node built-ins + git CLI.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const SKILLS_DIR = path.join(CLAUDE_DIR, "skills");
const UPDATE_CACHE = path.join(CLAUDE_DIR, "ai-pet-update-cache.json");

// Find project root (where version.json lives)
function findProjectRoot() {
  // Walk up from this script's location
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, "version.json"))) return dir;
    dir = path.dirname(dir);
  }
  // Try common install locations
  const candidates = [
    path.join(os.homedir(), "claude-code-buddy"),
    path.join(os.homedir(), "projects", "claude-code-buddy"),
    path.join(os.homedir(), "Desktop", "claude-code-buddy"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "version.json"))) return c;
  }
  return null;
}

function getLocalVersion() {
  const root = findProjectRoot();
  if (!root) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));
  } catch {
    return null;
  }
}

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(UPDATE_CACHE, "utf8"));
  } catch {
    return { lastCheck: null, remoteVersion: null, updateAvailable: false };
  }
}

function saveCache(data) {
  fs.writeFileSync(UPDATE_CACHE, JSON.stringify(data, null, 2));
}

// Fetch remote version.json from GitHub (no deps, raw https)
function fetchRemoteVersion() {
  return new Promise((resolve) => {
    const url =
      "https://raw.githubusercontent.com/qianhua76123-pixel/claude-code-buddy/main/version.json";

    https
      .get(url, { timeout: 5000 }, (res) => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", () => resolve(null))
      .on("timeout", () => resolve(null));
  });
}

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
  }
  return 0;
}

// ── Mode: check ──
async function check() {
  const local = getLocalVersion();
  if (!local) {
    process.stdout.write("");
    return;
  }

  const cache = loadCache();
  const now = Date.now();
  const hoursSinceCheck = cache.lastCheck
    ? (now - new Date(cache.lastCheck).getTime()) / (1000 * 60 * 60)
    : 999;

  // Only check remote every 6 hours to avoid spam
  if (hoursSinceCheck < 6 && cache.remoteVersion) {
    if (cache.updateAvailable) {
      process.stdout.write(
        `\u2B06\uFE0F Update: v${local.version} \u2192 v${cache.remoteVersion}`
      );
    }
    return;
  }

  // Fetch remote
  const remote = await fetchRemoteVersion();
  if (!remote) return; // Network error, stay silent

  const updateAvailable = compareVersions(local.version, remote.version) < 0;

  saveCache({
    lastCheck: new Date().toISOString(),
    remoteVersion: remote.version,
    remoteChangelog: remote.changelog,
    updateAvailable,
  });

  if (updateAvailable) {
    process.stdout.write(
      `\u2B06\uFE0F Update: v${local.version} \u2192 v${remote.version}`
    );
  }
}

// ── Mode: update ──
function update() {
  const root = findProjectRoot();
  if (!root) {
    console.log("Cannot find project directory. Re-clone from GitHub.");
    process.exit(1);
  }

  console.log(`Project: ${root}`);
  console.log("Pulling latest...\n");

  try {
    // Check if it's a git repo
    execSync("git rev-parse --git-dir", { cwd: root, stdio: "pipe" });
  } catch {
    console.log("Not a git repo. Re-clone:");
    console.log(
      "  git clone https://github.com/qianhua76123-pixel/claude-code-buddy.git"
    );
    process.exit(1);
  }

  // Stash any local changes
  try {
    execSync("git stash", { cwd: root, stdio: "pipe" });
  } catch {
    // No changes to stash, fine
  }

  // Pull
  try {
    const output = execSync("git pull origin main", {
      cwd: root,
      encoding: "utf8",
    });
    console.log(output);
  } catch (e) {
    console.log("Git pull failed:", e.message);
    console.log("Try manually: cd " + root + " && git pull");
    process.exit(1);
  }

  // Re-install skills
  console.log("Reinstalling skills...");
  const skillDir = path.join(root, "claude-skill");
  for (const skill of ["pet", "pet-pixel", "pet-sync"]) {
    const src = path.join(skillDir, skill);
    const dst = path.join(SKILLS_DIR, skill);
    if (fs.existsSync(src)) {
      // Remove old and copy new
      fs.rmSync(dst, { recursive: true, force: true });
      fs.cpSync(src, dst, { recursive: true });
      console.log(`  + /${skill}`);
    }
  }

  // Copy hook script
  const hookSrc = path.join(skillDir, "hooks", "pet-hook.js");
  const updateSrc = path.join(skillDir, "hooks", "update-check.js");
  // Hooks are referenced by absolute path in settings.json, so they stay in project dir

  // Read new version
  const newVersion = getLocalVersion();
  console.log(`\nUpdated to v${newVersion?.version || "unknown"}`);

  if (newVersion?.changelog) {
    console.log(`Changelog: ${newVersion.changelog}`);
  }

  // Clear update cache
  saveCache({
    lastCheck: new Date().toISOString(),
    remoteVersion: newVersion?.version,
    updateAvailable: false,
  });

  console.log("\nRestart Claude Code to apply changes.");
}

// ── Mode: version ──
function version() {
  const local = getLocalVersion();
  if (local) {
    console.log(JSON.stringify(local, null, 2));
  } else {
    console.log("version.json not found");
  }
}

// ── Main ──
const mode = process.argv[2];
switch (mode) {
  case "check":
    check();
    break;
  case "update":
    update();
    break;
  case "version":
    version();
    break;
  default:
    console.log("AI Pet Update Checker");
    console.log("Usage: update-check.js [check|update|version]");
    console.log("  check   - Check for updates (silent if up-to-date)");
    console.log("  update  - Pull latest + reinstall skills");
    console.log("  version - Print current version");
}
