import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { WebSocketServer } from "ws";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// --- Config ---
const WS_PORT = 8765;
const STATE_FILE = join(homedir(), ".claude", "ai-pet-state.json");
const TASK_FILE = join(homedir(), ".claude", "ai-pet-tasks.json");

// ============================================================
//  PART 1: WebSocket Server for ESP32
// ============================================================

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

  ws.on("error", (err) => console.error(`[WS] Error:`, err.message));

  // Send current state + task queue on connect
  sendPetState();
  sendTaskQueue();
});

function sendToEsp(message) {
  if (!espClient || espClient.readyState !== 1) {
    throw new Error("ESP32 not connected. Power on device and connect to WiFi.");
  }
  espClient.send(JSON.stringify(message));
}

function loadPetState() {
  try { return JSON.parse(readFileSync(STATE_FILE, "utf8")); }
  catch { return null; }
}

function sendPetState() {
  const state = loadPetState();
  if (state && espClient) sendToEsp({ type: "state_update", data: state });
}

// Handle messages from ESP32
let pendingMicResolve = null;
function handleEspMessage(msg) {
  if (msg.type === "mic_text" && pendingMicResolve) {
    pendingMicResolve(msg.text);
    pendingMicResolve = null;
  }
  if (msg.type === "task_done") {
    markTaskDone(msg.taskId);
  }
}

// ============================================================
//  PART 2: Autonomous Task Engine
// ============================================================

function loadTasks() {
  try { return JSON.parse(readFileSync(TASK_FILE, "utf8")); }
  catch { return { tasks: [], lastCheck: null }; }
}

function saveTasks(data) {
  writeFileSync(TASK_FILE, JSON.stringify(data, null, 2));
}

function markTaskDone(taskId) {
  const data = loadTasks();
  const task = data.tasks.find((t) => t.id === taskId);
  if (task) {
    if (task.type === "once") {
      task.status = "done";
    } else if (task.type === "cron") {
      task.lastRun = new Date().toISOString();
    } else if (task.type === "counter") {
      task.current = 0; // reset counter
    }
    saveTasks(data);
  }
}

function sendTaskQueue() {
  const data = loadTasks();
  if (espClient) {
    sendToEsp({
      type: "task_queue",
      tasks: data.tasks.filter((t) => t.status !== "done"),
    });
  }
}

// Background tick: check cron tasks every 30s, push due tasks to ESP32
setInterval(() => {
  if (!espClient || espClient.readyState !== 1) return;

  const data = loadTasks();
  const now = new Date();

  for (const task of data.tasks) {
    if (task.status === "done") continue;

    if (task.type === "cron") {
      if (isCronDue(task.cron, now, task.lastRun)) {
        console.error(`[Task] Cron due: ${task.id}`);
        sendToEsp({ type: "exec_task", task });
        task.lastRun = now.toISOString();
      }
    } else if (task.type === "once") {
      const fireAt = new Date(task.fireAt);
      if (now >= fireAt && task.status !== "done") {
        console.error(`[Task] Once due: ${task.id}`);
        sendToEsp({ type: "exec_task", task });
        task.status = "done";
      }
    }
    // "counter" type is triggered by hooks, not by time
  }

  saveTasks(data);
}, 30000);

// Simple cron matcher (minute hour dom month dow)
function isCronDue(cronStr, now, lastRun) {
  if (!cronStr) return false;
  const parts = cronStr.split(" ");
  if (parts.length !== 5) return false;

  const [cronMin, cronHour, cronDom, cronMon, cronDow] = parts;
  const min = now.getMinutes(), hour = now.getHours();
  const dom = now.getDate(), mon = now.getMonth() + 1, dow = now.getDay();

  const match = (field, val) => {
    if (field === "*") return true;
    if (field.startsWith("*/")) return val % parseInt(field.slice(2)) === 0;
    if (field.includes(",")) return field.split(",").map(Number).includes(val);
    if (field.includes("-")) {
      const [lo, hi] = field.split("-").map(Number);
      return val >= lo && val <= hi;
    }
    return parseInt(field) === val;
  };

  if (!match(cronMin, min) || !match(cronHour, hour) ||
      !match(cronDom, dom) || !match(cronMon, mon) || !match(cronDow, dow)) {
    return false;
  }

  // Prevent double-fire within same minute
  if (lastRun) {
    const lastDate = new Date(lastRun);
    if (lastDate.getMinutes() === min && lastDate.getHours() === hour &&
        lastDate.getDate() === dom) {
      return false;
    }
  }
  return true;
}

