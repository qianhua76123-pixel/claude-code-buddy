#!/usr/bin/env node
/**
 * AI Pet Home & Visit System
 *
 * Multi-room home, garden with planting, furniture with passive buffs,
 * friend visiting with interactive rewards.
 *
 * Usage:
 *   node home.js status                Home overview
 *   node home.js room <roomId>         View specific room
 *   node home.js build <roomId>        Unlock room
 *   node home.js shop                  Furniture & seed shop
 *   node home.js buy <itemId>          Buy furniture/seed
 *   node home.js place <itemId> <room> <x> <y>  Place furniture
 *   node home.js plant <seedId> <plotIndex>      Plant seed
 *   node home.js water <plotIndex>     Water a plant
 *   node home.js harvest               Harvest all ready plants
 *   node home.js visit <friendCode>    Visit friend's home
 *   node home.js visit-water <code> <plotIdx>   Water friend's plant
 *   node home.js visit-feed <code>     Feed friend's pet
 *   node home.js visit-gift <code> <itemName>   Gift item
 *   node home.js visit-note <code> <message>    Leave note
 *   node home.js guestbook             View guestbook
 *   node home.js collect               Collect passive income
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const STATE_FILE = path.join(CLAUDE_DIR, "ai-pet-state.json");
const MY_CODE_FILE = path.join(CLAUDE_DIR, "ai-pet-my-code");
const REGISTRY_BLOB = "019d4f00-1cfd-7460-adfd-6a7d48aa445a";

// ── HTTP ──
function httpReq(m,h,p,b=null){return new Promise((ok,no)=>{const o={hostname:h,path:p,method:m,headers:{"Accept":"application/json",...(b&&{"Content-Type":"application/json"})}};const r=https.request(o,res=>{let d="";res.on("data",c=>d+=c);res.on("end",()=>{try{ok({s:res.statusCode,d:JSON.parse(d||"{}")})}catch{ok({s:res.statusCode,d:{}})}})});r.on("error",no);if(b)r.write(JSON.stringify(b));r.end()})}
function blobGet(id){return httpReq("GET","jsonblob.com",`/api/jsonBlob/${id}`)}
function blobPut(id,d){return httpReq("PUT","jsonblob.com",`/api/jsonBlob/${id}`,d)}

function loadState(){try{return JSON.parse(fs.readFileSync(STATE_FILE,"utf8"))}catch{return null}}
function saveState(s){fs.writeFileSync(STATE_FILE,JSON.stringify(s,null,2))}
function getMyCode(){try{return fs.readFileSync(MY_CODE_FILE,"utf8").trim()}catch{return null}}
function out(o){console.log(JSON.stringify(o,null,2))}

// ── Default Home ──
function defaultHome(petName) {
  return {
    level: 1,
    name: `${petName}'s Den`,
    rooms: [
      { id:"living", name:"Living Room", size:[6,6], unlocked:true, furniture:[] },
      { id:"garden", name:"Garden", size:[8,4], unlocked:true, plots:[
        {id:"p1",pos:[0,0],plant:null},{id:"p2",pos:[1,0],plant:null},
        {id:"p3",pos:[2,0],plant:null},{id:"p4",pos:[3,0],plant:null},
        {id:"p5",pos:[0,1],plant:null},{id:"p6",pos:[1,1],plant:null},
      ]},
      { id:"bedroom", name:"Bedroom", size:[5,5], unlocked:false, unlockCost:200, furniture:[] },
      { id:"kitchen", name:"Kitchen", size:[5,5], unlocked:false, unlockCost:350, furniture:[] },
      { id:"workshop", name:"Workshop", size:[6,4], unlocked:false, unlockCost:500, furniture:[] },
    ],
    guestbook: [],
    visitors: { today:0, total:0, lastDate:null },
    lastCollect: new Date().toISOString(),
  };
}

// ── Shop Catalog ──
const FURNITURE = [
  { id:"sofa", name:"Cozy Sofa", price:30, room:"living", effect:{happinessPerHr:2}, icon:"🛋" },
  { id:"lamp", name:"Pixel Lamp", price:25, room:"living", effect:{xpPerHr:1}, icon:"💡" },
  { id:"bookshelf", name:"Bookshelf", price:50, room:"living", effect:{wisdomPerDay:1}, icon:"📚" },
  { id:"cattower", name:"Cat Tower", price:40, room:"living", effect:{chaosPerDay:1}, icon:"🗼" },
  { id:"poster", name:"Debug Poster", price:20, room:"any", effect:{debugPerDay:1}, icon:"🪧" },
  { id:"plant_pot", name:"Plant Pot", price:15, room:"any", effect:{cleanPerHr:1}, icon:"🪴" },
  { id:"bed", name:"Cozy Bed", price:60, room:"bedroom", effect:{energyRecover:2}, icon:"🛏" },
  { id:"dreamcatcher", name:"Dream Catcher", price:45, room:"bedroom", effect:{randomBonus:true}, icon:"🕸" },
  { id:"stove", name:"Stove", price:80, room:"kitchen", effect:{canCook:true}, icon:"🍳" },
  { id:"herbrack", name:"Herb Rack", price:35, room:"kitchen", effect:{cookBonus:1}, icon:"🌿" },
  { id:"workbench", name:"Workbench", price:100, room:"workshop", effect:{canCraft:true}, icon:"🔨" },
  { id:"anvil", name:"Anvil", price:80, room:"workshop", effect:{canUpgrade:true}, icon:"⚒" },
];

const SEEDS = [
  { id:"pixel_berry", name:"Pixel Berry", price:10, growHours:4, stages:4, harvest:{gold:30}, icon:"🫐" },
  { id:"code_flower", name:"Code Flower", price:15, growHours:6, stages:3, harvest:{xp:20}, icon:"🌸" },
  { id:"lucky_clover", name:"Lucky Clover", price:25, growHours:12, stages:5, harvest:{item:"random_rare"}, icon:"🍀" },
  { id:"golden_fruit", name:"Golden Fruit", price:50, growHours:24, stages:6, harvest:{gold:100}, icon:"🍊" },
  { id:"friend_bloom", name:"Friendship Bloom", price:5, growHours:8, stages:4, harvest:{gold:50,shared:true}, icon:"🌺", needsWater:true },
];

// ── Plant Growth ──
function updatePlants(plots) {
  const now = Date.now();
  for (const plot of plots) {
    if (!plot.plant || !plot.plantedAt) continue;
    const seed = SEEDS.find(s => s.id === plot.plant);
    if (!seed) continue;
    const elapsed = (now - new Date(plot.plantedAt).getTime()) / (1000*60*60);
    const hoursPerStage = seed.growHours / seed.stages;
    const wateredBonus = plot.watered ? 0.5 : 1;
    plot.stage = Math.min(seed.stages, Math.floor(elapsed / (hoursPerStage * wateredBonus)) + 1);
    plot.ready = plot.stage >= seed.stages;
    // Wither check: 2x grow time past ready
    if (elapsed > seed.growHours * 2 && plot.ready) {
      plot.withered = true;
    }
  }
  return plots;
}

// ── Passive Income ──
function calcPassiveIncome(home) {
  let gold = 0, xp = 0;
  for (const room of home.rooms) {
    if (!room.unlocked || !room.furniture) continue;
    for (const f of room.furniture) {
      const cat = FURNITURE.find(c => c.id === f.item);
      if (!cat) continue;
      if (cat.effect.happinessPerHr) gold += 0.5; // happiness indirectly = gold
      if (cat.effect.xpPerHr) xp += cat.effect.xpPerHr;
      if (cat.effect.cleanPerHr) gold += 0.3;
    }
  }
  // Visitor bonus
  gold += (home.visitors?.today || 0) * 3;
  return { goldPerHr: Math.round(gold * 10) / 10, xpPerHr: Math.round(xp * 10) / 10 };
}

// ══════════════════════════════════════
//  COMMANDS
// ══════════════════════════════════════

function cmdStatus() {
  const state = loadState();
  if (!state) { out({error:"No pet"}); return; }
  if (!state.home) { state.home = defaultHome(state.buddyName || "Pet"); saveState(state); }

  const home = state.home;
  const garden = home.rooms.find(r => r.id === "garden");
  if (garden) updatePlants(garden.plots);
  saveState(state);

  const income = calcPassiveIncome(home);
  const rooms = home.rooms.map(r => ({
    id: r.id, name: r.name, unlocked: r.unlocked,
    ...(r.unlocked ? { furniture: r.furniture?.length || 0 } : { unlockCost: r.unlockCost }),
    ...(r.id === "garden" && r.unlocked ? {
      plots: r.plots.length,
      planted: r.plots.filter(p => p.plant).length,
      ready: r.plots.filter(p => p.ready && !p.withered).length,
      withered: r.plots.filter(p => p.withered).length,
    } : {}),
  }));

  out({
    name: home.name,
    level: home.level,
    rooms,
    income,
    visitors: home.visitors,
    guestbookCount: home.guestbook.length,
    gold: state.inventory?.gold || 0,
  });
}

function cmdBuild(roomId) {
  const state = loadState();
  if (!state?.home) { out({error:"Run /pet home first"}); return; }
  const room = state.home.rooms.find(r => r.id === roomId);
  if (!room) { out({error:"Room not found",rooms:state.home.rooms.map(r=>r.id)}); return; }
  if (room.unlocked) { out({error:"Already unlocked"}); return; }
  if ((state.inventory?.gold || 0) < room.unlockCost) {
    out({error:"Not enough gold",need:room.unlockCost,have:state.inventory?.gold||0}); return;
  }
  state.inventory.gold -= room.unlockCost;
  room.unlocked = true;
  room.furniture = [];
  saveState(state);
  out({ok:true, unlocked:roomId, name:room.name, goldLeft:state.inventory.gold});
}

function cmdShop() {
  out({
    furniture: FURNITURE.map(f => ({id:f.id, name:f.name, price:f.price, room:f.room, icon:f.icon, effect:f.effect})),
    seeds: SEEDS.map(s => ({id:s.id, name:s.name, price:s.price, hours:s.growHours, icon:s.icon, harvest:s.harvest})),
  });
}

function cmdBuy(itemId) {
  const state = loadState();
  if (!state) { out({error:"No pet"}); return; }
  const furn = FURNITURE.find(f => f.id === itemId);
  const seed = SEEDS.find(s => s.id === itemId);
  const item = furn || seed;
  if (!item) { out({error:"Item not found",id:itemId}); return; }
  if ((state.inventory?.gold||0) < item.price) {
    out({error:"Not enough gold",need:item.price,have:state.inventory?.gold||0}); return;
  }
  state.inventory.gold -= item.price;
  if (!state.inventory.items) state.inventory.items = [];
  state.inventory.items.push({name:item.name,type:furn?"furniture":"seed",id:itemId,icon:item.icon||"",rarity:"common"});
  saveState(state);
  out({ok:true,bought:item.name,price:item.price,goldLeft:state.inventory.gold});
}

function cmdPlace(itemId, roomId, x, y) {
  const state = loadState();
  if (!state?.home) { out({error:"No home"}); return; }
  const room = state.home.rooms.find(r => r.id === roomId);
  if (!room?.unlocked) { out({error:"Room locked or not found"}); return; }
  const furn = FURNITURE.find(f => f.id === itemId);
  if (!furn) { out({error:"Not a furniture item"}); return; }
  if (furn.room !== "any" && furn.room !== roomId) { out({error:`This goes in ${furn.room}`}); return; }
  // Remove from inventory
  const idx = state.inventory.items.findIndex(i => i.id === itemId && i.type === "furniture");
  if (idx === -1) { out({error:"You don't have this item. Buy it first."}); return; }
  state.inventory.items.splice(idx, 1);
  if (!room.furniture) room.furniture = [];
  room.furniture.push({id:`${itemId}_${Date.now()}`,item:itemId,name:furn.name,icon:furn.icon,pos:[+x,+y],effect:furn.effect});
  saveState(state);
  out({ok:true,placed:furn.name,room:room.name,pos:[+x,+y]});
}

function cmdPlant(seedId, plotIdx) {
  const state = loadState();
  if (!state?.home) { out({error:"No home"}); return; }
  const garden = state.home.rooms.find(r => r.id === "garden");
  if (!garden) { out({error:"No garden"}); return; }
  const plot = garden.plots[+plotIdx];
  if (!plot) { out({error:"Plot not found",max:garden.plots.length-1}); return; }
  if (plot.plant) { out({error:"Plot occupied"}); return; }
  const seed = SEEDS.find(s => s.id === seedId);
  if (!seed) { out({error:"Seed not found"}); return; }
  const idx = state.inventory.items.findIndex(i => i.id === seedId && i.type === "seed");
  if (idx === -1) { out({error:"No seed in inventory. Buy first: /pet home buy "+seedId}); return; }
  state.inventory.items.splice(idx, 1);
  plot.plant = seedId;
  plot.plantedAt = new Date().toISOString();
  plot.stage = 1;
  plot.watered = false;
  plot.ready = false;
  plot.withered = false;
  saveState(state);
  out({ok:true,planted:seed.name,plot:plotIdx,growHours:seed.growHours,icon:seed.icon});
}

function cmdWater(plotIdx) {
  const state = loadState();
  if (!state?.home) { out({error:"No home"}); return; }
  const garden = state.home.rooms.find(r => r.id === "garden");
  const plot = garden?.plots[+plotIdx];
  if (!plot?.plant) { out({error:"Nothing planted"}); return; }
  if (plot.watered) { out({error:"Already watered"}); return; }
  plot.watered = true;
  saveState(state);
  out({ok:true,watered:plotIdx,effect:"Growth speed x2"});
}

function cmdHarvest() {
  const state = loadState();
  if (!state?.home) { out({error:"No home"}); return; }
  const garden = state.home.rooms.find(r => r.id === "garden");
  if (!garden) { out({error:"No garden"}); return; }
  updatePlants(garden.plots);

  const harvested = [];
  for (const plot of garden.plots) {
    if (plot.ready && !plot.withered) {
      const seed = SEEDS.find(s => s.id === plot.plant);
      if (seed) {
        if (seed.harvest.gold) {
          state.inventory.gold = (state.inventory.gold||0) + seed.harvest.gold;
          harvested.push({plant:seed.name,reward:`+${seed.harvest.gold} Gold`});
        }
        if (seed.harvest.xp) {
          state.growth.xp = (state.growth.xp||0) + seed.harvest.xp;
          harvested.push({plant:seed.name,reward:`+${seed.harvest.xp} XP`});
        }
        if (seed.harvest.item) {
          harvested.push({plant:seed.name,reward:"Rare item drop!"});
        }
      }
      // Clear plot
      plot.plant = null; plot.plantedAt = null; plot.stage = 0;
      plot.watered = false; plot.ready = false; plot.withered = false;
    }
    if (plot.withered) {
      plot.plant = null; plot.plantedAt = null; plot.stage = 0;
      plot.watered = false; plot.ready = false; plot.withered = false;
      harvested.push({plant:"(withered)",reward:"Lost"});
    }
  }
  saveState(state);
  out({harvested, gold:state.inventory.gold, xp:state.growth.xp});
}

// ── Visit Commands ──

async function cmdVisit(code) {
  code = code.toUpperCase().trim();
  const reg = (await blobGet(REGISTRY_BLOB)).d;
  const player = reg.players?.[code];
  if (!player) { out({error:"Player not found",code}); return; }

  // Record visit
  const myCode = getMyCode();
  if (myCode && player.home) {
    if (!player.home.guestbook) player.home.guestbook = [];
    player.home.guestbook.push({from:myCode,action:"visited",date:new Date().toISOString()});
    if (player.home.guestbook.length > 30) player.home.guestbook = player.home.guestbook.slice(-30);
    if (!player.home.visitors) player.home.visitors = {today:0,total:0};
    player.home.visitors.total++;
    player.home.visitors.today++;
    reg.players[code] = player;
    await blobPut(REGISTRY_BLOB, reg);
  }

  out({
    ok: true,
    visiting: code,
    pet: player.pet,
    home: player.home || { name: `${player.pet?.name}'s Den`, rooms: [], note: "They haven't built a home yet!" },
    guestbook: (player.home?.guestbook || []).slice(-5),
  });
}

async function cmdVisitWater(code, plotIdx) {
  code = code.toUpperCase().trim();
  const reg = (await blobGet(REGISTRY_BLOB)).d;
  const player = reg.players?.[code];
  if (!player?.home) { out({error:"No home to visit"}); return; }
  const garden = player.home.rooms?.find(r => r.id === "garden");
  const plot = garden?.plots?.[+plotIdx];
  if (!plot?.plant) { out({error:"Nothing planted there"}); return; }
  if (plot.watered) { out({error:"Already watered"}); return; }

  plot.watered = true;
  const myCode = getMyCode();
  if (!player.home.guestbook) player.home.guestbook = [];
  player.home.guestbook.push({from:myCode||"anon",action:"watered",plot:plotIdx,date:new Date().toISOString()});
  reg.players[code] = player;
  await blobPut(REGISTRY_BLOB, reg);

  // Reward self
  const state = loadState();
  if (state) {
    state.growth.xp = (state.growth.xp||0) + 5;
    state.nurture.bond = Math.min(100, (state.nurture.bond||0) + 3);
    saveState(state);
  }

  out({ok:true, watered:plotIdx, forFriend:code, reward:"+5 XP, +3 Bond"});
}

async function cmdVisitFeed(code) {
  code = code.toUpperCase().trim();
  const reg = (await blobGet(REGISTRY_BLOB)).d;
  const player = reg.players?.[code];
  if (!player) { out({error:"Not found"}); return; }

  // Boost friend's hunger in registry
  // (Note: this is a simplified version - friend's local state won't update until they sync)
  const myCode = getMyCode();
  if (!player.home) player.home = {guestbook:[],visitors:{today:0,total:0}};
  player.home.guestbook.push({from:myCode||"anon",action:"fed",date:new Date().toISOString()});
  reg.players[code] = player;
  await blobPut(REGISTRY_BLOB, reg);

  const state = loadState();
  if (state) {
    state.growth.xp = (state.growth.xp||0) + 3;
    state.nurture.bond = Math.min(100, (state.nurture.bond||0) + 2);
    saveState(state);
  }

  out({ok:true, fed:code, reward:"+3 XP, +2 Bond"});
}

async function cmdVisitGift(code, itemName) {
  code = code.toUpperCase().trim();
  const state = loadState();
  if (!state) { out({error:"No pet"}); return; }
  const idx = state.inventory.items.findIndex(i => i.name.toLowerCase().includes(itemName.toLowerCase()));
  if (idx === -1) { out({error:"Item not found in your inventory",search:itemName}); return; }
  const item = state.inventory.items.splice(idx, 1)[0];

  const reg = (await blobGet(REGISTRY_BLOB)).d;
  const player = reg.players?.[code];
  if (!player) { out({error:"Player not found"}); return; }
  if (!player.home) player.home = {guestbook:[],visitors:{today:0,total:0}};
  const myCode = getMyCode();
  player.home.guestbook.push({from:myCode||"anon",action:"gifted",item:item.name,date:new Date().toISOString()});
  reg.players[code] = player;
  await blobPut(REGISTRY_BLOB, reg);

  state.nurture.bond = Math.min(100, (state.nurture.bond||0) + 5);
  saveState(state);

  out({ok:true, gifted:item.name, to:code, reward:"+5 Bond"});
}

async function cmdVisitNote(code, msg) {
  code = code.toUpperCase().trim();
  const reg = (await blobGet(REGISTRY_BLOB)).d;
  const player = reg.players?.[code];
  if (!player) { out({error:"Not found"}); return; }
  if (!player.home) player.home = {guestbook:[],visitors:{today:0,total:0}};
  const myCode = getMyCode();
  player.home.guestbook.push({from:myCode||"anon",action:"note",msg,date:new Date().toISOString()});
  if (player.home.guestbook.length > 30) player.home.guestbook = player.home.guestbook.slice(-30);
  reg.players[code] = player;
  await blobPut(REGISTRY_BLOB, reg);

  const state = loadState();
  if (state) { state.growth.xp = (state.growth.xp||0) + 2; saveState(state); }

  out({ok:true, note:msg, to:code, reward:"+2 XP"});
}

function cmdGuestbook() {
  const state = loadState();
  if (!state?.home) { out({guestbook:[]}); return; }
  out({guestbook: (state.home.guestbook||[]).slice(-10)});
}

function cmdCollect() {
  const state = loadState();
  if (!state?.home) { out({error:"No home"}); return; }
  const last = new Date(state.home.lastCollect || Date.now()).getTime();
  const hours = Math.floor((Date.now() - last) / (1000*60*60));
  if (hours < 1) { out({error:"Nothing to collect yet. Check back in 1 hour."}); return; }

  const income = calcPassiveIncome(state.home);
  const goldEarned = Math.floor(income.goldPerHr * hours);
  const xpEarned = Math.floor(income.xpPerHr * hours);

  state.inventory.gold = (state.inventory.gold||0) + goldEarned;
  state.growth.xp = (state.growth.xp||0) + xpEarned;
  state.home.lastCollect = new Date().toISOString();
  saveState(state);

  out({ok:true, hours, goldEarned, xpEarned, goldTotal:state.inventory.gold});
}

// ── Main ──
const [,,cmd,...args] = process.argv;
const cmds = {
  status: cmdStatus,
  room: () => cmdStatus(), // alias
  build: () => cmdBuild(args[0]),
  shop: cmdShop,
  buy: () => cmdBuy(args[0]),
  place: () => cmdPlace(args[0],args[1],args[2],args[3]),
  plant: () => cmdPlant(args[0],args[1]),
  water: () => cmdWater(args[0]),
  harvest: cmdHarvest,
  visit: () => cmdVisit(args[0]),
  "visit-water": () => cmdVisitWater(args[0],args[1]),
  "visit-feed": () => cmdVisitFeed(args[0]),
  "visit-gift": () => cmdVisitGift(args[0],args.slice(1).join(" ")),
  "visit-note": () => cmdVisitNote(args[0],args.slice(1).join(" ")),
  guestbook: cmdGuestbook,
  collect: cmdCollect,
};

if (cmds[cmd]) {
  const result = cmds[cmd]();
  if (result?.catch) result.catch(e => out({error:e.message}));
} else {
  console.log(`AI Pet Home System

  status              Home overview
  build <room>        Unlock room (bedroom/kitchen/workshop)
  shop                Browse furniture & seeds
  buy <id>            Buy item
  place <id> <room> <x> <y>  Place furniture
  plant <seed> <plot> Plant in garden (0-5)
  water <plot>        Water plant
  harvest             Harvest ready plants
  visit <CODE>        Visit friend's home
  visit-water <CODE> <plot>  Water friend's plant
  visit-feed <CODE>   Feed friend's pet
  visit-gift <CODE> <item>   Gift item to friend
  visit-note <CODE> <msg>    Leave a note
  guestbook           View visitors & notes
  collect             Collect passive income`);
}
