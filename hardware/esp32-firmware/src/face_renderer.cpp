/**
 * Pixel Cat Face Renderer
 *
 * Draws pixel-block cat face expressions on the 1.46" round LCD (412x412).
 * The screen IS the cat's face - everything is drawn programmatically.
 *
 * All drawing uses "pixel blocks" (PX x PX squares) for the Minecraft aesthetic.
 */

#include <TFT_eSPI.h>
#include "face_animations.h"

extern TFT_eSPI tft;

// Screen center
#define CX 206   // 412/2
#define CY 206

// Current state
static FaceExpression currentFace = FACE_NEUTRAL;
static uint32_t lastBlinkTime = 0;
static uint32_t nextBlinkInterval = 3000;
static uint8_t blinkFrame = 255;  // 255 = not blinking
static uint8_t breatheFrame = 0;
static uint32_t lastBreatheTime = 0;
static bool speakMouthOpen = false;
static uint32_t lastSpeakToggle = 0;

// ── Drawing Primitives ──

// Draw a filled pixel block (Minecraft-style square)
void drawBlock(int bx, int by, int bw, int bh, uint16_t color) {
  int sx = CX + bx * PX;
  int sy = CY + by * PX;
  tft.fillRect(sx, sy, bw * PX, bh * PX, color);
}

// Draw a single PX-sized block
void drawPx(int bx, int by, uint16_t color) {
  drawBlock(bx, by, 1, 1, color);
}

// ── Face Drawing ──

void drawBackground(bool nightMode) {
  uint16_t bg = nightMode ? CLR_BG_NIGHT : CLR_BG;

  // Fill circle (the round screen area)
  tft.fillCircle(CX, CY, 200, bg);

  // Slightly darker ring at the edge for depth
  for (int r = 195; r < 200; r++) {
    tft.drawCircle(CX, CY, r, tft.color565(180, 110, 40));
  }
}

void drawEyes(const EyeFrame& eyes, int8_t yBreathe, uint8_t blinkState) {
  int8_t ly = eyes.ly + yBreathe;
  int8_t ry = eyes.ry + yBreathe;

  if (blinkState == 2 || eyes.closed) {
    // Fully closed - horizontal line
    drawBlock(eyes.lx, ly, eyes.w, 1, CLR_EYE);
    drawBlock(eyes.rx, ry, eyes.w, 1, CLR_EYE);
  } else if (blinkState == 1) {
    // Half closed
    drawBlock(eyes.lx, ly, eyes.w, max(1, eyes.h / 2), CLR_EYE);
    drawBlock(eyes.rx, ry, eyes.w, max(1, eyes.h / 2), CLR_EYE);
  } else {
    // Open
    drawBlock(eyes.lx, ly, eyes.w, eyes.h, CLR_EYE);
    drawBlock(eyes.rx, ry, eyes.w, eyes.h, CLR_EYE);

    // Shine highlight (top-right pixel of each eye)
    if (eyes.shine) {
      drawPx(eyes.lx + eyes.w - 1, ly, CLR_EYE_SHINE);
      drawPx(eyes.rx + eyes.w - 1, ry, CLR_EYE_SHINE);
    }
  }
}

void drawNose(int8_t yBreathe) {
  // Small inverted triangle nose
  int ny = 1 + yBreathe;  // Below center
  drawPx(0, ny, CLR_NOSE);
  drawPx(-1, ny - 1, CLR_NOSE);
  drawPx(0, ny - 1, CLR_NOSE);
}

void drawMouth(const MouthFrame& mouth, int8_t yBreathe, bool speakOpen) {
  int my = 3 + yBreathe;  // Below nose
  int hw = mouth.width / 2;

  switch (mouth.type) {
    case 0:  // Flat line
      for (int i = -hw; i <= hw; i++) drawPx(i, my, CLR_MOUTH);
      break;

    case 1:  // Smile (curved up)
      for (int i = -hw; i <= hw; i++) drawPx(i, my, CLR_MOUTH);
      drawPx(-hw - 1, my - 1, CLR_MOUTH);
      drawPx(hw + 1, my - 1, CLR_MOUTH);
      break;

    case 2:  // Open mouth (rectangle)
      for (int i = -hw; i <= hw; i++) {
        drawPx(i, my, CLR_MOUTH);
        drawPx(i, my + 1, CLR_MOUTH);
      }
      // Tongue
      drawPx(0, my + 1, CLR_NOSE);
      drawPx(1, my + 1, CLR_NOSE);
      break;

    case 3:  // Sad (curved down)
      for (int i = -hw; i <= hw; i++) drawPx(i, my, CLR_MOUTH);
      drawPx(-hw - 1, my + 1, CLR_MOUTH);
      drawPx(hw + 1, my + 1, CLR_MOUTH);
      break;

    case 4:  // Cat W mouth (signature cat mouth)
      // The classic cat :3 mouth as pixel blocks
      drawPx(-2, my, CLR_MOUTH);
      drawPx(-1, my + 1, CLR_MOUTH);
      drawPx(0, my, CLR_MOUTH);
      drawPx(1, my + 1, CLR_MOUTH);
      drawPx(2, my, CLR_MOUTH);
      break;

    case 5:  // Speaking (alternating open/closed)
      if (speakOpen) {
        // Open
        for (int i = -hw; i <= hw; i++) {
          drawPx(i, my, CLR_MOUTH);
          drawPx(i, my + 1, CLR_EYE);  // Dark inside
          drawPx(i, my + 2, CLR_MOUTH);
        }
      } else {
        // Closed
        for (int i = -hw; i <= hw; i++) drawPx(i, my, CLR_MOUTH);
      }
      break;
  }
}

