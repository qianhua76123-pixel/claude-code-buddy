# Hardware Roadmap - From Desk Pet to Walking Robot Cat

Full DIY, zero to hero. Each phase produces a working product.

## Phase Overview

```
Phase 1 (Week 1)     Phase 2 (Week 2)     Phase 3 (Week 3-4)
┌─────────────┐     ┌─────────────┐      ┌──────────────┐
│  Desk Pet   │     │  Walking    │      │  Smart       │
│  ┌───┐      │     │  Cat       │      │  Robot Cat   │
│  │ :3│ ←screen    │  ┌───┐     │      │  ┌───┐       │
│  └───┘      │ ──> │  │ :3│     │ ──>  │  │ :3│ 🎯    │
│  speaks     │     │  ╱ │ ╲     │      │  ╱ │ ╲  🦾   │
│  listens    │     │ ╱  │  ╲    │      │ ╱  │  ╲      │
│             │     │ legs walk  │      │ avoids walls  │
└─────────────┘     └─────────────┘      │ follows you  │
~165 RMB            +215 RMB             │ grabs things │
                                         └──────────────┘
                                         +80 RMB

Total: ~460 RMB for the full robot cat
```

---

## Phase 1: Desk Pet (Week 1) — ~165 RMB

A stationary pet with face, voice, and AI connection. This IS the MVP.

### Shopping List

| # | Item | Spec | Price | Link Hint |
|---|------|------|-------|-----------|
| 1 | ESP32-S3 Round LCD | Waveshare Touch-LCD-1.46C | ~150 | 淘宝搜"Waveshare 1.46 圆屏 ESP32" |
| 2 | Li-Po Battery | 3.7V 1000mAh MX1.25 | ~15 | 淘宝搜"3.7V锂电池 MX1.25" |

**Built-in:** WiFi, Bluetooth, speaker, mic, touch screen, gyroscope, SD card, USB-C charging

### What it does
- Round LCD shows pixel cat face with 10 emotions + breathing + blink animations
- TTS speech via cloud EdgeTTS
- Mic listens for voice input
- Connects to Claude Code / OpenClaw via MCP Bridge
- Autonomous tasks (cron reminders, etc.)
- Gyroscope: shake to interact

### Assembly: 0 soldering, plug battery → flash firmware → done

---

## Phase 2: Walking Cat (Week 2) — +215 RMB

Add legs. The desk pet becomes a walking quadruped.

### Additional Shopping List

| # | Item | Spec | Qty | Price |
|---|------|------|-----|-------|
| 3 | Servo motors | MG90S metal gear | 8 | ~80 (10元/个) |
| 4 | Servo driver | PCA9685 16-ch I2C | 1 | ~15 |
| 5 | Buck converter | MP1584EN 5V | 2 | ~10 |
| 6 | Battery upgrade | 18650 x2 + holder | 1 | ~25 |
| 7 | 3D printed body | Cat shell + legs | 1 set | ~80 |
| 8 | Screws & wires | M2 screws, dupont | misc | ~5 |

### Servo Layout (8 servos, 4 legs, 2 joints each)

```
         ┌──────┐
    ┌────┤ HEAD ├────┐
    │    │(screen)   │
    │    └──┬───┘    │
    │       │        │
  ┌─┤  ┌───┴───┐  ├─┐
  │S│  │ BODY  │  │S│     S = Shoulder servo (hip joint)
  │1│  │ESP32  │  │3│     K = Knee servo
  └┬┘  │battery│  └┬┘
  ┌┴┐  └───────┘  ┌┴┐
  │K│             │K│
  │1│             │3│
  └─┘             └─┘
   front           front

  ┌─┐             ┌─┐
  │S│             │S│
  │2│   (back)    │4│
  └┬┘             └┬┘
  ┌┴┐             ┌┴┐
  │K│             │K│
  │2│             │4│
  └─┘             └─┘
   rear            rear
```

### 3D Print Design - Cat Robot Body

```
Top view:              Side view:

  ┌──┐    ┌──┐         ears
  │  │    │  │         ┌──┐
  └──┼────┼──┘     ┌───┤  │───┐
     │○○○○│        │   │face│   │
     │face│        │   │ :3 │   │
     │ :3 │        │   └──┬─┘   │
     └──┬─┘        │     │     │
     ┌──┴──┐       │  ┌──┴──┐  │
     │body │       │  │body │  │
     │     │       ├──┤ESP32├──┤
     └┬──┬─┘       │  │batt │  │
    ┌─┘  └─┐      │  └─────┘  │
    legs   legs    leg        leg
```

