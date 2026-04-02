#!/usr/bin/env node
/**
 * AI Pet Buddy - STL Generator (Zero Dependencies)
 *
 * Generates all 7 printable parts as individual STL files.
 * No Blender, no OpenSCAD, no npm install needed.
 * Just: node generate-stl.js
 *
 * Output: ./stl/ folder with 7 files ready for 3D printing.
 */

const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "stl");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// ── Config (mm) ──
const WALL = 2;
const HEAD_W = 55, HEAD_D = 55, HEAD_H = 38;
const SCREEN_R = 19; // 38mm diameter / 2
const SCREEN_RECESS = 1.5;
const BASE_W = 55, BASE_D = 55, BASE_H = 18;
const LEG_W = 14, LEG_D = 14, LEG_H = 15;
const FOOT_W = 16, FOOT_D = 18, FOOT_H = 4;
const PEG_R = 1.9, PEG_H = 3;
const SERVO_L = 23.5, SERVO_W = 13, SERVO_H = 23;
const SHAFT_R = 4;
const BATT_W = 35, BATT_D = 20, BATT_H = 12;
const USB_W = 12, USB_H = 7;
const HORN_W = 2.2, HORN_L = 18;
const SCREW_R = 1.1;
const CR = 2; // corner rounding segments

// ── STL Binary Writer ──
class STLWriter {
  constructor() { this.triangles = []; }

  addTriangle(v1, v2, v3) {
    // Calculate normal
    const u = [v2[0]-v1[0], v2[1]-v1[1], v2[2]-v1[2]];
    const v = [v3[0]-v1[0], v3[1]-v1[1], v3[2]-v1[2]];
    const n = [
      u[1]*v[2] - u[2]*v[1],
      u[2]*v[0] - u[0]*v[2],
      u[0]*v[1] - u[1]*v[0],
    ];
    const len = Math.sqrt(n[0]**2 + n[1]**2 + n[2]**2) || 1;
    this.triangles.push({ n: [n[0]/len, n[1]/len, n[2]/len], v1, v2, v3 });
  }

  addQuad(a, b, c, d) {
    this.addTriangle(a, b, c);
    this.addTriangle(a, c, d);
  }

  // Add a box (most basic primitive)
  addBox(cx, cy, cz, sx, sy, sz) {
    const x0 = cx - sx/2, x1 = cx + sx/2;
    const y0 = cy - sy/2, y1 = cy + sy/2;
    const z0 = cz - sz/2, z1 = cz + sz/2;

    // Front (+Y)
    this.addQuad([x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]);
    // Back (-Y)
    this.addQuad([x1,y0,z0],[x0,y0,z0],[x0,y0,z1],[x1,y0,z1]);
    // Right (+X)
    this.addQuad([x1,y1,z0],[x1,y0,z0],[x1,y0,z1],[x1,y1,z1]);
    // Left (-X)
    this.addQuad([x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]);
    // Top (+Z)
    this.addQuad([x0,y1,z1],[x1,y1,z1],[x1,y0,z1],[x0,y0,z1]);
    // Bottom (-Z)
    this.addQuad([x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]);
  }

