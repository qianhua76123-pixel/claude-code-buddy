/**
 * AI Pet ESP32 Firmware
 *
 * Features:
 * - LCD pixel art pet display with animations
 * - WebSocket client connecting to MCP Bridge
 * - Cloud TTS (EdgeTTS) via Bridge server
 * - WiFi auto-config via WiFiManager
 * - Microphone input for voice commands
 *
 * Hardware:
 * - ESP32-S3 with PSRAM
 * - LCD screen (ST7789/ILI9341)
 * - I2S microphone (INMP441)
 * - I2S amplifier + speaker (MAX98357A)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <TFT_eSPI.h>
#include "pixel_arts.h"

using namespace websockets;

// --- Pin Configuration ---
// Adjust these for your specific board wiring
#define I2S_MIC_SCK   4
#define I2S_MIC_WS    5
#define I2S_MIC_SD    6

#define I2S_SPK_BCLK  15
#define I2S_SPK_LRC   16
#define I2S_SPK_DIN   17

// --- Display ---
TFT_eSPI tft = TFT_eSPI();
#define SCREEN_WIDTH  240
#define SCREEN_HEIGHT 280
#define PET_PIXEL_SIZE 12  // Each pixel art cell = 12x12 screen pixels
#define PET_OFFSET_X  36   // Center 16*12=192 in 240px width
#define PET_OFFSET_Y  44   // Vertical offset

// --- WebSocket ---
WebsocketsClient wsClient;
const char* WS_HOST = "ws://192.168.1.100:8765"; // MCP Bridge address
bool wsConnected = false;
unsigned long lastReconnect = 0;
const unsigned long RECONNECT_INTERVAL = 5000;

// --- Pet State ---
struct PetState {
  String name;
  String species;
  int level;
  int hunger;
  int happiness;
  int energy;
  int cleanliness;
  String emotion;
  String evolutionStage;
} petState;

// --- Animation ---
int currentFrame = 0;
unsigned long lastFrameTime = 0;
const unsigned long FRAME_INTERVAL = 800; // ms between animation frames
String currentEmotion = "neutral";

// --- Forward declarations ---
void drawPet();
void drawStatusBars();
void drawBackground();
void handleWebSocketMessage(WebsocketsMessage msg);
void connectWebSocket();
void setupWiFi();

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== AI Pet ESP32 ===");

  // Initialize display
  tft.init();
  tft.setRotation(0);
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString("AI Pet", 80, 120);
  tft.setTextSize(1);
  tft.drawString("Connecting WiFi...", 60, 150);

  // WiFi setup with captive portal
  setupWiFi();

  // Show connected status
  tft.fillScreen(TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString("WiFi OK!", 70, 120);
  tft.setTextSize(1);
  tft.drawString(WiFi.localIP().toString().c_str(), 60, 150);
  delay(1000);

  // Default pet state
  petState.name = "Pet";
  petState.species = "cat";
  petState.level = 1;
  petState.hunger = 70;
  petState.happiness = 70;
  petState.energy = 70;
  petState.cleanliness = 70;
  petState.emotion = "neutral";
  petState.evolutionStage = "baby";

  // Connect WebSocket
  connectWebSocket();

  // Draw initial screen
  drawBackground();
  drawPet();
  drawStatusBars();
}

void loop() {
  // WebSocket polling
  if (wsConnected) {
    wsClient.poll();
  } else {
    // Reconnect
    unsigned long now = millis();
    if (now - lastReconnect > RECONNECT_INTERVAL) {
      lastReconnect = now;
      connectWebSocket();
    }
  }

  // Animation frame update
  unsigned long now = millis();
  if (now - lastFrameTime > FRAME_INTERVAL) {
    lastFrameTime = now;
    currentFrame = (currentFrame + 1) % 2;
    drawPet();
  }
}

// --- WiFi Setup ---
void setupWiFi() {
  WiFiManager wm;
  wm.setConfigPortalTimeout(120); // 2 minute timeout

  // Auto-connect or start config portal
  if (!wm.autoConnect("AI-Pet-Setup")) {
    Serial.println("WiFi config portal timeout, restarting...");
    ESP.restart();
  }

  Serial.println("WiFi connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

// --- WebSocket ---
void connectWebSocket() {
  Serial.println("Connecting to MCP Bridge...");

  wsClient.onMessage(handleWebSocketMessage);

  wsClient.onEvent([](WebsocketsEvent event, String data) {
    if (event == WebsocketsEvent::ConnectionOpened) {
      Serial.println("WS Connected!");
      wsConnected = true;

      // Show connected indicator
      tft.fillCircle(SCREEN_WIDTH - 10, 10, 5, TFT_GREEN);
    } else if (event == WebsocketsEvent::ConnectionClosed) {
      Serial.println("WS Disconnected");
      wsConnected = false;
      tft.fillCircle(SCREEN_WIDTH - 10, 10, 5, TFT_RED);
    }
  });

  wsConnected = wsClient.connect(WS_HOST);

  if (!wsConnected) {
    Serial.println("WS connection failed, will retry...");
    tft.fillCircle(SCREEN_WIDTH - 10, 10, 5, TFT_RED);
  }
}

void handleWebSocketMessage(WebsocketsMessage msg) {
  Serial.print("WS msg: ");
  Serial.println(msg.data());

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, msg.data());
  if (err) {
    Serial.print("JSON parse error: ");
    Serial.println(err.c_str());
    return;
  }

  String type = doc["type"].as<String>();

  if (type == "state_update") {
    // Update pet state from Claude Code
    JsonObject data = doc["data"];
    petState.name = data["name"].as<String>();
    petState.species = data["species"].as<String>();
    petState.level = data["level"] | 1;
    petState.hunger = data["stats"]["hunger"] | 50;
    petState.happiness = data["stats"]["happiness"] | 50;
    petState.energy = data["stats"]["energy"] | 50;
    petState.cleanliness = data["stats"]["cleanliness"] | 50;
    petState.evolutionStage = data["evolutionStage"].as<String>();

    // Redraw everything
    drawBackground();
    drawPet();
    drawStatusBars();

  } else if (type == "emotion") {
    // Update emotion display
    currentEmotion = doc["emotion"].as<String>();
    drawPet();

  } else if (type == "speak") {
    // TTS playback
    // In a full implementation, this would:
    // 1. Receive audio data from bridge (or URL to audio)
    // 2. Play via I2S speaker
    // For now, show speech bubble on screen
    String text = doc["text"].as<String>();
    showSpeechBubble(text);

  } else if (type == "animate") {
    String animation = doc["animation"].as<String>();
    playAnimation(animation);

  } else if (type == "listen") {
    // Start microphone recording
    int duration = doc["duration"] | 5;
    // In full implementation: record audio, send to STT service, return text
    Serial.printf("Listen requested: %d seconds\n", duration);
  }
}

// --- Display Functions ---

void drawBackground() {
  // Gradient background
  for (int y = 0; y < SCREEN_HEIGHT; y++) {
    uint8_t r = map(y, 0, SCREEN_HEIGHT, 10, 40);
    uint8_t g = map(y, 0, SCREEN_HEIGHT, 15, 50);
    uint8_t b = map(y, 0, SCREEN_HEIGHT, 30, 80);
    uint16_t color = tft.color565(r, g, b);
    tft.drawFastHLine(0, y, SCREEN_WIDTH, color);
  }

  // Ground area
  tft.fillRect(0, SCREEN_HEIGHT - 40, SCREEN_WIDTH, 40, tft.color565(30, 60, 30));
}

void drawPixelArt(const uint8_t art[16][16]) {
  for (int y = 0; y < 16; y++) {
    for (int x = 0; x < 16; x++) {
      uint8_t colorIdx = art[y][x];
      if (colorIdx > 0) {
        uint16_t color = PET_PALETTE[colorIdx];
        int sx = PET_OFFSET_X + x * PET_PIXEL_SIZE;
        int sy = PET_OFFSET_Y + y * PET_PIXEL_SIZE;
        tft.fillRect(sx, sy, PET_PIXEL_SIZE, PET_PIXEL_SIZE, color);
      }
    }
  }
}

void drawPet() {
  // Clear pet area
  int petAreaX = PET_OFFSET_X;
  int petAreaY = PET_OFFSET_Y;
  int petAreaW = 16 * PET_PIXEL_SIZE;
  int petAreaH = 16 * PET_PIXEL_SIZE;

  // Redraw background in pet area
  for (int y = petAreaY; y < petAreaY + petAreaH && y < SCREEN_HEIGHT - 40; y++) {
    uint8_t r = map(y, 0, SCREEN_HEIGHT, 10, 40);
    uint8_t g = map(y, 0, SCREEN_HEIGHT, 15, 50);
    uint8_t b = map(y, 0, SCREEN_HEIGHT, 30, 80);
    uint16_t color = tft.color565(r, g, b);
    tft.drawFastHLine(petAreaX, y, petAreaW, color);
  }

  // Draw the right species/frame
  if (petState.species == "cat") {
    if (currentFrame == 0) drawPixelArt(CAT_IDLE_1);
    else drawPixelArt(CAT_IDLE_2);
  } else if (petState.species == "dragon") {
    drawPixelArt(DRAGON_IDLE_1);
  } else if (petState.species == "blob") {
    drawPixelArt(BLOB_IDLE_1);
  } else {
    // Default: cat
    drawPixelArt(CAT_IDLE_1);
  }
}

void drawStatusBars() {
  int barY = SCREEN_HEIGHT - 35;
  int barX = 10;
  int barW = 50;
  int barH = 6;
  int spacing = 55;

  tft.fillRect(0, SCREEN_HEIGHT - 40, SCREEN_WIDTH, 40, tft.color565(20, 40, 20));

  // Name and level
  tft.setTextColor(TFT_WHITE);
  tft.setTextSize(1);
  String header = petState.name + " Lv." + String(petState.level);
  tft.drawString(header.c_str(), 10, barY - 12);

  // Connection indicator
  tft.fillCircle(SCREEN_WIDTH - 10, 10, 5, wsConnected ? TFT_GREEN : TFT_RED);

  // Hunger bar
  tft.drawString("HP", barX, barY);
  drawBar(barX + 15, barY, barW, barH, petState.hunger, TFT_RED);

  // Happiness bar
  tft.drawString("HY", barX + spacing, barY);
  drawBar(barX + spacing + 15, barY, barW, barH, petState.happiness, TFT_YELLOW);

  // Energy bar
  tft.drawString("EN", barX + spacing * 2, barY);
  drawBar(barX + spacing * 2 + 15, barY, barW, barH, petState.energy, TFT_CYAN);

  // Clean bar
  tft.drawString("CL", barX + spacing * 3, barY);
  drawBar(barX + spacing * 3 + 15, barY, barW, barH, petState.cleanliness, TFT_GREEN);
}

void drawBar(int x, int y, int w, int h, int value, uint16_t color) {
  tft.drawRect(x, y, w, h, TFT_WHITE);
  int fillW = map(value, 0, 100, 0, w - 2);
  tft.fillRect(x + 1, y + 1, fillW, h - 2, color);
}

void showSpeechBubble(String text) {
  // Draw speech bubble above pet
  int bubbleY = PET_OFFSET_Y - 30;
  int bubbleW = min((int)(text.length() * 6 + 20), SCREEN_WIDTH - 20);
  int bubbleX = (SCREEN_WIDTH - bubbleW) / 2;

  tft.fillRoundRect(bubbleX, bubbleY, bubbleW, 24, 6, TFT_WHITE);
  tft.setTextColor(TFT_BLACK);
  tft.setTextSize(1);
  tft.drawString(text.substring(0, 30).c_str(), bubbleX + 8, bubbleY + 6);

  // Clear bubble after 3 seconds (non-blocking would be better)
  // In production, use a timer
}

void playAnimation(String animation) {
  // Simple animation effects
  if (animation == "dance") {
    for (int i = 0; i < 6; i++) {
      currentFrame = i % 2;
      drawPet();
      delay(200);
    }
  } else if (animation == "eat") {
    showSpeechBubble("nom nom nom~");
  } else if (animation == "sleep") {
    showSpeechBubble("zzz...");
  } else if (animation == "evolve") {
    // Flash effect
    for (int i = 0; i < 5; i++) {
      tft.fillScreen(TFT_WHITE);
      delay(100);
      drawBackground();
      drawPet();
      delay(100);
    }
    showSpeechBubble("EVOLUTION!");
  }

  drawStatusBars();
}
