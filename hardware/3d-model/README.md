# 3D Printed Shell - Pixel Block Cat

Minecraft-style pixel cat shell for ESP32-S3-Touch-LCD-1.46C. The round screen sits in the face position - the screen IS the cat's face.

## Design Concept

```
Front View:              Side View:

    ┌──┐    ┌──┐         ┌──┐
    │▓▓│    │▓▓│         │▓▓├──────────┐
┌───┴──┴────┴──┴───┐     └──┤          │
│                   │        │  ○ screen│
│   ╭───────────╮   │        │          │
│   │  (screen) │   │        ├──────────┤
│   │  cat face │   │        │  body    │
│   ╰───────────╯   │        │  (hollow)│
│                   │        ├──────────┤
└────────┬──┬───────┘        │ ██ feet  │
    ┌────┴──┴────┐           └──────────┘
    │   body     │
    │  (hollow)  │
    ├──┬──┬──┬──┤
    │足│  │  │足│
    └──┘  └──┘
```

## Critical Dimensions

| Part | Size | Notes |
|------|------|-------|
| Screen opening | 38mm diameter circle | For 1.46" LCD visible area |
| Screen depth | 3mm recess | Screen sits flush with face |
| Head width | 55mm | Square, Minecraft style |
| Head height | 55mm | Including ear blocks |
| Ear blocks | 10x10x12mm each | Two blocks on top |
| Body width | 45mm | Slightly narrower than head |
| Body height | 30mm | Hollow inside for PCB |
| Internal cavity | 50x45x25mm minimum | For ESP32 board + battery |
| USB-C slot | 12x6mm | Back of body, centered |
| Speaker holes | 4x 2mm holes | Bottom of body |
| Feet | 4x 8x8x5mm blocks | Corners of body bottom |
| Total height | ~90mm | Head + body + feet |

## 3D Model Generation Prompts

### For Tripo3D (tripo3d.ai)

**English prompt:**
```
Cute Minecraft-style blocky cat figurine desk toy.
Square head with two square ear blocks on top.
Large circular hole in the face (38mm diameter) for embedding a round LCD screen.
Blocky rectangular body below the head, hollow inside.
Four small cube feet at the bottom.
Smooth flat surfaces, low-poly voxel aesthetic.
Height approximately 90mm.
Designed for 3D printing, solid walls 2mm thick.
Color: warm orange/amber body with darker orange ear tips.
```

**中文提示词（备用）：**
```
可爱的像素方块风格猫咪桌面手办。
正方形的头部，顶部有两个方块状的耳朵。
脸部中央有一个大圆形开口（直径38mm），用于嵌入圆形LCD屏幕。
头部下方是方块状的长方形身体，内部中空。
底部有四个小方块脚。
表面平整光滑，低多边形像素风格美感。
整体高度约90mm。
为3D打印设计，壁厚2mm。
颜色：温暖的橙色/琥珀色身体，耳尖深橙色。
```

### For Meshy (meshy.ai)

```
A cute voxel-style cat figure for desk display.
Minecraft aesthetic with blocky proportions.
Square head (55mm) with two small square ears on top.
A perfectly circular opening (38mm) centered on the face area.
Rectangular body (45x45x30mm) is hollow inside.
Four tiny cube feet.
Low-poly, smooth surfaces, 3D printable.
Total height ~90mm.
```

### For Blender (manual modeling)

If using Blender, the shape is simple enough to model manually:
1. Cube (55x55x45mm) → head
2. Two small cubes (10x10x12mm) on top → ears
3. Boolean cylinder (38mm diameter) through the face → screen hole
4. Cube (45x45x30mm) below → body
5. Shell modifier (2mm thickness) on body → make hollow
6. Four cubes (8x8x5mm) at corners → feet
7. Rectangular cutout on back → USB-C slot
8. Four small cylinders on bottom → speaker holes

## Post-Processing Notes

After getting the 3D model:

1. **Check the screen opening** - must be exactly 38mm for snug fit
2. **Add a 1mm lip/ledge** inside the face hole - screen rests on this
3. **Split into 2 parts** (head + body) for easier printing and assembly
4. **Add snap-fit clips** or magnets between head and body
5. **Paint after printing** - acrylic paint works well on PLA/resin

## Printing Recommendations

| Setting | Value |
|---------|-------|
| Material | PLA or Resin |
| Layer height | 0.12mm (resin) or 0.2mm (PLA) |
| Infill | 20% for PLA, N/A for resin |
| Supports | Yes (for ear overhangs) |
| Estimated cost | 30-50 RMB (Taobao "3D打印 定制") |
| Estimated time | 2-4 hours print, 1-2 days shipping |

## Ordering on Taobao

Search: **"3D打印 定制 树脂 手办"**

1. Send the STL file to the seller
2. Specify: 树脂打印, 总高90mm, 需要上色
3. Ask for a quote (usually 30-80 RMB depending on detail)
4. Delivery: 2-5 days

## Variant Designs

The same shell concept works for other Buddy species:

| Species | Head Shape | Ears/Features | Screen Position |
|---------|-----------|---------------|-----------------|
| Cat | Square | 2 triangle blocks | Face center |
| Dog/Shiba | Square | 2 floppy blocks | Face center |
| Dragon | Square + horns | 2 horn blocks + tail | Face center |
| Rabbit | Square | 2 tall rect blocks | Face center |
| Robot | Square | 2 antenna blocks | Face center |
| Blob | Rounded cube | None | Face center |
| Owl | Square | 2 tufts | Face center |

All use the same internal cavity and screen opening - only the exterior shape changes.
