#!/bin/bash
# AI Pet - One-click installer for Claude Code
# Usage: git clone https://github.com/qianhua76123-pixel/claude-code-buddy.git && cd claude-code-buddy && bash install.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SKILLS_DIR="$CLAUDE_DIR/skills"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
HOOK_SCRIPT="$SCRIPT_DIR/claude-skill/hooks/pet-hook.js"

echo "=== AI Pet Installer ==="
echo ""

# 1. Check Claude Code exists
if [ ! -d "$CLAUDE_DIR" ]; then
  echo "Error: ~/.claude/ not found. Is Claude Code installed?"
  exit 1
fi

# 2. Create skills directory if needed
mkdir -p "$SKILLS_DIR"

# 3. Copy skills (symlink so updates from git pull auto-apply)
echo "[1/3] Installing skills..."
for skill in pet pet-pixel pet-sync; do
  rm -rf "$SKILLS_DIR/$skill"
  if command -v mklink &>/dev/null || [ "$(uname -o 2>/dev/null)" = "Msys" ] || [ "$(uname -o 2>/dev/null)" = "Cygwin" ]; then
    # Windows: copy instead of symlink (symlinks need admin)
    cp -r "$SCRIPT_DIR/claude-skill/$skill" "$SKILLS_DIR/$skill"
  else
    # macOS/Linux: symlink
    ln -sf "$SCRIPT_DIR/claude-skill/$skill" "$SKILLS_DIR/$skill"
  fi
  echo "  + /$(cat "$SKILLS_DIR/$skill/SKILL.md" | grep "^name:" | head -1 | sed 's/name: *//' | tr -d '"')"
done

# 4. Configure settings.json
echo "[2/3] Configuring hooks & statusline..."

# Escape path for JSON (handle backslashes on Windows)
HOOK_PATH=$(echo "$HOOK_SCRIPT" | sed 's/\\/\\\\/g')

if [ ! -f "$SETTINGS_FILE" ]; then
  # No settings file - create one
  cat > "$SETTINGS_FILE" << SETTINGS_EOF
{
  "statusLine": {
    "type": "command",
    "command": "node \"$HOOK_PATH\" statusline"
  },
  "hooks": {
    "SessionStart": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "node \"$HOOK_PATH\" on-session"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "node \"$HOOK_PATH\" on-code"
      }]
    }]
  }
}
SETTINGS_EOF
  echo "  Created $SETTINGS_FILE"
else
  # Settings file exists - check if already configured
  if grep -q "ai-pet" "$SETTINGS_FILE" 2>/dev/null || grep -q "pet-hook" "$SETTINGS_FILE" 2>/dev/null; then
    echo "  Settings already configured, skipping."
  else
    echo ""
    echo "  Your settings.json already exists. Please add manually:"
    echo ""
    echo "  Add to \"statusLine\":"
    echo "    { \"type\": \"command\", \"command\": \"node \\\"$HOOK_PATH\\\" statusline\" }"
    echo ""
    echo "  Add to \"hooks.SessionStart\":"
    echo "    [{ \"matcher\": \"\", \"hooks\": [{ \"type\": \"command\", \"command\": \"node \\\"$HOOK_PATH\\\" on-session\" }] }]"
    echo ""
    echo "  Add to \"hooks.PostToolUse\":"
    echo "    [{ \"matcher\": \"Write|Edit\", \"hooks\": [{ \"type\": \"command\", \"command\": \"node \\\"$HOOK_PATH\\\" on-code\" }] }]"
    echo ""
    echo "  Or run: node install-settings.js"
  fi
fi

# 5. Install MCP Bridge dependencies (optional)
echo "[3/3] MCP Bridge setup..."
if command -v npm &>/dev/null; then
  if [ -f "$SCRIPT_DIR/mcp-bridge/package.json" ]; then
    cd "$SCRIPT_DIR/mcp-bridge" && npm install --silent 2>/dev/null && cd "$SCRIPT_DIR"
    echo "  MCP Bridge dependencies installed."
    echo "  To start: cd mcp-bridge && npm start"
  fi
else
  echo "  npm not found, skipping MCP Bridge. Install Node.js to use hardware features."
fi

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Next steps:"
echo "  1. Restart Claude Code"
echo "  2. Type /pet to hatch your first pet!"
echo "  3. Type /pet-pixel to generate pixel art"
echo ""
echo "Optional hardware:"
echo "  - Buy ESP32-S3 with LCD (~130 RMB on Taobao)"
echo "  - Flash firmware: cd esp32-firmware && pio run -t upload"
echo "  - Start bridge: cd mcp-bridge && npm start"
echo "  - In Claude Code: /pet-sync connect"
echo ""
