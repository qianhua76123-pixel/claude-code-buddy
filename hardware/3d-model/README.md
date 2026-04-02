# 3D Printable Voxel Buddy - Complete Build Guide

Clawd-style voxel pet robot with 4 movable legs, round LCD face, speaker, and ESP32 inside.

## Exploded View (7 Parts)

```
                    ┌───────────┐
        Part 7:     │  HAT      │ ← Snap-on, interchangeable
                    │ (wizard/  │
                    │  crown/   │
                    │  cat ears)│
                    └─────┬─────┘
                          │ snap-fit pegs
         ┌────────────────┼────────────────┐
         │          Part 1: HEAD           │
         │  ┌────────────────────────┐     │
         │  │    ○ Screen Opening    │     │  ← 38mm circular hole
         │  │      (round LCD)       │     │
         │  └────────────────────────┘     │
         │                                 │
         │  Internal: ESP32 board mount    │
         │            speaker pocket       │
         │            wire channels        │
         └────────────┬───────────────────┘
                      │ 4x M2 screws
         ┌────────────┼───────────────────┐
         │          Part 2: BASE           │
         │                                 │
         │  Battery compartment            │
         │  USB-C access hole              │
         │  4x servo mounting pockets      │
         │  Speaker holes (bottom)         │
         └──┬─────┬─────────┬─────┬───────┘
            │     │         │     │  ← servo shafts poke through
         ┌──┴─┐┌──┴─┐   ┌──┴─┐┌──┴─┐
         │Leg ││Leg │   │Leg ││Leg │  Parts 3-6
         │ FL ││ FR │   │ BL ││ BR │  ← Press-fit onto servo horns
         └────┘└────┘   └────┘└────┘
```

## Part Dimensions (all in mm)

### Critical Reference Dimensions

```
ESP32-S3-Touch-LCD-1.46B board:
  PCB shape: Square with rounded corners
  Estimated size: ~43 x 43 mm (MEASURE YOUR BOARD FIRST!)
  Screen visible area: ~37mm diameter circle
  USB-C port: right side of board
  Battery connector: MX1.25 2-pin
  Speaker: onboard, bottom side
  Mic: onboard

SG90 Servo Motor:
  Body: 23 x 12.2 x 22.5 mm (L x W x H without shaft)
  Shaft height: +6.5mm above body
  Mounting tabs: 32.5 x 12.2 mm (with tabs)
  Tab holes: 2x M2 (2.2mm diameter)
  Shaft center: 6mm from edge
  Horn diameter: 24mm
  Horn screw: M2
```

### Part 1: HEAD (Top Shell)

```
Front view:                Side cross-section:
┌───────────────────┐      ┌──────────┐
│                   │      │  2mm wall │
│   ╭───────────╮   │      │ ┌──────┐ │
│   │  ○ 38mm   │   │      │ │      │ │ 30mm
│   │  screen   │   │      │ │ void │ │ internal
│   │  opening  │   │      │ │      │ │ height
│   ╰───────────╯   │      │ └──────┘ │
│                   │      └──────────┘
└───────────────────┘

Outer dimensions: 55 x 55 x 38 mm (W x D x H)
Wall thickness: 2 mm
Corner radius: 3 mm (voxel style = small radius, not fully round)
Screen opening: 38mm diameter circle, centered on front face
Screen opening depth: recessed 1.5mm (creates bezel ledge for screen to sit on)
Top: open (hat attaches here) OR closed with 2x snap-fit peg holes (4mm diameter, 3mm deep)
Bottom: open, mates with BASE via 4x M2 screw bosses at corners

Internal features:
  - ESP32 board mount: 4x small tabs/shelves at ~20mm height
    (board rests on these, screen faces forward through opening)
  - Wire channel: 5mm groove from board area down to base
  - Alignment pegs: 4x 3mm diameter, 3mm tall on bottom rim (mates with BASE holes)
```

### Part 2: BASE (Bottom Shell)