// ============================================================
//  PART 3: MCP Server (Tools for Claude Code / OpenClaw)
// ============================================================

const server = new McpServer({
  name: "ai-pet-bridge",
  version: "2.0.0",
});

// --- Device Tools ---

server.tool("pet_status", "Get ESP32 hardware connection status and task queue summary", {}, async () => {
  const connected = espClient && espClient.readyState === 1;
  const state = loadPetState();
  const tasks = loadTasks();
  const activeTasks = tasks.tasks.filter((t) => t.status !== "done").length;

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        hardware_connected: connected,
        ws_port: WS_PORT,
        pet_name: state?.buddyName || null,
        pet_species: state?.buddySpecies || null,
        active_tasks: activeTasks,
        total_tasks: tasks.tasks.length,
      }, null, 2),
    }],
  };
});

server.tool("pet_speak", "Play text-to-speech on ESP32 speaker", {
  text: z.string().describe("Text for the pet to speak"),
  voice: z.string().optional().describe("TTS voice (default: zh-CN-XiaoxiaoNeural)"),
}, async ({ text, voice }) => {
  sendToEsp({ type: "speak", text, voice: voice || "zh-CN-XiaoxiaoNeural" });
  return { content: [{ type: "text", text: `Speaking: "${text}"` }] };
});

server.tool("pet_emotion", "Update pet emotion on ESP32 LCD", {
  emotion: z.enum(["happy","sad","angry","sleepy","excited","love","confused","sick","neutral"]).describe("Emotion to display"),
}, async ({ emotion }) => {
  sendToEsp({ type: "emotion", emotion });
  return { content: [{ type: "text", text: `Emotion: ${emotion}` }] };
});

server.tool("pet_push_state", "Push full pet state to ESP32", {}, async () => {
  const state = loadPetState();
  if (!state) return { content: [{ type: "text", text: "No pet state. Run /pet first." }] };
  sendToEsp({ type: "state_update", data: state });
  return { content: [{ type: "text", text: `Pushed: ${state.buddyName} Lv.${state.growth?.level}` }] };
});

server.tool("pet_animate", "Trigger animation on ESP32 LCD", {
  animation: z.enum(["idle","eat","play","sleep","evolve","dance","wave"]).describe("Animation to play"),
}, async ({ animation }) => {
  sendToEsp({ type: "animate", animation });
  return { content: [{ type: "text", text: `Animation: ${animation}` }] };
});

server.tool("pet_listen", "Listen on ESP32 mic, return transcribed text", {
  duration: z.number().optional().describe("Recording seconds (default: 5)"),
}, async ({ duration }) => {
  return new Promise((resolve) => {
    pendingMicResolve = (text) => {
      resolve({ content: [{ type: "text", text: `Heard: "${text}"` }] });
    };
    sendToEsp({ type: "listen", duration: duration || 5 });
    setTimeout(() => {
      if (pendingMicResolve) {
        pendingMicResolve = null;
        resolve({ content: [{ type: "text", text: "No speech detected." }] });
      }
    }, ((duration || 5) + 5) * 1000);
  });
});

// --- Autonomous Task Tools ---