void drawWhiskers(int8_t yBreathe) {
  int wy = 2 + yBreathe;
  // Left whiskers
  drawPx(-6, wy - 1, CLR_WHISKER);
  drawPx(-7, wy - 1, CLR_WHISKER);
  drawPx(-6, wy, CLR_WHISKER);
  drawPx(-7, wy + 1, CLR_WHISKER);
  drawPx(-6, wy + 1, CLR_WHISKER);

  // Right whiskers
  drawPx(6, wy - 1, CLR_WHISKER);
  drawPx(7, wy - 1, CLR_WHISKER);
  drawPx(6, wy, CLR_WHISKER);
  drawPx(7, wy + 1, CLR_WHISKER);
  drawPx(6, wy + 1, CLR_WHISKER);
}

void drawBlush(int8_t yBreathe) {
  int by = 1 + yBreathe;
  // Left cheek blush (2x2 pink blocks)
  drawBlock(-6, by, 2, 1, CLR_BLUSH);
  // Right cheek blush
  drawBlock(5, by, 2, 1, CLR_BLUSH);
}

void drawExtras(uint8_t type, uint32_t animTime) {
  int frame = (animTime / 500) % 4;  // Animate every 500ms

  switch (type) {
    case 1:  // Hearts floating up
      drawPx(-3 + frame, -6 - frame, CLR_HEART);
      drawPx(4 - frame, -5 - frame, CLR_HEART);
      break;

    case 2:  // Zzz
      if (frame < 3) {
        // Draw Z letters going up-right
        int zx = 4 + frame * 2;
        int zy = -4 - frame * 2;
        drawPx(zx, zy, CLR_WHITE);
        drawPx(zx + 1, zy, CLR_WHITE);
        drawPx(zx, zy + 1, CLR_WHITE);
        drawPx(zx + 1, zy - 1, CLR_WHITE);
      }
      break;

    case 3:  // Sparkles
      if (frame == 0 || frame == 2) {
        drawPx(-7, -6, CLR_YELLOW);
        drawPx(7, -5, CLR_YELLOW);
        drawPx(-5, -8, CLR_YELLOW);
      }
      if (frame == 1 || frame == 3) {
        drawPx(-6, -7, CLR_YELLOW);
        drawPx(6, -6, CLR_YELLOW);
        drawPx(5, -8, CLR_YELLOW);
      }
      break;

    case 4:  // Anger marks (# shaped)
      drawPx(5, -6, CLR_RED);
      drawPx(6, -6, CLR_RED);
      drawPx(5, -7, CLR_RED);
      drawPx(6, -7, CLR_RED);
      drawPx(5, -5, CLR_RED);
      drawPx(7, -7, CLR_RED);
      break;

    case 5:  // Music notes
      if (frame < 2) {
        drawPx(5 + frame, -5 - frame, CLR_BLUE);
        drawPx(5 + frame, -6 - frame, CLR_BLUE);
        drawPx(6 + frame, -7 - frame, CLR_BLUE);
      }
      break;
  }
}

// ── Main Render Function ──

void renderFace(bool nightMode) {
  uint32_t now = millis();
  int8_t yOff = BREATHE_Y_OFFSET[breatheFrame];

  drawBackground(nightMode);
  drawWhiskers(yOff);

  // Determine blink state
  uint8_t blinkState = 0;
  if (blinkFrame < BLINK_FRAMES) {
    blinkState = BLINK_SEQUENCE[blinkFrame];
  }

  drawEyes(currentFace.eyes, yOff, blinkState);
  drawNose(yOff);
  drawMouth(currentFace.mouth, yOff, speakMouthOpen);

  if (currentFace.blush) drawBlush(yOff);
  if (currentFace.extra > 0) drawExtras(currentFace.extra, now);
}

// ── Animation Tick (call this in loop()) ──

void tickFaceAnimation() {
  uint32_t now = millis();

  // Breathing animation
  if (now - lastBreatheTime > BREATHE_FRAME_MS) {
    lastBreatheTime = now;
    breatheFrame = (breatheFrame + 1) % BREATHE_FRAMES;
  }

  // Blink animation
  if (blinkFrame < BLINK_FRAMES) {
    // Currently blinking
    if (now - lastBlinkTime > BLINK_FRAME_MS) {
      lastBlinkTime = now;
      blinkFrame++;
      if (blinkFrame >= BLINK_FRAMES) {
        blinkFrame = 255;  // Done blinking
        nextBlinkInterval = 2000 + (esp_random() % 4000);  // 2-6s until next blink
      }
    }
  } else {
    // Waiting to blink
    if (now - lastBlinkTime > nextBlinkInterval) {
      blinkFrame = 0;
      lastBlinkTime = now;
    }
  }

  // Speaking mouth toggle
  if (currentFace.mouth.type == 5) {
    if (now - lastSpeakToggle > SPEAK_TOGGLE_MS) {
      lastSpeakToggle = now;
      speakMouthOpen = !speakMouthOpen;
    }
  }
}

// ── Expression Setters ──

void setExpression(const char* emotion) {
  String e = String(emotion);

  if (e == "happy") currentFace = FACE_HAPPY;
  else if (e == "excited") currentFace = FACE_EXCITED;
  else if (e == "sad") currentFace = FACE_SAD;
  else if (e == "sleepy") currentFace = FACE_SLEEPY;
  else if (e == "angry") currentFace = FACE_ANGRY;
  else if (e == "love") currentFace = FACE_LOVE;
  else if (e == "confused") currentFace = FACE_CONFUSED;
  else if (e == "sick") currentFace = FACE_SICK;
  else if (e == "speaking") currentFace = FACE_SPEAKING;
  else currentFace = FACE_NEUTRAL;
}

const FaceExpression& getCurrentFace() {
  return currentFace;
}
