#!/bin/bash
# AI Pet - Core Plugin Installer (software only, zero dependencies)
#
# Usage:
#   git clone https://github.com/qianhua76123-pixel/claude-code-buddy.git
#   cd claude-code-buddy
#   bash install.sh
#
# This installs ONLY the core plugin (Skills + Hooks + StatusLine).
# For hardware/OpenClaw, run: bash hardware/setup.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SKILLS_DIR="$CLAUDE_DIR/skills"
HOOK_SCRIPT="$SCRIPT_DIR/claude-skill/hooks/pet-hook.js"

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

mkdir -p "$SKILLS_DIR"

# ── Install Skills ──

echo "  Installing skills..."

for skill in pet pet-pixel pet-sync; do
  rm -rf "$SKILLS_DIR/$skill"
  cp -r "$SCRIPT_DIR/claude-skill/$skill" "$SKILLS_DIR/$skill"
  echo "    + /$skill"
done

# ── Configure Settings ──

echo "  Configuring hooks..."

# Use the Node.js installer for safe merge (handles existing settings)
if command -v node &>/dev/null; then
  node "$SCRIPT_DIR/install-settings.js" 2>/dev/null
else
  echo "    Node.js not found. Run 'node install-settings.js' manually."
fi

echo ""
echo "  ╭──────────────────────────────────╮"
echo "  │  Done! Restart Claude Code.      │"
echo "  │                                  │"
echo "  │  /pet         Hatch your pet     │"
echo "  │  /pet feed    Feed it            │"
echo "  │  /pet play    Play with it       │"
echo "  │  /pet quest   Daily quests       │"
echo "  │  /pet adventure  Dungeon crawl   │"
echo "  │  /pet-pixel   Pixel art pattern  │"
echo "  │                                  │"
echo "  │  Hardware & OpenClaw (optional): │"
echo "  │  bash hardware/setup.sh          │"
echo "  ╰──────────────────────────────────╯"
echo ""