  // Add a cylinder along Z axis
  addCylinder(cx, cy, z0, z1, r, segs = 24) {
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const x0 = cx + Math.cos(a0) * r, y0p = cy + Math.sin(a0) * r;
      const x1 = cx + Math.cos(a1) * r, y1p = cy + Math.sin(a1) * r;

      // Side
      this.addQuad([x0,y0p,z0],[x1,y1p,z0],[x1,y1p,z1],[x0,y0p,z1]);
      // Top cap
      this.addTriangle([cx,cy,z1],[x0,y0p,z1],[x1,y1p,z1]);
      // Bottom cap
      this.addTriangle([cx,cy,z0],[x1,y1p,z0],[x0,y0p,z0]);
    }
  }

  // Add cone along Z axis
  addCone(cx, cy, z0, z1, r0, r1, segs = 24) {
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const bx0 = cx + Math.cos(a0) * r0, by0 = cy + Math.sin(a0) * r0;
      const bx1 = cx + Math.cos(a1) * r0, by1 = cy + Math.sin(a1) * r0;
      const tx0 = cx + Math.cos(a0) * r1, ty0 = cy + Math.sin(a0) * r1;
      const tx1 = cx + Math.cos(a1) * r1, ty1 = cy + Math.sin(a1) * r1;

      // Side
      this.addQuad([bx0,by0,z0],[bx1,by1,z0],[tx1,ty1,z1],[tx0,ty0,z1]);
      // Bottom cap
      if (r0 > 0.01) this.addTriangle([cx,cy,z0],[bx1,by1,z0],[bx0,by0,z0]);
      // Top cap
      if (r1 > 0.01) this.addTriangle([cx,cy,z1],[tx0,ty0,z1],[tx1,ty1,z1]);
    }
  }

  save(filepath) {
    const numTri = this.triangles.length;
    const buf = Buffer.alloc(84 + numTri * 50);

    // Header (80 bytes)
    buf.write("AI Pet Buddy STL - github.com/qianhua76123-pixel/claude-code-buddy", 0, 80);
    buf.writeUInt32LE(numTri, 80);

    let offset = 84;
    for (const t of this.triangles) {
      buf.writeFloatLE(t.n[0], offset); offset += 4;
      buf.writeFloatLE(t.n[1], offset); offset += 4;
      buf.writeFloatLE(t.n[2], offset); offset += 4;
      for (const v of [t.v1, t.v2, t.v3]) {
        buf.writeFloatLE(v[0], offset); offset += 4;
        buf.writeFloatLE(v[1], offset); offset += 4;
        buf.writeFloatLE(v[2], offset); offset += 4;
      }
      buf.writeUInt16LE(0, offset); offset += 2; // attribute byte count
    }

    fs.writeFileSync(filepath, buf);
    console.log(`  ✓ ${path.basename(filepath)} (${numTri} triangles, ${(buf.length/1024).toFixed(1)}KB)`);
  }
}

// ══════════════════════════════════════
//  PART 1: HEAD
// ══════════════════════════════════════
function buildHead() {
  const stl = new STLWriter();
  const hw = HEAD_W/2, hd = HEAD_D/2, hh = HEAD_H;

  // Outer box
  stl.addBox(0, 0, hh/2, HEAD_W, HEAD_D, hh);

  // Inner void (subtract conceptually - we build the walls directly)
  // Since we can't boolean in pure STL, we build it as a hollow box
  // by creating outer walls, front face with hole, and internal shelves

  // For simplicity in pure STL: solid outer box + clearly marked screen hole
  // The 3D print shop will do the hollowing in their slicer, OR
  // we note that this needs to be shelled in a free tool like Meshmixer

  // Screen opening - add a recessed cylinder on front face
  stl.addCylinder(0, hd - WALL/2, hh/2 - SCREEN_R, hh/2 + SCREEN_R, SCREEN_R + 1, 48);

  // Alignment pegs on bottom (4 corners)
  const pegOff = hw - 6;
  for (const [px, py] of [[-pegOff,-pegOff],[pegOff,-pegOff],[-pegOff,pegOff],[pegOff,pegOff]]) {
    stl.addCylinder(px, py, -PEG_H, 0, PEG_R, 16);
  }

  // Hat peg holes marked as small cylinders on top
  for (const px of [-8, 8]) {
    stl.addCylinder(px, 0, hh - 2, hh + 1, PEG_R + 0.2, 16);
  }

  // Board mounting tabs (4 small shelves inside)
  for (const [tx, ty] of [[-18,-18],[18,-18],[-18,18],[18,18]]) {
    stl.addBox(tx, ty, hh/2, 4, 4, 1.5);
  }

  stl.save(path.join(OUT, "Part1_HEAD.stl"));
}

