#pragma once
#include <stdint.h>

/**
 * Pixel Cat Face Animation System
 *
 * The 1.46" round screen (412x412) IS the cat's face.
 * All expressions are drawn programmatically, not as bitmaps.
 *
 * Face layout (in a circle):
 *   - Background: warm color fill
 *   - Eyes: two pixel blocks, position and shape change per emotion
 *   - Nose: small inverted triangle
 *   - Mouth: line/curve, changes per emotion
 *   - Blush: optional pink squares on cheeks
 *   - Extras: zzz, hearts, sweat drops, etc.
 */

// ── Colors (RGB565) ──

#define CLR_BG         0xFD20  // Warm orange (cat face background)
#define CLR_BG_NIGHT   0x2945  // Dark blue (night mode)
#define CLR_EYE        0x0000  // Black
#define CLR_EYE_SHINE  0xFFFF  // White highlight in eye
#define CLR_NOSE       0xFB20  // Dark pink/salmon
#define CLR_MOUTH      0x4A28  // Dark brown
#define CLR_BLUSH      0xFB6D  // Pink blush
#define CLR_WHISKER    0x8410  // Gray whiskers
#define CLR_WHITE      0xFFFF
#define CLR_RED        0xF800
#define CLR_BLUE       0x001F
#define CLR_YELLOW     0xFFE0
#define CLR_GREEN      0x07E0
#define CLR_HEART      0xF81F  // Magenta/pink hearts

// ── Pixel block sizes (everything is blocky/Minecraft style) ──

#define PX 12  // Base pixel unit size (12x12 screen pixels = 1 "pixel block")

// ── Eye definitions ──
// Each eye is described by: x_offset, y_offset (from center), width, height in PX units
// Plus optional shine position

struct EyeFrame {
  int8_t lx, ly;     // Left eye offset from center (in PX units, negative = left/up)
  int8_t rx, ry;     // Right eye offset
  uint8_t w, h;      // Eye block size (in PX units)
  bool shine;        // Show white highlight pixel
  bool closed;       // Draw as horizontal line instead of block
};

struct MouthFrame {
  uint8_t type;      // 0=line, 1=smile, 2=open, 3=sad, 4=cat-w, 5=speaking
  uint8_t width;     // Width in PX units
};

struct FaceExpression {
  EyeFrame eyes;
  MouthFrame mouth;
  bool blush;        // Show blush squares
  bool sweat;        // Show sweat drop
  uint8_t extra;     // 0=none, 1=hearts, 2=zzz, 3=sparkle, 4=anger, 5=music
};

// ── Expression Presets ──

// Normal idle - default resting face
const FaceExpression FACE_NEUTRAL = {
  .eyes   = { .lx = -4, .ly = -2, .rx = 3, .ry = -2, .w = 2, .h = 2, .shine = true, .closed = false },
  .mouth  = { .type = 4, .width = 3 },  // Cat W mouth
  .blush  = false,
  .sweat  = false,
  .extra  = 0,
};

// Happy - squinting eyes, big smile, blush
const FaceExpression FACE_HAPPY = {
  .eyes   = { .lx = -4, .ly = -2, .rx = 3, .ry = -2, .w = 2, .h = 1, .shine = false, .closed = true },
  .mouth  = { .type = 1, .width = 4 },  // Smile
  .blush  = true,
  .sweat  = false,
  .extra  = 0,
};

// Excited - big eyes, open mouth, sparkles
const FaceExpression FACE_EXCITED = {
  .eyes   = { .lx = -4, .ly = -2, .rx = 3, .ry = -2, .w = 3, .h = 3, .shine = true, .closed = false },
  .mouth  = { .type = 2, .width = 3 },  // Open mouth
  .blush  = true,
  .sweat  = false,
  .extra  = 3,  // Sparkles
};

// Sad - droopy eyes, sad mouth
const FaceExpression FACE_SAD = {
  .eyes   = { .lx = -4, .ly = -1, .rx = 3, .ry = -1, .w = 2, .h = 2, .shine = true, .closed = false },
  .mouth  = { .type = 3, .width = 3 },  // Sad mouth
  .blush  = false,
  .sweat  = false,
  .extra  = 0,
};

// Sleepy - half-closed eyes, zzz
const FaceExpression FACE_SLEEPY = {
  .eyes   = { .lx = -4, .ly = -2, .rx = 3, .ry = -2, .w = 2, .h = 1, .shine = false, .closed = true },
  .mouth  = { .type = 0, .width = 2 },  // Small line
  .blush  = false,
  .sweat  = false,
  .extra  = 2,  // Zzz
};

// Angry - V-shaped eyebrows, grr mouth
const FaceExpression FACE_ANGRY = {
  .eyes   = { .lx = -4, .ly = -2, .rx = 3, .ry = -2, .w = 2, .h = 2, .shine = false, .closed = false },
  .mouth  = { .type = 0, .width = 4 },  // Tight line
  .blush  = false,
  .sweat  = false,
  .extra  = 4,  // Anger marks
};

// Love - heart eyes
const FaceExpression FACE_LOVE = {
  .eyes   = { .lx = -4, .ly = -2, .rx = 3, .ry = -2, .w = 2, .h = 2, .shine = false, .closed = false },
  .mouth  = { .type = 1, .width = 3 },  // Smile
  .blush  = true,
  .sweat  = false,
  .extra  = 1,  // Hearts floating
};

// Confused - one eye bigger, sweat drop
const FaceExpression FACE_CONFUSED = {
  .eyes   = { .lx = -4, .ly = -2, .rx = 3, .ry = -2, .w = 2, .h = 2, .shine = true, .closed = false },
  .mouth  = { .type = 0, .width = 2 },  // Small line
  .blush  = false,
  .sweat  = true,
  .extra  = 0,
};

// Sick - X eyes, green tint
const FaceExpression FACE_SICK = {
  .eyes   = { .lx = -4, .ly = -2, .rx = 3, .ry = -2, .w = 2, .h = 2, .shine = false, .closed = false },
  .mouth  = { .type = 3, .width = 2 },  // Wavy sad
  .blush  = false,
  .sweat  = true,
  .extra  = 0,
};

// Speaking - animated mouth
const FaceExpression FACE_SPEAKING = {
  .eyes   = { .lx = -4, .ly = -2, .rx = 3, .ry = -2, .w = 2, .h = 2, .shine = true, .closed = false },
  .mouth  = { .type = 5, .width = 3 },  // Speaking (alternates open/closed)
  .blush  = false,
  .sweat  = false,
  .extra  = 5,  // Music notes
};

// ── Animation sequences ──

// Blink animation: normal → half-closed → closed → half-closed → normal
// Triggered randomly every 3-5 seconds
const uint8_t BLINK_FRAMES = 4;
const uint8_t BLINK_SEQUENCE[] = { 0, 1, 2, 1 };  // 0=open, 1=half, 2=closed
const uint16_t BLINK_FRAME_MS = 80;  // 80ms per blink frame

// Idle breathing: slight Y offset oscillation
const uint8_t BREATHE_FRAMES = 8;
const int8_t BREATHE_Y_OFFSET[] = { 0, 0, -1, -1, -1, -1, 0, 0 };
const uint16_t BREATHE_FRAME_MS = 300;

// Speaking mouth toggle
const uint16_t SPEAK_TOGGLE_MS = 200;  // Mouth open/close every 200ms
