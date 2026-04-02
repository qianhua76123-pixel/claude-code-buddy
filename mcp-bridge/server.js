import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { WebSocketServer } from "ws";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// --- Config ---
const WS_PORT = 8765;
const STATE_FILE = join(homedir(), ".claude", "ai-pet-state.json");

// --- WebSocket Server for ESP32 ---
let espClient = null;
const wss = new WebSocketServer({ port: WS_PORT });

wss.on("connection", (ws, req) => {
  console.error(`[WS] ESP32 connected from ${req.socket.remoteAddress}`);
  espClient = ws;

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.error(`[WS] Received from ESP32:`, msg);
      handleEspMessage(msg);
    } catch (e) {
      console.error(`[WS] Parse error:`, e.message);
    }
  });

  ws.on("close", () => {
    console.error(`[WS] ESP32 disconnected`);
    espClient = null;
  });

  ws.on("error", (err) => {
    console.error(`[WS] Error:`, err.message);
  });

  // Send current pet state on connect
  sendPetState();
});

function sendToEsp(message) {
  if (!espClient || espClient.readyState !== 1) {
    throw new Error(
      "ESP32 not connected. Make sure the device is powered on and connected to WiFi."
    );
  }
  espClient.send(JSON.stringify(message));
}

function loadPetState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function sendPetState() {
  const state = loadPetState();
  if (state && espClient) {
    sendToEsp({ type: "state_update", data: state });
  }
}

// Handle messages from ESP32 (e.g., mic input)
let pendingMicResolve = null;
function handleEspMessage(msg) {
  if (msg.type === "mic_text" && pendingMicResolve) {
    pendingMicResolve(msg.text);
    pendingMicResolve = null;
  }
}

// --- MCP Server ---
const server = new McpServer({
  name: "ai-pet-bridge",
  version: "1.0.0",
});

// Tool: Check device status
server.tool("pet_status", "Get ESP32 hardware connection status", {}, async () => {
  const connected = espClient && espClient.readyState === 1;
  const state = loadPetState();

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            hardware_connected: connected,
            ws_port: WS_PORT,
            pet_exists: !!state,
            pet_name: state?.name || null,
            pet_species: state?.species || null,
          },
          null,
          2
        ),
      },
    ],
  };
});

// Tool: Make pet speak via TTS
server.tool(
  "pet_speak",
  "Play text-to-speech on the ESP32 speaker. The pet will say the given text aloud.",
  {
    text: z.string().describe("The text for the pet to speak"),
    voice: z
      .string()
      .optional()
      .describe(
        "TTS voice name (default: zh-CN-XiaoxiaoNeural for Chinese, en-US-AriaNeural for English)"
      ),
  },
  async ({ text, voice }) => {
    sendToEsp({
      type: "speak",
      text,
      voice: voice || "zh-CN-XiaoxiaoNeural",
    });

    return {
      content: [
        {
          type: "text",
          text: `Pet is speaking: "${text}"`,
        },
      ],
    };
  }
);

// Tool: Set pet emotion on display
server.tool(
  "pet_emotion",
  "Update the pet's emotion display on the ESP32 LCD screen",
  {
    emotion: z
      .enum([
        "happy",
        "sad",
        "angry",
        "sleepy",
        "excited",
        "love",
        "confused",
        "sick",
        "neutral",
      ])
      .describe("The emotion to display"),
  },
  async ({ emotion }) => {
    sendToEsp({ type: "emotion", emotion });

    return {
      content: [
        {
          type: "text",
          text: `Pet display updated to: ${emotion}`,
        },
      ],
    };
  }
);

// Tool: Push full pet state to hardware
server.tool(
  "pet_push_state",
  "Push the complete pet state to ESP32 for display synchronization",
  {},
  async () => {
    const state = loadPetState();
    if (!state) {
      return {
        content: [
          { type: "text", text: "No pet state found. Run /pet to create one." },
        ],
      };
    }

    sendToEsp({ type: "state_update", data: state });

    return {
      content: [
        { type: "text", text: `Pet state pushed to hardware: ${state.name} Lv.${state.level}` },
      ],
    };
  }
);

// Tool: Trigger animation
server.tool(
  "pet_animate",
  "Trigger a specific animation on the ESP32 LCD display",
  {
    animation: z
      .enum(["idle", "eat", "play", "sleep", "evolve", "dance", "wave"])
      .describe("The animation to play"),
  },
  async ({ animation }) => {
    sendToEsp({ type: "animate", animation });

    return {
      content: [
        { type: "text", text: `Playing animation: ${animation}` },
      ],
    };
  }
);

// Tool: Listen from ESP32 microphone
server.tool(
  "pet_listen",
  "Start listening on the ESP32 microphone. Returns transcribed text from the user's voice.",
  {
    duration: z
      .number()
      .optional()
      .describe("Recording duration in seconds (default: 5)"),
  },
  async ({ duration }) => {
    return new Promise((resolve) => {
      pendingMicResolve = (text) => {
        resolve({
          content: [{ type: "text", text: `User said: "${text}"` }],
        });
      };

      sendToEsp({ type: "listen", duration: duration || 5 });

      // Timeout after duration + 5s buffer
      setTimeout(() => {
        if (pendingMicResolve) {
          pendingMicResolve = null;
          resolve({
            content: [
              { type: "text", text: "No speech detected within timeout." },
            ],
          });
        }
      }, ((duration || 5) + 5) * 1000);
    });
  }
);

// --- Start ---
console.error(`[MCP Bridge] Starting...`);
console.error(`[WS] WebSocket server listening on port ${WS_PORT}`);
console.error(`[MCP] Waiting for Claude Code connection via stdio...`);

const transport = new StdioServerTransport();
await server.connect(transport);
