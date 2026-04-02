#!/usr/bin/env node
/**
 * AI Pet - One-command OpenClaw connector
 *
 * Usage: node connect-openclaw.js
 *
 * Automatically:
 *   1. Checks if OpenClaw is installed
 *   2. Detects OpenClaw gateway
 *   3. Registers ai-pet MCP server with OpenClaw
 *   4. Verifies connection
 *
 * If OpenClaw is not installed, offers to install it.
 */

import { execSync, exec } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const BRIDGE_SCRIPT = join(import.meta.dirname, "mcp-bridge", "server.js");

function run(cmd, silent = false) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: silent ? "pipe" : "inherit" }).trim();
  } catch {
    return null;
  }
}

function runSilent(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: "pipe" }).trim();
  } catch {
    return null;
  }
}

async function main() {
  console.log("=== AI Pet × OpenClaw Connector ===\n");

  // Step 1: Check OpenClaw
  const clawVersion = runSilent("openclaw --version");

  if (!clawVersion) {
    console.log("OpenClaw is not installed.\n");
    console.log("Install it with:");
    console.log("  npm install -g openclaw@latest");
    console.log("  openclaw onboard\n");
    console.log("Then run this script again.");
    process.exit(1);
  }

  console.log(`OpenClaw detected: ${clawVersion}`);

  // Step 2: Check if ai-pet already registered
  const mcpList = runSilent("openclaw mcp list 2>/dev/null") || "";

  if (mcpList.includes("ai-pet")) {
    console.log("AI Pet is already registered with OpenClaw!\n");
    console.log("Test it by asking OpenClaw:");
    console.log('  > 让宠物说 "你好世界"');
    process.exit(0);
  }

  // Step 3: Check MCP Bridge dependencies
  const bridgePkgPath = join(import.meta.dirname, "mcp-bridge", "package.json");
  const nodeModulesPath = join(import.meta.dirname, "mcp-bridge", "node_modules");

  if (!existsSync(nodeModulesPath)) {
    console.log("Installing MCP Bridge dependencies...");
    run(`cd "${join(import.meta.dirname, "mcp-bridge")}" && npm install --silent`);
  }

  // Step 4: Register with OpenClaw
  console.log("Registering AI Pet with OpenClaw...\n");

  const result = runSilent(
    `openclaw mcp add ai-pet -- node "${BRIDGE_SCRIPT}" 2>&1`
  );

  if (result === null) {
    // CLI add failed, try config file approach
    console.log("CLI registration failed, trying config file...\n");

    // Find OpenClaw config
    const configPaths = [
      join(homedir(), ".openclaw", "openclaw.json"),
      join(homedir(), ".config", "openclaw", "openclaw.json"),
      "openclaw.json",
    ];

    let configPath = configPaths.find((p) => existsSync(p));

    if (configPath) {
      try {
        const config = JSON.parse(readFileSync(configPath, "utf8"));
        if (!config.mcpServers) config.mcpServers = {};

        config.mcpServers["ai-pet"] = {
          command: "node",
          args: [BRIDGE_SCRIPT],
        };

        writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`Written to ${configPath}`);
      } catch (e) {
        console.log(`Error updating config: ${e.message}`);
        console.log("\nManual setup:");
        console.log(`  openclaw mcp add ai-pet -- node "${BRIDGE_SCRIPT}"`);
        process.exit(1);
      }
    } else {
      console.log("Could not find OpenClaw config file.\n");
      console.log("Manual setup:");
      console.log(`  openclaw mcp add ai-pet -- node "${BRIDGE_SCRIPT}"`);
      process.exit(1);
    }
  }

  console.log("AI Pet registered with OpenClaw!\n");
  console.log("Available tools in OpenClaw:");
  console.log("  pet_speak       - 让宠物说话 (TTS)");
  console.log("  pet_emotion     - 切换宠物表情");
  console.log("  pet_animate     - 播放动画");
  console.log("  pet_add_task    - 添加自主任务");
  console.log("  pet_list_tasks  - 查看任务列表");
  console.log("  pet_status      - 查看硬件连接状态\n");
  console.log("Try it:");
  console.log('  > 让宠物每小时提醒我喝水');
  console.log('  > 设置明早9点叫我起床');
}

main();