server.tool(
  "pet_add_task",
  "Add an autonomous task for ESP32 to execute independently. Supports cron (recurring), once (one-time), and counter (event-triggered) task types. This is how the pet does things on its own after the conversation ends.",
  {
    id: z.string().describe("Unique task ID (e.g. 'drink_water', 'morning_greeting')"),
    type: z.enum(["cron", "once", "counter"]).describe("cron=recurring, once=one-time, counter=trigger after N events"),
    action: z.enum(["speak", "emotion", "animate", "weather", "custom"]).describe("What the pet does"),
    payload: z.string().describe("Text to speak, emotion name, or custom data"),
    cron: z.string().optional().describe("Cron expression for recurring tasks (e.g. '0 * * * *' = every hour)"),
    fireAt: z.string().optional().describe("ISO timestamp for one-time tasks"),
    threshold: z.number().optional().describe("Count threshold for counter tasks"),
    triggerEvent: z.string().optional().describe("Event name for counter (e.g. 'code_write')"),
  },
  async ({ id, type, action, payload, cron, fireAt, threshold, triggerEvent }) => {
    const data = loadTasks();

    // Remove existing task with same ID
    data.tasks = data.tasks.filter((t) => t.id !== id);

    const task = {
      id, type, action, payload, status: "active",
      createdAt: new Date().toISOString(),
      ...(type === "cron" && { cron, lastRun: null }),
      ...(type === "once" && { fireAt }),
      ...(type === "counter" && { threshold, triggerEvent, current: 0 }),
    };

    data.tasks.push(task);
    saveTasks(data);

    // Push to ESP32 if connected
    if (espClient && espClient.readyState === 1) {
      sendToEsp({ type: "task_queue", tasks: data.tasks.filter((t) => t.status !== "done") });
    }

    const desc = type === "cron" ? `Recurring: ${cron}`
      : type === "once" ? `One-time: ${fireAt}`
      : `After ${threshold} ${triggerEvent} events`;

    return { content: [{ type: "text", text: `Task added: ${id}\nType: ${desc}\nAction: ${action} → "${payload}"` }] };
  }
);

server.tool("pet_list_tasks", "List all autonomous tasks", {}, async () => {
  const data = loadTasks();
  if (data.tasks.length === 0) {
    return { content: [{ type: "text", text: "No tasks. Use pet_add_task to create autonomous behaviors." }] };
  }

  const lines = data.tasks.map((t) => {
    const status = t.status === "done" ? "DONE" : "ACTIVE";
    const schedule = t.type === "cron" ? `cron: ${t.cron}`
      : t.type === "once" ? `at: ${t.fireAt}`
      : `counter: ${t.current || 0}/${t.threshold} ${t.triggerEvent}`;
    return `[${status}] ${t.id} (${t.type}) - ${t.action}: "${t.payload}" | ${schedule}`;
  });

  return { content: [{ type: "text", text: lines.join("\n") }] };
});

server.tool("pet_remove_task", "Remove an autonomous task", {
  id: z.string().describe("Task ID to remove"),
}, async ({ id }) => {
  const data = loadTasks();
  const before = data.tasks.length;
  data.tasks = data.tasks.filter((t) => t.id !== id);
  saveTasks(data);

  if (espClient && espClient.readyState === 1) {
    sendToEsp({ type: "task_queue", tasks: data.tasks.filter((t) => t.status !== "done") });
  }

  return {
    content: [{
      type: "text",
      text: data.tasks.length < before ? `Removed task: ${id}` : `Task not found: ${id}`,
    }],
  };
});

server.tool("pet_clear_done", "Clear completed one-time tasks", {}, async () => {
  const data = loadTasks();
  const before = data.tasks.length;
  data.tasks = data.tasks.filter((t) => t.status !== "done");
  saveTasks(data);
  return { content: [{ type: "text", text: `Cleared ${before - data.tasks.length} done tasks.` }] };
});

// --- Counter Increment Tool (called by hooks) ---
server.tool("pet_increment_counter", "Increment counter tasks by event name. Called by hooks when coding events occur.", {
  event: z.string().describe("Event name (e.g. 'code_write')"),
}, async ({ event }) => {
  const data = loadTasks();
  const triggered = [];

  for (const task of data.tasks) {
    if (task.type === "counter" && task.triggerEvent === event && task.status !== "done") {
      task.current = (task.current || 0) + 1;
      if (task.current >= task.threshold) {
        // Threshold reached - execute task
        if (espClient && espClient.readyState === 1) {
          sendToEsp({ type: "exec_task", task });
        }
        task.current = 0; // Reset for next cycle
        triggered.push(task.id);
      }
    }
  }

  saveTasks(data);
  return {
    content: [{
      type: "text",
      text: triggered.length > 0
        ? `Triggered: ${triggered.join(", ")}`
        : `Incremented '${event}' counters.`,
    }],
  };
});

// ============================================================
//  PART 4: Start
// ============================================================

console.error(`[MCP Bridge v2.0] Starting...`);
console.error(`[WS] WebSocket server on port ${WS_PORT}`);
console.error(`[Tasks] Autonomous task engine active (30s tick)`);
console.error(`[MCP] Waiting for connection via stdio...`);

const transport = new StdioServerTransport();
await server.connect(transport);
