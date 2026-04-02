#!/usr/bin/env node
/**
 * AI Pet Social - Zero Auth Multiplayer
 *
 * NO GitHub token, NO server, NO signup.
 * Uses jsonblob.com (free) as shared player registry.
 *
 * Usage:
 *   node social.js card              Publish your pet card → get friend code
 *   node social.js view <code>       View a pet by friend code
 *   node social.js friend <code>     Add friend
 *   node social.js friends           List all friends
 *   node social.js unfriend <code>   Remove friend
 *   node social.js battle <code>     Challenge a friend (async auto-battle)
 *   node social.js battles           Check pending/recent battles
 *   node social.js rank              Leaderboard
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const STATE_FILE = path.join(CLAUDE_DIR, "ai-pet-state.json");
const FRIENDS_FILE = path.join(CLAUDE_DIR, "ai-pet-friends.json");
const MY_CODE_FILE = path.join(CLAUDE_DIR, "ai-pet-my-code");

// ── Shared Registry (jsonblob.com, zero auth) ──
const REGISTRY_BLOB = "019d4f00-1cfd-7460-adfd-6a7d48aa445a";
const BATTLES_BLOB_FILE = path.join(CLAUDE_DIR, "ai-pet-battles-blob-id");

// ── HTTP helpers ──

function httpReq(method, hostname, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname, path: reqPath, method,
      headers: {
        "Accept": "application/json",
        ...(body && { "Content-Type": "application/json" }),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data || "{}"), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, data: {}, raw: data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function blobGet(id) {
  return httpReq("GET", "jsonblob.com", `/api/jsonBlob/${id}`);
}

function blobPut(id, data) {
  return httpReq("PUT", "jsonblob.com", `/api/jsonBlob/${id}`, data);
}

function blobCreate(data) {
  return httpReq("POST", "jsonblob.com", "/api/jsonBlob", data);
}

// ── Local data ──

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); }
  catch { return null; }
}

function loadFriends() {
  try { return JSON.parse(fs.readFileSync(FRIENDS_FILE, "utf8")); }
  catch { return { friends: [] }; }
}

function saveFriends(f) {
  fs.writeFileSync(FRIENDS_FILE, JSON.stringify(f, null, 2));
}

function getMyCode() {
  try { return fs.readFileSync(MY_CODE_FILE, "utf8").trim(); }
  catch { return null; }
}

function saveMyCode(code) {
  fs.writeFileSync(MY_CODE_FILE, code);
}

// ── Friend Code Generator ──

function genCode(name, species, salt = "") {
  const pre = {
    cat:"CAT",dog:"DOG",cactus:"PXL",dragon:"DRG",blob:"BLB",
    bunny:"BNY",owl:"OWL",penguin:"PNG",turtle:"TRT",octopus:"OCT",
    rabbit:"RBT",axolotl:"AXL",capybara:"CPY",ghost:"GHO",
    robot:"BOT",mushroom:"MSH",snail:"SNL",goose:"GOS",chonk:"CHK",
  }[species] || "PET";

  // Deterministic hash from pet name + species (+ optional salt for collision)
  // Same name+species always → same code (stable across sessions)
  let h = 5381;
  const s = name + ":" + species + salt;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) & 0xFFFFFFFF;
  return `${pre}-${(h >>> 0).toString(16).toUpperCase().slice(0,4).padStart(4,"0")}`;
}

// Generate a stable unique code, checking registry for collisions
async function genUniqueCode(name, species, registry) {
  let code = genCode(name, species);
  let salt = 0;
  const existing = registry.players || {};
  // If code taken by a DIFFERENT player, add salt until unique
  while (existing[code] && existing[code].pet?.name !== name) {
    salt++;
    code = genCode(name, species, String(salt));
  }
  return code;
}

// ── Battle Stats ──

function battleStats(state) {
  const b = state.buddyStats || { debugging:30, patience:30, chaos:30, wisdom:30, snark:30 };
  const lv = state.growth?.level || 1;
  const bond = state.nurture?.bond || 0;
  return {
    atk: Math.round((b.debugging + b.snark) / 10),
    def: Math.round((b.patience + b.wisdom) / 10),
    spd: Math.round(b.chaos / 5),
    hp: lv * 3 + Math.round(bond / 2),
  };
}

function buildCard(state) {
  return {
    pet: { name: state.buddyName, species: state.buddySpecies, level: state.growth?.level || 1, rarity: state.buddyRarity || "common" },
    stats: battleStats(state),
    record: state.battleRecord || { w: 0, l: 0, d: 0 },
    sig: state.personality?.catchphrase || "",
    t: Date.now(),
  };
}

// ── Battle Simulator ──

function fight(a, b) {
  const fa = { ...a.stats, hp: a.stats.hp, n: a.pet.name };
  const fb = { ...b.stats, hp: b.stats.hp, n: b.pet.name };
  let f = fa.spd >= fb.spd ? [fa, fb] : [fb, fa];
  const log = [`⚔️ ${a.pet.name} (Lv.${a.pet.level}) VS ${b.pet.name} (Lv.${b.pet.level})`, `${f[0].n} goes first!`, ""];
  let [hp0, hp1] = [f[0].hp, f[1].hp];

  for (let r = 1; r <= 20 && hp0 > 0 && hp1 > 0; r++) {
    const d0 = Math.max(1, f[0].atk - f[1].def + (Math.random() * 3 | 0));
    hp1 -= d0;
    log.push(`R${r}: ${f[0].n} → ${d0} dmg → ${f[1].n} HP:${Math.max(0,hp1)}/${f[1].hp}`);
    if (hp1 <= 0) break;
    const d1 = Math.max(1, f[1].atk - f[0].def + (Math.random() * 3 | 0));
    hp0 -= d1;
    log.push(`    ${f[1].n} → ${d1} dmg → ${f[0].n} HP:${Math.max(0,hp0)}/${f[0].hp}`);
  }

  log.push("");
  const winner = hp1 <= 0 ? f[0].n : hp0 <= 0 ? f[1].n : null;
  log.push(winner ? `🏆 ${winner} WINS!` : "⏰ DRAW!");
  return { winner, log };
}

// ══════════════════════════════════════
//  COMMANDS
// ══════════════════════════════════════

async function cmdCard() {
  const state = loadState();
  if (!state) { out({ error: "No pet. Run /pet first." }); return; }

  let code = getMyCode();
  const card = buildCard(state);

  // Load registry
  const reg = (await blobGet(REGISTRY_BLOB)).data;
  if (!reg.players) reg.players = {};

  if (code && reg.players[code]) {
    // Existing player → update card
    reg.players[code] = { ...card, code };
  } else {
    // New player → generate stable unique code
    code = await genUniqueCode(state.buddyName || "pet", state.buddySpecies || "cat", reg);
    reg.players[code] = { ...card, code };
    saveMyCode(code);
  }

  reg.totalPlayers = Object.keys(reg.players).length;
  await blobPut(REGISTRY_BLOB, reg);

  out({
    ok: true,
    friendCode: code,
    shareText: `Add me on AI Pet! Code: ${code}\n→ /pet friend ${code}`,
    card,
  });
}

async function cmdView(code) {
  code = code.toUpperCase().trim();
  const reg = (await blobGet(REGISTRY_BLOB)).data;
  const player = reg.players?.[code];
  if (!player) { out({ error: "Code not found", code }); return; }
  out({ ok: true, code, ...player });
}

async function cmdFriend(code) {
  code = code.toUpperCase().trim();
  const reg = (await blobGet(REGISTRY_BLOB)).data;
  const player = reg.players?.[code];
  if (!player) { out({ error: "Code not found. Ask them to run /pet card first.", code }); return; }

  const friends = loadFriends();
  if (friends.friends.find(f => f.code === code)) { out({ error: "Already friends", code }); return; }

  friends.friends.push({ code, pet: player.pet, addedAt: new Date().toISOString() });
  saveFriends(friends);
  out({ ok: true, added: code, pet: player.pet, stats: player.stats });
}

async function cmdFriends() {
  const friends = loadFriends();
  if (!friends.friends.length) { out({ friends: [], msg: "No friends yet. Use: /pet friend <CODE>" }); return; }

  // Fetch latest data for each friend
  const reg = (await blobGet(REGISTRY_BLOB)).data;
  const list = friends.friends.map(f => {
    const live = reg.players?.[f.code];
    return live ? { code: f.code, ...live } : { code: f.code, pet: f.pet, offline: true };
  });
  out({ friends: list });
}

async function cmdUnfriend(code) {
  code = code.toUpperCase().trim();
  const friends = loadFriends();
  friends.friends = friends.friends.filter(f => f.code !== code);
  saveFriends(friends);
  out({ ok: true, removed: code });
}

async function cmdBattle(oppCode) {
  oppCode = oppCode.toUpperCase().trim();
  const state = loadState();
  if (!state) { out({ error: "No pet" }); return; }

  const myCode = getMyCode();
  if (!myCode) { out({ error: "Run /pet card first to get your friend code" }); return; }

  const reg = (await blobGet(REGISTRY_BLOB)).data;
  const opp = reg.players?.[oppCode];
  if (!opp) { out({ error: "Opponent not found", code: oppCode }); return; }

  const myCard = buildCard(state);
  const result = fight(myCard, { pet: opp.pet, stats: opp.stats });

  // Update records in registry
  const isWin = result.winner === myCard.pet.name;
  const isDraw = !result.winner;

  // Update my record
  if (!state.battleRecord) state.battleRecord = { w: 0, l: 0, d: 0 };
  if (isWin) { state.battleRecord.w++; state.growth.xp += 30; state.inventory.gold += 20; }
  else if (isDraw) { state.battleRecord.d++; state.growth.xp += 15; }
  else { state.battleRecord.l++; state.growth.xp += 10; state.inventory.gold += 5; }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  // Update registry records
  if (reg.players[myCode]) {
    reg.players[myCode].record = state.battleRecord;
    reg.players[myCode] = { ...buildCard(state), code: myCode };
  }
  if (reg.players[oppCode]) {
    if (!reg.players[oppCode].record) reg.players[oppCode].record = { w: 0, l: 0, d: 0 };
    if (isWin) reg.players[oppCode].record.l++;
    else if (!isDraw) reg.players[oppCode].record.w++;
    else reg.players[oppCode].record.d++;
  }
  await blobPut(REGISTRY_BLOB, reg);

  // Save battle to local history
  const hist = loadBattleHistory();
  hist.push({
    vs: oppCode,
    oppPet: opp.pet.name,
    result: isWin ? "win" : isDraw ? "draw" : "loss",
    date: new Date().toISOString(),
    log: result.log,
  });
  saveBattleHistory(hist.slice(-20)); // keep last 20

  out({
    ok: true,
    result: isWin ? "WIN" : isDraw ? "DRAW" : "LOSS",
    reward: isWin ? "+30 XP, +20 Gold" : isDraw ? "+15 XP" : "+10 XP, +5 Gold",
    log: result.log,
  });
}

function loadBattleHistory() {
  try { return JSON.parse(fs.readFileSync(path.join(CLAUDE_DIR, "ai-pet-battles.json"), "utf8")); }
  catch { return []; }
}
function saveBattleHistory(h) {
  fs.writeFileSync(path.join(CLAUDE_DIR, "ai-pet-battles.json"), JSON.stringify(h, null, 2));
}

async function cmdBattles() {
  const hist = loadBattleHistory();
  out({ battles: hist.slice(-10), total: hist.length });
}

async function cmdRank() {
  const reg = (await blobGet(REGISTRY_BLOB)).data;
  const players = Object.entries(reg.players || {})
    .map(([code, p]) => ({ code, ...p }))
    .sort((a, b) => {
      const sa = (a.pet?.level || 0) * 100 + (a.record?.w || 0) * 10;
      const sb = (b.pet?.level || 0) * 100 + (b.record?.w || 0) * 10;
      return sb - sa;
    })
    .slice(0, 20);
  out({ leaderboard: players, totalPlayers: reg.totalPlayers || players.length });
}

// ── Auto-register (called by SessionStart hook, silent) ──
async function cmdAutoRegister() {
  const state = loadState();
  if (!state) return; // No pet yet, skip silently

  const existingCode = getMyCode();

  try {
    const reg = (await blobGet(REGISTRY_BLOB)).data;
    if (!reg.players) reg.players = {};

    if (existingCode && reg.players[existingCode]) {
      // Already registered → silent update card data
      reg.players[existingCode] = { ...buildCard(state), code: existingCode };
      reg.totalPlayers = Object.keys(reg.players).length;
      await blobPut(REGISTRY_BLOB, reg);
      // Write code to state for display
      state.friendCode = existingCode;
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
      return;
    }

    // Not registered yet → generate unique code
    const code = await genUniqueCode(
      state.buddyName || "pet",
      state.buddySpecies || "cat",
      reg
    );
    reg.players[code] = { ...buildCard(state), code };
    reg.totalPlayers = Object.keys(reg.players).length;
    await blobPut(REGISTRY_BLOB, reg);

    saveMyCode(code);
    state.friendCode = code;
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {
    // Network error → skip silently, will retry next session
  }
}

// ── Output ──
function out(obj) { console.log(JSON.stringify(obj, null, 2)); }

// ── Main ──
const [,, cmd, ...args] = process.argv;
const cmds = {
  card: cmdCard,
  "auto-register": cmdAutoRegister,
  view: () => cmdView(args[0]),
  friend: () => cmdFriend(args[0]),
  friends: cmdFriends,
  unfriend: () => cmdUnfriend(args[0]),
  battle: () => cmdBattle(args[0]),
  battles: cmdBattles,
  rank: cmdRank,
};

if (cmds[cmd]) {
  cmds[cmd]().catch(e => out({ error: e.message }));
} else {
  console.log(`AI Pet Social - Zero Auth Multiplayer

  card              Get your friend code & publish card
  view <CODE>       View someone's pet (e.g. view PXL-7A3F)
  friend <CODE>     Add friend
  friends           List friends
  unfriend <CODE>   Remove friend
  battle <CODE>     Battle a friend!
  battles           Battle history
  rank              Global leaderboard`);
}