// ══════════════════════════════════════
//  PART 2: BASE
// ══════════════════════════════════════
function buildBase() {
  const stl = new STLWriter();
  const bw = BASE_W/2, bd = BASE_D/2;

  // Outer box
  stl.addBox(0, 0, BASE_H/2, BASE_W, BASE_D, BASE_H);

  // 4 servo pockets (marked as boxes at corners)
  const so = 16; // servo offset from center
  for (const [sx, sy] of [[-so,so],[so,so],[-so,-so],[so,-so]]) {
    stl.addBox(sx, sy, BASE_H/2, SERVO_L, SERVO_W, SERVO_H);
    // Shaft hole below
    stl.addCylinder(sx, sy, -1, WALL + 1, SHAFT_R, 16);
  }

  // Battery compartment (center)
  stl.addBox(0, 0, WALL + BATT_H/2, BATT_W, BATT_D, BATT_H);

  // USB-C opening (back wall)
  stl.addBox(0, -bd, WALL + USB_H/2 + 2, USB_W, WALL + 2, USB_H);

  // Speaker holes (bottom, circle pattern)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    stl.addCylinder(Math.cos(a) * 8, Math.sin(a) * 8, -1, WALL + 1, 1, 12);
  }

  // Alignment peg holes (top, matches HEAD)
  const pegOff = bw - 6;
  for (const [px, py] of [[-pegOff,-pegOff],[pegOff,-pegOff],[-pegOff,pegOff],[pegOff,pegOff]]) {
    stl.addCylinder(px, py, BASE_H - PEG_H - 0.5, BASE_H + 1, PEG_R + 0.2, 16);
  }

  // Screw bosses (4 corners)
  for (const [sx, sy] of [[bw-5,bd-5],[-(bw-5),bd-5],[bw-5,-(bd-5)],[-(bw-5),-(bd-5)]]) {
    stl.addCylinder(sx, sy, WALL, BASE_H, 2.5, 12);
    stl.addCylinder(sx, sy, -1, BASE_H + 1, SCREW_R, 12);
  }

  stl.save(path.join(OUT, "Part2_BASE.stl"));
}

// ══════════════════════════════════════
//  PARTS 3-6: LEG (generate 1, print 4)
// ══════════════════════════════════════
function buildLeg() {
  const stl = new STLWriter();

  // Main leg block
  stl.addBox(0, 0, FOOT_H + LEG_H/2, LEG_W, LEG_D, LEG_H);

  // Foot pad (wider)
  stl.addBox(0, 1, FOOT_H/2, FOOT_W, FOOT_D, FOOT_H);

  // Servo horn cross slot (top of leg) - marked as two crossing boxes
  const slotZ = FOOT_H + LEG_H - 1.5;
  stl.addBox(0, 0, slotZ, HORN_W, HORN_L, 3);
  stl.addBox(0, 0, slotZ, HORN_L, HORN_W, 3);

  // Center screw hole
  stl.addCylinder(0, 0, FOOT_H, FOOT_H + LEG_H + 1, SCREW_R, 12);

  stl.save(path.join(OUT, "Part3-6_LEG_x4.stl"));
}

// ══════════════════════════════════════
//  PART 7a: WIZARD HAT
// ══════════════════════════════════════
function buildWizardHat() {
  const stl = new STLWriter();

  // Brim
  stl.addBox(0, 0, 2, 60, 60, 4);

  // Mid section
  stl.addBox(0, 0, 4 + 9, 30, 28, 18);

  // Top narrow (bent tip)
  stl.addBox(4, 0, 4 + 18 + 7, 18, 18, 14);

  // Tip (cone)
  stl.addCone(7, 0, 4 + 18 + 14, 4 + 18 + 14 + 10, 6, 1, 16);

  // Star bumps
  for (const [sx, sy, sz] of [[-10, 14, 15], [8, 14, 20], [-5, 14, 28]]) {
    stl.addCylinder(sx, sy, sz - 0.5, sz + 1, 1.5, 8);
  }

  // Snap pegs (bottom)
  for (const px of [-8, 8]) {
    stl.addCylinder(px, 0, -PEG_H, 0, PEG_R - 0.1, 12);
  }

  stl.save(path.join(OUT, "Part7a_HAT_Wizard.stl"));
}

// ══════════════════════════════════════
//  PART 7b: CROWN
// ══════════════════════════════════════
function buildCrown() {
  const stl = new STLWriter();

  // Band
  stl.addBox(0, 0, 6, 52, 52, 12);

  // 5 Crown points
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const px = Math.cos(a) * 20, py = Math.sin(a) * 20;
    stl.addCone(px, py, 12, 22, 6, 1, 8);
    // Jewel (small sphere approx = short cylinder)
    stl.addCylinder(px, py, 14, 16, 2, 8);
  }

  // Snap pegs
  for (const px of [-8, 8]) {
    stl.addCylinder(px, 0, -PEG_H, 0, PEG_R - 0.1, 12);
  }

  stl.save(path.join(OUT, "Part7b_HAT_Crown.stl"));
}

