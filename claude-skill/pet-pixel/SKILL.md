---
name: pet-pixel
description: "Generate pixel art patterns for your AI pet. Creates grid-based pixel art that can be used for cross-stitch, perler beads, or knitting patterns. Output as terminal preview and PNG file."
user-invocable: true
---

# Pet Pixel Art Generator

Generate pixel art representations of the user's AI pet for crafting purposes (cross-stitch, perler beads, knitting, crochet).

## How It Works

1. Read the pet state from `~/.claude/ai-pet-state.json`
2. Based on the pet's species, level, evolution stage, and appearance, generate a pixel art pattern
3. Output in multiple formats

## Commands

### `/pet-pixel` (no args) - Generate default pixel art
Generate a 16x16 pixel art of the pet in its current state.

### `/pet-pixel large` - Generate 32x32 version
Larger, more detailed pixel art.

### `/pet-pixel grid` - Generate with grid overlay
Add grid lines and color codes for crafting.

### `/pet-pixel palette` - Show color palette
List all colors used with hex codes and suggested yarn/bead colors.

## Output Format

### Terminal Preview
Display the pixel art using Unicode block characters (█, ▄, ▀, ░) with ANSI colors in a code block.

Example 16x16 cat:
```
    ██  ██
   ████████
  ██▓▓▓▓▓▓██
  ██●▓▓●▓▓██
  ██▓▓▓▓▓▓██
  ██▓▓██▓▓██
   ████████
   ██    ██
  ████  ████
```

### Grid Pattern (for crafting)
Output a numbered grid where each cell has a color code:

```
Pixel Grid Pattern: Mochi the Cat (16x16)
Color Legend: W=White, B=Black, P=Pink, G=Gray, Y=Yellow

Row 01: . . . . B B . . B B . . . . . .
Row 02: . . . B G G B B G G B . . . . .
Row 03: . . B G G G G G G G G B . . . .
Row 04: . . B G B G G B G G G B . . . .
Row 05: . . B G G G G G G G G B . . . .
...
```

### PNG File
Use the Bash tool to generate a PNG file using a Node.js script or Python script. Save to `~/.claude/pet-pixel-art/[petname]-[timestamp].png`.

Generate the PNG with this approach:
```bash
node -e "
const { createCanvas } = require('canvas');
// ... generate pixel art programmatically
"
```

If `canvas` is not available, output the grid pattern as a simple HTML file that can be opened in a browser, and mention the user can screenshot it.

## Species Pixel Art Templates

Each species has a base pixel template that gets modified by:
- **Evolution stage**: baby=simpler/rounder, adult=more detailed
- **Color**: pet's primary color applied to base template
- **Accessory**: hat/scarf/glasses overlaid on top
- **Shiny**: sparkle effects added (✨ border pixels)
- **Level**: higher level = more detail/embellishments

### Design Guidelines
- Use a limited palette (4-8 colors max) for crafting feasibility
- Keep shapes recognizable at small size
- Baby versions: rounder, bigger head-to-body ratio
- Adult versions: more defined features, accessories visible
- Always include a 1-pixel black outline for clarity

## Crafting Instructions

After generating the pixel art, include:

1. **Dimensions**: "This pattern is 16x16 = 256 pixels total"
2. **Color count**: List each color and how many pixels it uses
3. **Suggested materials**:
   - Cross-stitch: 14-count Aida cloth, DMC floss colors
   - Perler beads: bead color names
   - Knitting: yarn weight and colorway suggestions
4. **Estimated time**: rough crafting time estimate
5. **Difficulty**: easy/medium/hard based on color count

## Important

- Always read pet state first to get species, appearance, evolution stage
- If no pet exists, prompt user to run `/pet` first to hatch one
- Save generated patterns for later reference
- Make the art cute and recognizable - this is key for social media sharing