```
Top view:                  Bottom view:
┌───────────────────┐      ┌───────────────────┐
│ ┌─┐           ┌─┐│      │                   │
│ │S1│          │S2││      │  ( ) ( )  ( ) ( ) │ ← speaker holes
│ └─┘           └─┘│      │    ┌───────┐      │
│     battery       │      │    │USB-C  │      │ ← USB-C opening
│     pocket        │      │    │access │      │
│ ┌─┐           ┌─┐│      │    └───────┘      │
│ │S3│          │S4││      │                   │
│ └─┘           └─┘│      └───────────────────┘
└───────────────────┘

Outer dimensions: 55 x 55 x 18 mm (W x D x H)
Wall thickness: 2 mm
Corner radius: 3 mm (match HEAD)

Servo pockets (x4):
  Location: 4 corners, angled 45° outward
  Pocket size: 24 x 13 x 23 mm (fits SG90 body snugly)
  Shaft hole: 8mm diameter, goes through bottom wall
  Servo orientation: shaft pointing DOWN through bottom
  Tab mounting: small shelf inside pocket for servo tabs to rest on

Battery compartment:
  Center of base, 35 x 20 x 15 mm
  Open-bottom for battery swap (or side slot)

USB-C access:
  Hole in rear wall: 12 x 7 mm
  Position: centered, aligned with ESP32 board USB port

Speaker holes:
  Bottom face: 8x 2mm diameter holes in a circle pattern
  Positioned under the ESP32 board speaker location

Screw bosses:
  4x M2 threaded inserts (or self-tap into plastic)
  At corners, matching HEAD alignment pegs

Alignment holes:
  4x 3.1mm diameter, 3mm deep (receives HEAD's pegs)
```

### Parts 3-6: LEGS (x4, identical)

```
Front view:        Side view:
┌─────────┐        ┌─────┐
│         │        │     │
│  servo  │        │     │ 15mm
│  horn   │        │     │
│  socket │        │     │
│         │        └──┬──┘
└────┬────┘           │
     │                │ 5mm
┌────┴────┐        ┌──┴──┐
│  FOOT   │        │foot │
│  (wide) │        │     │
└─────────┘        └─────┘

Leg block: 14 x 14 x 15 mm
Foot pad: 16 x 18 x 4 mm (slightly wider than leg, provides stability)
Foot pad has rubber pad groove: 0.5mm deep recess for grip material

Servo horn socket (TOP of leg):
  Cross-shaped slot matching SG90 horn
  Depth: 3mm
  Press-fit onto servo horn (tight tolerance, 0.1mm smaller than horn)
  OR use M2 screw through center to secure to horn shaft

Total leg height: 19mm (leg block + foot pad)
```

### Part 7: HAT (Interchangeable, snap-on)

All hats have 2x snap-fit pegs on bottom: 3.9mm diameter, 3mm tall.
These press into the 4mm holes on top of HEAD.

#### Wizard Hat
```
Side view:
    ╱╲
   ╱  ╲       Tip (bent): 10 x 8 mm
  │    │       Mid: 25 x 25 x 15 mm
  │    │       Brim: 60 x 60 x 4 mm
  └────┘       Total height: ~35mm
──────────     Stars: small 3mm raised dots on surface
```

#### Crown
```
  ╱╲  ╱╲  ╱╲
 │  ╲╱  ╲╱  │  Points: 5x triangles, 8mm tall
 │          │  Band: 50 x 50 x 10 mm
 └──────────┘  Total height: ~18mm
               Jewels: 3mm hemispherical bumps (paint red)
```

#### Cat Ears
```
 ╱╲      ╱╲    Each ear: 15 x 15 x 18 mm triangular prism
╱  ╲    ╱  ╲   Inner ear: recessed 1mm for pink paint
╱    ╲  ╱    ╲  Base plate: 50 x 25 x 3 mm (connects both ears)
└──────┘└──────┘ Total height: ~21mm
```

#### Propeller Cap
```
     ─┼─         Propeller: 2x 30mm blades (separate piece, press-fit on pin)
      │           Pin: 2mm rod, 8mm tall
  ┌───┴───┐       Dome: hemisphere, 20mm diameter
  │       │       Brim: 50 x 50 x 5 mm
  └───────┘       Total height: ~25mm
                  Propeller CAN spin freely on the pin!
```

## Assembly Order

```
Step 1: Insert servos into BASE pockets (4x)
        Route wires through center channel
        ┌───────────────────┐
        │ S1 ═══════════ S2 │
        │  ║  battery    ║  │
        │  ║  pocket     ║  │
        │ S3 ═══════════ S4 │
        └───────────────────┘

Step 2: Connect battery via MX1.25 plug
        Place battery in center compartment

Step 3: Mount ESP32 board in HEAD
        Screen faces out through 38mm opening
        Route servo wires up from BASE connection
        Connect servos to PCA9685 or directly to ESP32 GPIO

Step 4: Mate HEAD onto BASE
        Align pegs → press fit
        Secure with 4x M2 screws from bottom

Step 5: Press LEGS onto servo horns
        Each horn sticks out through BASE bottom
        Legs push onto horn cross-shape

Step 6: Snap on HAT of choice
        Press pegs into top holes

Done! Total assembly: ~20 minutes
```