// ══════════════════════════════════════
//  PART 7c: CAT EARS
// ══════════════════════════════════════
function buildCatEars() {
  const stl = new STLWriter();

  // Base plate
  stl.addBox(0, 0, 1.5, 50, 25, 3);

  // Left ear (cone)
  stl.addCone(-15, 0, 3, 25, 10, 1, 4);

  // Right ear (cone)
  stl.addCone(15, 0, 3, 25, 10, 1, 4);

  // Inner ear recesses (smaller cones, for painting)
  stl.addCone(-15, 2, 5, 18, 5, 0.5, 4);
  stl.addCone(15, 2, 5, 18, 5, 0.5, 4);

  // Snap pegs
  for (const px of [-8, 8]) {
    stl.addCylinder(px, 0, -PEG_H, 0, PEG_R - 0.1, 12);
  }

  stl.save(path.join(OUT, "Part7c_HAT_CatEars.stl"));
}

// ══════════════════════════════════════
//  PART 7d: PROPELLER CAP
// ══════════════════════════════════════
function buildPropellerCap() {
  const stl = new STLWriter();

  // Brim
  stl.addBox(0, 0, 2.5, 52, 52, 5);

  // Dome (stack of shrinking cylinders for hemisphere)
  for (let i = 0; i < 8; i++) {
    const z = 5 + i * 2;
    const r = 12 - i * 1.2;
    if (r > 0) stl.addCylinder(0, 0, z, z + 2, r, 16);
  }

  // Stick
  stl.addCylinder(0, 0, 20, 28, 1.5, 8);

  // Propeller blades
  stl.addBox(-12, 0, 29, 28, 5, 1.5);
  stl.addBox(0, -12, 29, 5, 28, 1.5);

  // Snap pegs
  for (const px of [-8, 8]) {
    stl.addCylinder(px, 0, -PEG_H, 0, PEG_R - 0.1, 12);
  }

  stl.save(path.join(OUT, "Part7d_HAT_Propeller.stl"));
}

// ══════════════════════════════════════
//  RUN ALL
// ══════════════════════════════════════
console.log("");
console.log("╭──────────────────────────────────────╮");
console.log("│  AI Pet Buddy - STL Generator        │");
console.log("│  Zero dependencies, pure Node.js     │");
console.log("╰──────────────────────────────────────╯");
console.log("");
console.log("Generating parts...");
console.log("");

buildHead();
buildBase();
buildLeg();
buildWizardHat();
buildCrown();
buildCatEars();
buildPropellerCap();

console.log("");
console.log("╭──────────────────────────────────────╮");
console.log("│  Done! 7 STL files in ./stl/         │");
console.log("│                                      │");
console.log("│  Part1_HEAD.stl      - Main head     │");
console.log("│  Part2_BASE.stl      - Base + servos │");
console.log("│  Part3-6_LEG_x4.stl  - Print 4x     │");
console.log("│  Part7a_HAT_Wizard   - Purple hat    │");
console.log("│  Part7b_HAT_Crown    - Gold crown    │");
console.log("│  Part7c_HAT_CatEars  - Cat ears      │");
console.log("│  Part7d_HAT_Propeller- Propeller cap │");
console.log("│                                      │");
console.log("│  ⚠️  These are SOLID shapes.          │");
console.log("│  Use Meshmixer (free) to:            │");
console.log("│  1. Shell HEAD & BASE (2mm wall)     │");
console.log("│  2. Boolean subtract screen hole     │");
console.log("│  3. Boolean subtract servo pockets   │");
console.log("│                                      │");
console.log("│  Or send to 3D print shop with       │");
console.log("│  the README instructions, they'll    │");
console.log("│  handle the hollowing.               │");
console.log("╰──────────────────────────────────────╯");
console.log("");
console.log("Next: Send ./stl/ folder + README.md to your 3D print shop.");
console.log("");