### Key Dimensions for 3D Print
- Head: 60x60x50mm (screen opening 38mm circle on front)
- Body: 70x45x35mm (hollow, fits ESP32 + PCA9685 + batteries)
- Each leg segment: 40mm length, 15mm diameter
- Shoulder joint housing: 25x15x15mm (fits MG90S servo)
- Total height standing: ~120mm
- Total length: ~160mm

### Gait Algorithm
Use creep gait (one leg moves at a time, most stable):
1. Lift front-left → move forward → place down
2. Lift rear-right → move forward → place down
3. Lift front-right → move forward → place down
4. Lift rear-left → move forward → place down
5. Repeat

Each step = set 2 servo angles (shoulder + knee) with smooth interpolation.

### Wiring
```
ESP32-S3 (I2C pins)
    │ SDA (GPIO 8)
    │ SCL (GPIO 9)
    ▼
PCA9685 Servo Driver
    ├── CH0: Front-Left Shoulder
    ├── CH1: Front-Left Knee
    ├── CH2: Front-Right Shoulder
    ├── CH3: Front-Right Knee
    ├── CH4: Rear-Left Shoulder
    ├── CH5: Rear-Left Knee
    ├── CH6: Rear-Right Shoulder
    ├── CH7: Rear-Right Knee
    └── V+ ← 5V from buck converter ← 18650 batteries (7.4V)
```

---

## Phase 3: Smart Robot Cat (Week 3-4) — +80 RMB

Add sensing and interaction capabilities.

### Additional Shopping List

| # | Item | Spec | Qty | Price |
|---|------|------|-----|-------|
| 9 | Ultrasonic sensor | HC-SR04 | 1 | ~5 |
| 10 | IR sensors | TCRT5000 | 2 | ~6 |
| 11 | Head servo | SG90 (pan) | 1 | ~8 |
| 12 | Gripper servo | SG90 | 1 | ~8 |
| 13 | 3D printed gripper | Small claw | 1 | ~30 |
| 14 | 3D printed head mount | Tilt bracket | 1 | ~20 |

### Features Added
- **Obstacle avoidance**: HC-SR04 on head, detects objects < 20cm → turns away
- **Follow mode**: Two IR sensors on front, follows hand/object heat
- **Head pan**: Servo rotates head left/right to "look around"
- **Gripper**: Small claw on head or chest, picks up light objects (~50g)

### MCP Tools (new)

After Phase 3, MCP Bridge adds:
```
pet_walk(direction, steps)    - Walk forward/back/left/right
pet_turn(degrees)             - Turn in place
pet_look(direction)           - Pan head
pet_grab()                    - Close gripper
pet_release()                 - Open gripper
pet_follow(enable)            - Toggle follow mode
pet_avoid(enable)             - Toggle obstacle avoidance
pet_dance(routine)            - Play dance animation
```

---

## Full BOM Summary

| Phase | Items | Cost |
|-------|-------|------|
| Phase 1 | ESP32 round LCD + battery | ~165 |
| Phase 2 | 8 servos + driver + batteries + 3D print | ~215 |
| Phase 3 | Sensors + head servo + gripper | ~80 |
| **Total** | | **~460 RMB** |

---

## Software Integration per Phase

### Phase 1
```
/pet-sync speak "hello"     → ESP32 plays TTS
/pet-sync emotion happy     → Screen shows happy face
/pet-sync task add ...      → Autonomous task queue
```

### Phase 2 (adds)
```
/pet-sync walk forward 5    → Walk 5 steps forward
/pet-sync turn left         → Turn left 90°
/pet-sync dance             → Play dance routine
```

### Phase 3 (adds)
```
/pet-sync follow on         → Start following you
/pet-sync grab              → Close gripper
/pet-sync look around       → Pan head left-right
/pet-sync patrol            → Autonomous walk + avoid obstacles
```

---

## Timeline for Zero-Experience Builder

| Day | What to do |
|-----|-----------|
| Day 1 | Order ALL parts for Phase 1+2 (save on shipping) |
| Day 2-3 | While waiting: finish software plugin, publish, make content |
| Day 4 | Receive Phase 1 parts → flash firmware → desk pet works! |
| Day 5 | Film desk pet demo → post to social media |
| Day 6-8 | Phase 2: assemble legs, solder servo wires, 3D print arrives |
| Day 9-10 | Calibrate servos, tune walking gait |
| Day 11 | Film walking cat demo → post "v2: it walks now!" |
| Day 12-14 | Phase 3: add sensors, gripper, head servo |
| Day 15 | Full demo: walking + talking + grabbing → viral video potential |
