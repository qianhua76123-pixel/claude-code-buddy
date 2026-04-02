#!/usr/bin/env node
/**
 * AI Pet - Social Layer (GitHub-Powered)
 *
 * Friend codes for easy social: /pet card → get code → share → /pet friend ABC-1234
 * No GitHub token needed for basic friend features (read-only public data).
 * Token only needed for: publishing cards, creating battles.
 *
 * Usage:
 *   node social.js card-publish          Publish/update pet card → get friend code
 *   node social.js card-view <code>      View pet card by friend code
 *   node social.js friend-add <code>     Add friend by code (e.g. PXL-7A3F)
 *   node social.js friend-list           List friends and their pets
 *   node social.js friend-remove <code>  Remove friend
 *   node social.js battle-create <code>  Challenge by friend code
 *   node social.js battle-check          Check pending challenges
 *   node social.js battle-accept <id>    Accept a challenge
 *   node social.js battle-result <id>    View battle result
 *   node social.js rank                  Friend leaderboard
 *
 * Requires: GitHub token for write ops (card-publish, battle-create)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const STATE_FILE = path.join(CLAUDE_DIR, "ai-pet-state.json");
const FRIENDS_FILE = path.join(CLAUDE_DIR, "ai-pet-friends.json");
const CARD_ID_FILE = path.join(CLAUDE_DIR, "ai-pet-card-gist-id");
const BATTLE_REPO = "qianhua76123-pixel/claude-code-buddy";

// ── Public Registry Gist ──
// One shared Gist that maps friend codes → card Gist IDs
// This is owned by the project maintainer and is world-readable
const REGISTRY_GIST_ID = ""; // Will be created on first card-publish if empty

// ── GitHub Token ──
function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const settings = JSON.parse(fs.readFileSync(path.join(CLAUDE_DIR, "settings.json"), "utf8"));
    // Try common env var locations in settings
    return settings.env?.GITHUB_TOKEN || null;
  } catch { return null; }
}

// ── HTTP Helper ──
function ghApi(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const options = {
      hostname: "api.github.com",
      path: endpoint,
      method,
      headers: {
        "User-Agent": "ai-pet-buddy",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token && { "Authorization": `Bearer ${token}` }),
        ...(body && { "Content-Type": "application/json" }),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data || "{}") });
        } catch {
          resolve({ status: res.statusCode, data: {} });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Data Loaders ──
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); }
  catch { return null; }
}

function loadFriends() {
  try { return JSON.parse(fs.readFileSync(FRIENDS_FILE, "utf8")); }
  catch { return { friends: [], pendingRequests: [], blocked: [] }; }
}

function saveFriends(data) {
  fs.writeFileSync(FRIENDS_FILE, JSON.stringify(data, null, 2));
}

function getCardGistId() {
  try { return fs.readFileSync(CARD_ID_FILE, "utf8").trim(); }
  catch { return null; }
}

function saveCardGistId(id) {
  fs.writeFileSync(CARD_ID_FILE, id);
}

// ── Friend Code ──
// Format: 3-letter species prefix + "-" + 4-char hex from username hash
// Example: PXL-7A3F, CAT-B2E1, DRG-9F0C

function generateFriendCode(username, species) {
  // Species prefix (3 chars)
  const prefixMap = {
    cat: "CAT", dog: "DOG", cactus: "PXL", dragon: "DRG", blob: "BLB",
    bunny: "BNY", owl: "OWL", penguin: "PNG", turtle: "TRT", octopus: "OCT",
    rabbit: "RBT", axolotl: "AXL", capybara: "CPY", ghost: "GHO",
    robot: "BOT", mushroom: "MSH", snail: "SNL", goose: "GOS", chonk: "CHK",
  };
  const prefix = prefixMap[species] || "PET";

  // Hash username → 4 hex chars
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = ((hash << 5) - hash + username.charCodeAt(i)) | 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().slice(0, 4).padStart(4, "0");

  return `${prefix}-${hex}`;
}

function parseFriendCode(code) {
  // Accept formats: PXL-7A3F, pxl-7a3f, PXL7A3F, @username
  code = code.trim().toUpperCase();
  if (code.startsWith("@")) return { type: "username", value: code.slice(1) };
  code = code.replace(/[^A-Z0-9-]/g, "");
  if (code.length === 7 && code[3] === "-") return { type: "code", value: code };
  if (code.length === 7) return { type: "code", value: code.slice(0, 3) + "-" + code.slice(3) };
  return { type: "unknown", value: code };
}

// ── Registry (public Gist: maps friend codes to card Gist IDs) ──
const REGISTRY_FILE = path.join(CLAUDE_DIR, "ai-pet-registry-gist-id");

function getRegistryGistId() {
  // Check local cache first
  try { return fs.readFileSync(REGISTRY_FILE, "utf8").trim(); }
  catch { return null; }
}

function saveRegistryGistId(id) {
  fs.writeFileSync(REGISTRY_FILE, id);
}

async function loadRegistry() {
  let regId = getRegistryGistId();

  if (!regId) {
    // Search for existing registry gist by description
    const res = await ghApi("GET", `/gists?per_page=100`);
    if (res.status === 200) {
      const found = res.data.find(g => g.description?.includes("ai-pet-registry"));
      if (found) {
        regId = found.id;
        saveRegistryGistId(regId);
      }
    }
  }

  if (regId) {
    const res = await ghApi("GET", `/gists/${regId}`);
    if (res.status === 200 && res.data.files?.["registry.json"]) {
      try { return { id: regId, data: JSON.parse(res.data.files["registry.json"].content) }; }
      catch { return { id: regId, data: { players: {} } }; }
    }
  }

  return { id: null, data: { players: {} } };
}

async function saveRegistry(regId, registryData) {
  const content = JSON.stringify(registryData, null, 2);

  if (regId) {
    await ghApi("PATCH", `/gists/${regId}`, {
      files: { "registry.json": { content } },
    });
  } else {
    // Create new registry gist
    const res = await ghApi("POST", "/gists", {
      description: "ai-pet-registry - Player friend code directory",
      public: true,
      files: { "registry.json": { content } },
    });
    if (res.status === 201) {
      saveRegistryGistId(res.data.id);
      return res.data.id;
    }
  }
  return regId;
}

// ── Battle Stats Calculator ──
function calcBattleStats(state) {
  const bs = state.buddyStats || { debugging: 30, patience: 30, chaos: 30, wisdom: 30, snark: 30 };
  const lv = state.growth?.level || 1;
  const bond = state.nurture?.bond || 0;

  return {
    atk: Math.round((bs.debugging + bs.snark) / 10),
    def: Math.round((bs.patience + bs.wisdom) / 10),
    spd: Math.round(bs.chaos / 5),
    hp: lv * 3 + Math.round(bond / 2),
  };
}

function buildCard(state, username) {
  const code = generateFriendCode(username || "unknown", state.buddySpecies || "cat");
  return {
    version: "1.0",
    owner: username || null,
    friendCode: code,
    pet: {
      name: state.buddyName,
      species: state.buddySpecies,
      level: state.growth?.level || 1,
      evolutionStage: state.growth?.evolutionStage || "baby",
      rarity: state.buddyRarity || "common",
    },
    battleStats: calcBattleStats(state),
    record: state.battleRecord || { wins: 0, losses: 0, draws: 0 },
    achievements: (state.achievements || []).map((a) => a.id),
    signature: state.personality?.catchphrase || "",
    lastUpdated: new Date().toISOString(),
  };
}

// ── Simulate Battle ──
function simulateBattle(cardA, cardB) {
  const a = { ...cardA.battleStats, hp: cardA.battleStats.hp, name: cardA.pet.name };
  const b = { ...cardB.battleStats, hp: cardB.battleStats.hp, name: cardB.pet.name };
  const log = [];

  // Determine first attacker
  let first = a, second = b;
  if (b.spd > a.spd) { first = b; second = a; }
  else if (b.spd === a.spd && Math.random() > 0.5) { first = b; second = a; }

  log.push(`⚔️ ${cardA.pet.name} (Lv.${cardA.pet.level}) VS ${cardB.pet.name} (Lv.${cardB.pet.level})`);
  log.push(`${first.name} goes first! (SPD: ${first.spd})`);
  log.push("");

  let round = 0;
  let firstHp = first.hp, secondHp = second.hp;

  while (firstHp > 0 && secondHp > 0 && round < 20) {
    round++;

    // First attacks second
    const dmg1 = Math.max(1, first.atk - second.def + Math.floor(Math.random() * 3));
    secondHp -= dmg1;
    log.push(`Round ${round}: ${first.name} attacks! ${dmg1} damage → ${second.name} HP: ${Math.max(0, secondHp)}/${second.hp}`);

    if (secondHp <= 0) break;

    // Second attacks first
    const dmg2 = Math.max(1, second.atk - first.def + Math.floor(Math.random() * 3));
    firstHp -= dmg2;
    log.push(`          ${second.name} attacks! ${dmg2} damage → ${first.name} HP: ${Math.max(0, firstHp)}/${first.hp}`);
  }

  log.push("");

  let winner, loser;
  if (secondHp <= 0) {
    winner = first.name; loser = second.name;
    log.push(`🏆 ${first.name} WINS!`);
  } else if (firstHp <= 0) {
    winner = second.name; loser = first.name;
    log.push(`🏆 ${second.name} WINS!`);
  } else {
    winner = null;
    log.push(`⏰ DRAW! (20 rounds limit)`);
  }

  return { winner, loser, rounds: round, log, firstHp, secondHp };
}

// ══════════════════════════════════════
//  COMMANDS
// ══════════════════════════════════════

async function cardPublish() {
  const state = loadState();
  if (!state) { console.log('{"error": "No pet state. Run /pet first."}'); return; }

  const me = await ghApi("GET", "/user");
  if (me.status !== 200) { console.log('{"error": "GitHub auth failed. Set GITHUB_TOKEN."}'); return; }

  const card = buildCard(state, me.data.login);
  const friendCode = card.friendCode;
  const content = JSON.stringify(card, null, 2);
  const existingId = getCardGistId();

  let gistId, gistUrl;

  if (existingId) {
    const res = await ghApi("PATCH", `/gists/${existingId}`, {
      files: { "ai-pet-card.json": { content } },
    });
    gistId = existingId;
    gistUrl = res.data?.html_url;
  } else {
    const res = await ghApi("POST", "/gists", {
      description: `AI Pet Card - ${card.pet.name} the ${card.pet.species} [${friendCode}]`,
      public: true,
      files: { "ai-pet-card.json": { content } },
    });
    if (res.status === 201) {
      gistId = res.data.id;
      gistUrl = res.data.html_url;
      saveCardGistId(gistId);
    } else {
      console.log(JSON.stringify({ error: "Failed to create gist", status: res.status }));
      return;
    }
  }

  // Register friend code in public registry
  const reg = await loadRegistry();
  reg.data.players = reg.data.players || {};
  reg.data.players[friendCode] = {
    github: me.data.login,
    gistId,
    pet: card.pet.name,
    species: card.pet.species,
    level: card.pet.level,
    updatedAt: new Date().toISOString(),
  };
  await saveRegistry(reg.id, reg.data);

  console.log(JSON.stringify({
    ok: true,
    friendCode,
    gistId,
    url: gistUrl,
    shareText: `Add me on AI Pet! My code: ${friendCode}  →  /pet friend ${friendCode}`,
  }));
}

async function cardView(codeOrUser) {
  const parsed = parseFriendCode(codeOrUser);
  let gistId;

  if (parsed.type === "code") {
    // Look up in registry
    const reg = await loadRegistry();
    const player = reg.data.players?.[parsed.value];
    if (!player) { console.log(JSON.stringify({ error: "Friend code not found", code: parsed.value })); return; }
    gistId = player.gistId;
  } else {
    // Username lookup - search their gists
    const res = await ghApi("GET", `/users/${parsed.value}/gists?per_page=100`);
    if (res.status !== 200) { console.log(JSON.stringify({ error: "User not found" })); return; }
    const gist = res.data.find((g) => g.files?.["ai-pet-card.json"]);
    if (!gist) { console.log(JSON.stringify({ error: "No pet card found" })); return; }
    gistId = gist.id;
  }

  const full = await ghApi("GET", `/gists/${gistId}`);
  try {
    const card = JSON.parse(full.data.files["ai-pet-card.json"].content);
    console.log(JSON.stringify({ ok: true, gistId, card }));
  } catch {
    console.log(JSON.stringify({ error: "Failed to parse pet card" }));
  }
}

async function friendAdd(codeOrUser) {
  const parsed = parseFriendCode(codeOrUser);
  let github, gistId, friendCode;

  if (parsed.type === "code") {
    // Look up friend code in registry
    const reg = await loadRegistry();
    const player = reg.data.players?.[parsed.value];
    if (!player) {
      console.log(JSON.stringify({ error: "Friend code not found. Ask them to run /pet card first.", code: parsed.value }));
      return;
    }
    github = player.github;
    gistId = player.gistId;
    friendCode = parsed.value;
  } else {
    // Username: search their gists
    github = parsed.value;
    const res = await ghApi("GET", `/users/${github}/gists?per_page=100`);
    if (res.status !== 200) { console.log(JSON.stringify({ error: "User not found" })); return; }
    const gist = res.data.find((g) => g.files?.["ai-pet-card.json"]);
    if (!gist) { console.log(JSON.stringify({ error: "No pet card. They need /pet card first." })); return; }
    gistId = gist.id;
    friendCode = codeOrUser;
  }

  const friends = loadFriends();
  if (friends.friends.find((f) => f.github === github)) {
    console.log(JSON.stringify({ error: "Already friends", github }));
    return;
  }

  // Fetch card for display
  let cardPreview = null;
  try {
    const full = await ghApi("GET", `/gists/${gistId}`);
    if (full.status === 200) cardPreview = JSON.parse(full.data.files["ai-pet-card.json"].content);
  } catch {}

  friends.friends.push({
    github,
    gistId,
    friendCode,
    addedAt: new Date().toISOString(),
  });
  saveFriends(friends);

  console.log(JSON.stringify({
    ok: true,
    added: github,
    friendCode,
    pet: cardPreview?.pet || null,
    battleStats: cardPreview?.battleStats || null,
  }));
}

async function friendList() {
  const friends = loadFriends();
  if (friends.friends.length === 0) {
    console.log(JSON.stringify({ friends: [], message: "No friends yet. Use /pet friend add @username" }));
    return;
  }

  const results = [];
  for (const f of friends.friends) {
    try {
      const full = await ghApi("GET", `/gists/${f.gistId}`);
      if (full.status === 200 && full.data.files?.["ai-pet-card.json"]) {
        const card = JSON.parse(full.data.files["ai-pet-card.json"].content);
        results.push({ github: f.github, card });
      } else {
        results.push({ github: f.github, card: null, error: "Card unavailable" });
      }
    } catch {
      results.push({ github: f.github, card: null, error: "Fetch failed" });
    }
  }
  console.log(JSON.stringify({ friends: results }));
}

async function friendRemove(username) {
  const friends = loadFriends();
  friends.friends = friends.friends.filter((f) => f.github !== username);
  saveFriends(friends);
  console.log(JSON.stringify({ ok: true, removed: username }));
}

async function battleCreate(username) {
  const state = loadState();
  if (!state) { console.log('{"error": "No pet state"}'); return; }

  // Get opponent's card
  const oppRes = await ghApi("GET", `/users/${username}/gists?per_page=100`);
  const oppGist = oppRes.data?.find((g) => g.files?.["ai-pet-card.json"]);
  if (!oppGist) { console.log(JSON.stringify({ error: "Opponent has no pet card" })); return; }

  const oppFull = await ghApi("GET", `/gists/${oppGist.id}`);
  const oppCard = JSON.parse(oppFull.data.files["ai-pet-card.json"].content);

  // Build own card
  const me = await ghApi("GET", "/user");
  const myCard = buildCard(state);
  myCard.owner = me.data.login;

  // Create issue
  const battleData = {
    challenger: myCard,
    opponent: oppCard,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const res = await ghApi("POST", `/repos/${BATTLE_REPO}/issues`, {
    title: `[BATTLE] ${myCard.pet.name} vs ${oppCard.pet.name} | ${new Date().toISOString().split("T")[0]}`,
    body: "```json\n" + JSON.stringify(battleData, null, 2) + "\n```\n\n⚔️ Waiting for opponent to accept...",
    labels: ["battle", "pending"],
  });

  if (res.status === 201) {
    console.log(JSON.stringify({
      ok: true,
      issueNumber: res.data.number,
      url: res.data.html_url,
      challenger: myCard.pet.name,
      opponent: oppCard.pet.name,
      myStats: myCard.battleStats,
      oppStats: oppCard.battleStats,
    }));
  } else {
    console.log(JSON.stringify({ error: "Failed to create battle", status: res.status, msg: res.data.message }));
  }
}

async function battleCheck() {
  const me = await ghApi("GET", "/user");
  if (me.status !== 200) { console.log('{"error": "Auth failed"}'); return; }

  const res = await ghApi("GET", `/repos/${BATTLE_REPO}/issues?labels=battle,pending&state=open&per_page=20`);
  if (res.status !== 200) { console.log(JSON.stringify({ error: "Failed to fetch battles" })); return; }

  const challenges = res.data.filter((issue) => {
    try {
      const json = issue.body.match(/```json\n([\s\S]*?)\n```/)?.[1];
      if (!json) return false;
      const data = JSON.parse(json);
      return data.opponent?.owner === me.data.login && data.status === "pending";
    } catch { return false; }
  }).map((issue) => {
    const json = issue.body.match(/```json\n([\s\S]*?)\n```/)?.[1];
    const data = JSON.parse(json);
    return {
      issueNumber: issue.number,
      challenger: data.challenger.pet.name,
      challengerStats: data.challenger.battleStats,
      url: issue.html_url,
    };
  });

  console.log(JSON.stringify({ pending: challenges, count: challenges.length }));
}

async function battleAccept(issueNumber) {
  // Fetch the issue
  const res = await ghApi("GET", `/repos/${BATTLE_REPO}/issues/${issueNumber}`);
  if (res.status !== 200) { console.log(JSON.stringify({ error: "Battle not found" })); return; }

  const json = res.data.body.match(/```json\n([\s\S]*?)\n```/)?.[1];
  if (!json) { console.log(JSON.stringify({ error: "Invalid battle data" })); return; }

  const battleData = JSON.parse(json);

  // Update opponent card with latest stats
  const state = loadState();
  if (state) {
    const me = await ghApi("GET", "/user");
    battleData.opponent = buildCard(state);
    battleData.opponent.owner = me.data.login;
  }

  // Simulate battle
  const result = simulateBattle(battleData.challenger, battleData.opponent);

  // Post result as comment
  const commentBody = "## ⚔️ Battle Result\n\n```\n" + result.log.join("\n") + "\n```\n\n" +
    `**Winner:** ${result.winner || "DRAW"} (${result.rounds} rounds)`;

  await ghApi("POST", `/repos/${BATTLE_REPO}/issues/${issueNumber}/comments`, {
    body: commentBody,
  });

  // Update labels
  await ghApi("PATCH", `/repos/${BATTLE_REPO}/issues/${issueNumber}`, {
    labels: ["battle", "finished"],
    state: "closed",
  });

  // Update local state with result
  if (state) {
    if (!state.battleRecord) state.battleRecord = { wins: 0, losses: 0, draws: 0 };
    const myName = battleData.opponent.pet.name;
    if (result.winner === myName) {
      state.battleRecord.wins++;
      state.growth.xp = (state.growth.xp || 0) + 30;
      state.inventory.gold = (state.inventory.gold || 0) + 20;
    } else if (result.winner) {
      state.battleRecord.losses++;
      state.growth.xp = (state.growth.xp || 0) + 10;
      state.inventory.gold = (state.inventory.gold || 0) + 5;
    } else {
      state.battleRecord.draws++;
      state.growth.xp = (state.growth.xp || 0) + 15;
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }

  console.log(JSON.stringify({
    ok: true,
    issueNumber,
    result: { winner: result.winner, rounds: result.rounds },
    log: result.log,
  }));
}

async function battleResult(issueNumber) {
  const res = await ghApi("GET", `/repos/${BATTLE_REPO}/issues/${issueNumber}/comments`);
  if (res.status !== 200) { console.log(JSON.stringify({ error: "Battle not found" })); return; }

  const resultComment = res.data.find((c) => c.body.includes("Battle Result"));
  if (resultComment) {
    console.log(JSON.stringify({ ok: true, issueNumber, body: resultComment.body }));
  } else {
    console.log(JSON.stringify({ error: "No result yet", issueNumber }));
  }
}

async function rank() {
  const friends = loadFriends();
  const state = loadState();
  const rankings = [];

  // Add self
  if (state) {
    const me = await ghApi("GET", "/user");
    const card = buildCard(state);
    card.owner = me.data?.login || "me";
    rankings.push(card);
  }

  // Add friends
  for (const f of friends.friends) {
    try {
      const full = await ghApi("GET", `/gists/${f.gistId}`);
      if (full.status === 200 && full.data.files?.["ai-pet-card.json"]) {
        rankings.push(JSON.parse(full.data.files["ai-pet-card.json"].content));
      }
    } catch {}
  }

  // Sort by level then wins
  rankings.sort((a, b) => {
    const aScore = (a.pet?.level || 0) * 100 + (a.record?.wins || 0) * 10;
    const bScore = (b.pet?.level || 0) * 100 + (b.record?.wins || 0) * 10;
    return bScore - aScore;
  });

  console.log(JSON.stringify({ leaderboard: rankings }));
}

// ══════════════════════════════════════
//  MAIN
// ══════════════════════════════════════
const [, , cmd, ...args] = process.argv;

const commands = {
  "card-publish": () => cardPublish(),
  "card-view": () => cardView(args[0]),
  "friend-add": () => friendAdd(args[0]),
  "friend-list": () => friendList(),
  "friend-remove": () => friendRemove(args[0]),
  "battle-create": () => battleCreate(args[0]),
  "battle-check": () => battleCheck(),
  "battle-accept": () => battleAccept(args[0]),
  "battle-result": () => battleResult(args[0]),
  "rank": () => rank(),
};

if (commands[cmd]) {
  commands[cmd]().catch((e) => console.log(JSON.stringify({ error: e.message })));
} else {
  console.log("AI Pet Social - GitHub-Powered Multiplayer");
  console.log("");
  console.log("Commands:");
  console.log("  card-publish         Publish your pet card (public Gist)");
  console.log("  card-view <user>     View someone's pet card");
  console.log("  friend-add <user>    Add friend by GitHub username");
  console.log("  friend-list          List friends and their pets");
  console.log("  friend-remove <user> Remove friend");
  console.log("  battle-create <user> Challenge a friend");
  console.log("  battle-check         Check pending challenges");
  console.log("  battle-accept <id>   Accept a battle challenge");
  console.log("  battle-result <id>   View battle result");
  console.log("  rank                 Friend leaderboard");
}
