#!/bin/bash
# AI Pet - Core Plugin Installer (software only, zero dependencies)
#
# Usage:
#   git clone https://github.com/qianhua76123-pixel/claude-code-buddy.git
#   cd claude-code-buddy
#   bash install.sh
#
# Also works as updater: re-run to get latest version.
# For hardware/OpenClaw, run: bash hardware/setup.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SKILLS_DIR="$CLAUDE_DIR/skills"
HOOKS_DIR="$CLAUDE_DIR/hooks"

echo ""
echo "  ╭──────────────────────────────╮"
echo "  │  AI Pet - Plugin Installer   │"
echo "  │  Software only, 0 deps       │"
echo "  ╰──────────────────────────────╯"
echo ""

# Check Claude Code
if [ ! -d "$CLAUDE_DIR" ]; then
  echo "  ~/.claude/ not found. Install Claude Code first."
  exit 1
fi

mkdir -p "$SKILLS_DIR" "$HOOKS_DIR"

# ── Install Skills (SKILL.md files) ──

echo "  [1/3] Installing skills..."

for skill in pet pet-pixel pet-sync; do
  rm -rf "$SKILLS_DIR/$skill"
  cp -r "$SCRIPT_DIR/claude-skill/$skill" "$SKILLS_DIR/$skill"
  echo "    + /$skill"
done

# ── Install Hook Scripts (the actual logic files) ──

echo "  [2/3] Installing hook scripts..."

for script in pet-hook.js social.js home.js update-check.js; do
  SRC="$SCRIPT_DIR/claude-skill/hooks/$script"
  if [ -f "$SRC" ]; then
    cp "$SRC" "$HOOKS_DIR/$script"
    echo "    + $script"
  fi
done

# ── Configure Settings ──

echo "  [3/3] Configuring hooks & statusline..."

HOOK_DIR="$HOOKS_DIR"

if command -v node &>/dev/null; then
  node "$SCRIPT_DIR/install-settings.js" 2>/dev/null || true
else
  echo "    Node.js not found. Run 'node install-settings.js' manually."
fi

# ── Version stamp ──
if [ -f "$SCRIPT_DIR/version.json" ]; then
  cp "$SCRIPT_DIR/version.json" "$CLAUDE_DIR/ai-pet-version.json"
fi

echo ""
echo "  ╭──────────────────────────────────╮"
echo "  │  Done! Restart Claude Code.      │"
echo "  │                                  │"
echo "  │  /pet            Hatch your pet  │"
echo "  │  /pet quest      Daily quests    │"
echo "  │  /pet adventure  Dungeon crawl   │"
echo "  │  /pet home       Build your home │"
echo "  │  /pet card       Get friend code │"
echo "  │  /pet battle X   Fight friends!  │"
echo "  │  /pet visit X    Visit homes!    │"
echo "  │  /pet-pixel      Pixel art       │"
echo "  │                                  │"
echo "  │  No GitHub token needed.         │"
echo "  │  Social features work instantly. │"
echo "  │                                  │"
echo "  │  Hardware (optional):            │"
echo "  │  bash hardware/setup.sh          │"
echo "  ╰──────────────────────────────────╯"
echo ""