## Printing Guidelines

| Setting | Recommendation |
|---------|---------------|
| Material | PLA or PETG |
| Layer height | 0.2mm (PLA), 0.16mm for detail parts (hat) |
| Infill | 15-20% (body), 100% (legs - need strength) |
| Supports | HEAD: yes (for screen opening overhang). BASE: yes (for servo pockets). LEGS: no. HATS: varies. |
| Print orientation | HEAD: upside down (opening facing up). BASE: right-side up. LEGS: standing up. |
| Wall count | 3 (for strength) |
| Estimated time | HEAD: 2h, BASE: 1.5h, Legs: 15min each, Hat: 30min-1h |
| Total filament | ~80-100g PLA |

## Color Printing Suggestions

| Part | Color | Notes |
|------|-------|-------|
| HEAD | Orange (Clawd classic) | Or any color from the concept viewer |
| BASE | Same as HEAD | Or slightly darker shade |
| LEGS | Same as HEAD | Feet can be darker accent |
| Wizard Hat | Purple | Two-tone: dark purple body, light purple stars |
| Crown | Gold/Yellow | Red jewel dots painted on |
| Cat Ears | Same as HEAD | Inner ears painted pink |
| Propeller Cap | Blue | Blades: red + green |

## Where to Get This Printed

### Option A: Own 3D Printer
Download STL, slice in Cura/PrusaSlicer, print.

### Option B: Taobao Custom Print
Search: **"3D打印 定制 PLA"**
- Send all STL files as a zip
- Specify colors per part
- Ask for "组装检查" (assembly check)
- Cost: ~50-100 RMB total
- Time: 2-4 days + shipping

### Option C: Online 3D Print Services
- MakerWorld Print-on-Demand
- JLCPCB 3D printing service (surprisingly cheap)
- Shapeways (international)

## Modeling This in Blender (Step-by-Step)

If you want to create the STL files yourself:

### HEAD
```
1. Add Cube → scale to 55x55x38mm
2. Add Bevel modifier → 3mm segments:2 (rounded corners)
3. Boolean subtract: Cube inside (51x51x34mm, offset 2mm from bottom) → hollow
4. Boolean subtract: Cylinder 38mm on front face → screen opening
5. Add 4x small cylinders at bottom rim corners → alignment pegs
6. Add internal shelf tabs for board mounting
7. Export as STL
```

### BASE
```
1. Add Cube → scale to 55x55x18mm
2. Same bevel as HEAD
3. Hollow out (51x51x14mm)
4. Boolean subtract: 4x boxes at corners for servo pockets (24x13x23mm, angled 45°)
5. Boolean subtract: 4x cylinders through bottom for servo shafts
6. Boolean subtract: rectangle on back for USB-C
7. Add small cylinders on bottom for speaker holes
8. Add screw boss cylinders at corners
9. Export as STL
```

### LEG (make one, print 4)
```
1. Add Cube → 14x14x15mm
2. Add Cube below → 16x18x4mm (foot)
3. Join objects
4. Add cross-shaped boolean subtract on top (servo horn slot)
5. Small bevel on edges (1mm)
6. Export as STL
```

### WIZARD HAT
```
1. Brim: Cube 60x60x4mm with bevel
2. Mid: Cube 25x25x15mm on top of brim
3. Tip: Cone 10mm radius, 20mm height, slightly bent
4. Small sphere dots for stars
5. 2x peg cylinders on bottom of brim
6. Export as STL
```

## ⚠️ IMPORTANT: Measure First!

**Before printing, buy the ESP32 board and SG90 servos first. Measure them with calipers.**

The dimensions in this document are based on typical specs, but Chinese electronics can vary ±1mm. Key things to verify:
- ESP32 PCB exact size → adjust HEAD internal shelf
- Screen visible area → adjust screen opening
- USB-C port position → adjust BASE USB hole
- SG90 body → adjust servo pocket size
- Servo horn cross shape → adjust leg socket

**Add 0.3mm tolerance to all mating surfaces for a clean fit.**
