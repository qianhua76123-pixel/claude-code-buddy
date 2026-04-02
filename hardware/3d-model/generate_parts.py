"""
AI Pet Buddy - Blender Auto-Modeling Script
Generates all 7 printable parts as separate objects.

Usage:
  1. Open Blender (2.8+)
  2. Switch to Scripting workspace
  3. Open this file → Run Script
  4. All parts appear in the scene, exportable as individual STL files

Units: millimeters (Scene unit scale = 0.001)
"""

import bpy
import bmesh
import math
from mathutils import Vector, Matrix

# ── Cleanup ──
def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for col in bpy.data.collections:
        if col.name != 'Scene Collection':
            bpy.data.collections.remove(col)

clear_scene()

# Set scene to millimeters
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 0.001
bpy.context.scene.unit_settings.length_unit = 'MILLIMETERS'

# ── Collections ──
def make_collection(name):
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col

col_head = make_collection("Part1_HEAD")
col_base = make_collection("Part2_BASE")
col_legs = make_collection("Parts3-6_LEGS")
col_hat_wizard = make_collection("Part7_HAT_Wizard")
col_hat_crown = make_collection("Part7_HAT_Crown")
col_hat_catears = make_collection("Part7_HAT_CatEars")
col_assembled = make_collection("_ASSEMBLED_PREVIEW")

# ── Config ──
WALL = 2.0        # Wall thickness
CORNER_R = 3.0    # Corner bevel radius
TOLERANCE = 0.3   # Fit tolerance

HEAD_W = 55.0     # Width
HEAD_D = 55.0     # Depth
HEAD_H = 38.0     # Height
SCREEN_DIA = 38.0 # Screen opening diameter
SCREEN_RECESS = 1.5

BASE_W = 55.0
BASE_D = 55.0
BASE_H = 18.0

SERVO_L = 23.0    # SG90 length
SERVO_W = 12.5    # SG90 width (with tolerance)
SERVO_H = 23.0    # SG90 height
SERVO_SHAFT_DIA = 8.0
SERVO_TAB_W = 32.5

LEG_W = 14.0
LEG_D = 14.0
LEG_H = 15.0
FOOT_W = 16.0
FOOT_D = 18.0
FOOT_H = 4.0
HORN_SLOT_W = 2.2  # Servo horn cross width
HORN_SLOT_L = 18.0 # Servo horn cross length

PEG_DIA = 3.8     # Alignment peg diameter
PEG_H = 3.0       # Peg height
PEG_HOLE_DIA = PEG_DIA + TOLERANCE

SCREW_DIA = 2.2   # M2 screw hole
SCREW_BOSS_DIA = 5.0

BATT_W = 35.0
BATT_D = 20.0
BATT_H = 12.0

USB_W = 12.0
USB_H = 7.0

SPEAKER_HOLE_DIA = 2.0
SPEAKER_HOLES_N = 8
SPEAKER_HOLES_R = 8.0

# ── Helpers ──
def set_origin_bottom(obj):
    """Move origin to bottom center of object."""
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    obj.location.z += obj.dimensions.z / 2
    bpy.ops.object.select_all(action='DESELECT')

def add_cube(name, size, location=(0,0,0), collection=None):
    """Add a cube with given size (x,y,z) at location."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(scale=True)
    if collection:
        # Move to collection
        for c in obj.users_collection:
            c.objects.unlink(obj)
        collection.objects.link(obj)
    return obj

def add_cylinder(name, radius, depth, location=(0,0,0), collection=None, segments=32):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=segments, location=location)
    obj = bpy.context.active_object
    obj.name = name
    if collection:
        for c in obj.users_collection:
            c.objects.unlink(obj)
        collection.objects.link(obj)
    return obj

def add_cone(name, r1, r2, depth, location=(0,0,0), collection=None):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, vertices=32, location=location)
    obj = bpy.context.active_object
    obj.name = name
    if collection:
        for c in obj.users_collection:
            c.objects.unlink(obj)
        collection.objects.link(obj)
    return obj

def boolean_diff(target, cutter, apply=True):
    mod = target.modifiers.new(name='Bool', type='BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cutter
    if apply:
        bpy.context.view_layer.objects.active = target
        bpy.ops.object.modifier_apply(modifier=mod.name)
    cutter.hide_set(True)
    cutter.hide_render = True

def boolean_union(target, adder, apply=True):
    mod = target.modifiers.new(name='Bool', type='BOOLEAN')
    mod.operation = 'UNION'
    mod.object = adder
    if apply:
        bpy.context.view_layer.objects.active = target
        bpy.ops.object.modifier_apply(modifier=mod.name)
    adder.hide_set(True)
    adder.hide_render = True

def add_bevel(obj, width=CORNER_R, segments=3):
    mod = obj.modifiers.new(name='Bevel', type='BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(60)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)

def set_material(obj, color_hex, name=None):
    """Set simple material with hex color like '#e8944a'."""
    mat = bpy.data.materials.new(name=name or obj.name + "_mat")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    r = int(color_hex[1:3], 16) / 255
    g = int(color_hex[3:5], 16) / 255
    b = int(color_hex[5:7], 16) / 255
    bsdf.inputs[0].default_value = (r, g, b, 1)
    bsdf.inputs[2].default_value = 0.65  # Roughness
    obj.data.materials.clear()
    obj.data.materials.append(mat)

def delete_obj(obj):
    bpy.data.objects.remove(obj, do_unlink=True)

# ══════════════════════════════════════════
#  PART 1: HEAD
# ══════════════════════════════════════════

def build_head():
    # Outer shell
    head = add_cube("HEAD_outer", (HEAD_W, HEAD_D, HEAD_H), (0, 0, HEAD_H/2), col_head)
    add_bevel(head, CORNER_R, 3)

    # Inner void (hollow out)
    void = add_cube("HEAD_void",
        (HEAD_W - WALL*2, HEAD_D - WALL*2, HEAD_H - WALL),
        (0, 0, HEAD_H/2 + WALL/2), col_head)
    boolean_diff(head, void)
    delete_obj(void)

    # Screen opening (front face, circular)
    screen_hole = add_cylinder("HEAD_screen_hole",
        SCREEN_DIA/2, WALL + 2,
        (0, HEAD_D/2, HEAD_H/2 + 2), col_head)
    screen_hole.rotation_euler.x = math.radians(90)
    bpy.ops.object.transform_apply(rotation=True)
    boolean_diff(head, screen_hole)
    delete_obj(screen_hole)

    # Screen recess ledge (slightly larger hole, shallow)
    screen_recess = add_cylinder("HEAD_screen_recess",
        SCREEN_DIA/2 + 1, SCREEN_RECESS,
        (0, HEAD_D/2 - SCREEN_RECESS/2 + 0.1, HEAD_H/2 + 2), col_head)
    screen_recess.rotation_euler.x = math.radians(90)
    bpy.ops.object.transform_apply(rotation=True)
    boolean_diff(head, screen_recess)
    delete_obj(screen_recess)

    # Bottom opening (open bottom for mating with BASE)
    bottom_cut = add_cube("HEAD_bottom_cut",
        (HEAD_W - WALL*2 + 1, HEAD_D - WALL*2 + 1, WALL + 1),
        (0, 0, -0.5), col_head)
    boolean_diff(head, bottom_cut)
    delete_obj(bottom_cut)

    # Alignment pegs (bottom rim, 4 corners)
    peg_offset = HEAD_W/2 - 6
    for x_sign in [-1, 1]:
        for y_sign in [-1, 1]:
            peg = add_cylinder("HEAD_peg",
                PEG_DIA/2, PEG_H,
                (x_sign * peg_offset, y_sign * peg_offset, -PEG_H/2), col_head)
            boolean_union(head, peg)
            delete_obj(peg)

    # Hat peg holes (top, 2x for snap-fit hat)
    for x_off in [-8, 8]:
        hat_hole = add_cylinder("HEAD_hat_hole",
            PEG_HOLE_DIA/2, PEG_H + 1,
            (x_off, 0, HEAD_H - PEG_H/2), col_head)
        boolean_diff(head, hat_hole)
        delete_obj(hat_hole)

    # Board mounting shelves (4 small tabs inside)
    board_z = HEAD_H/2 + 2  # Board sits at mid-height
    for x_sign in [-1, 1]:
        for y_sign in [-1, 1]:
            tab = add_cube("HEAD_board_tab",
                (4, 4, 1.5),
                (x_sign * 18, y_sign * 18, board_z), col_head)
            boolean_union(head, tab)
            delete_obj(tab)

    set_material(head, '#e8944a', 'Orange_Body')
    return head

# ══════════════════════════════════════════
#  PART 2: BASE
# ══════════════════════════════════════════

def build_base():
    # Outer shell
    base = add_cube("BASE_outer", (BASE_W, BASE_D, BASE_H), (0, 0, BASE_H/2), col_base)
    add_bevel(base, CORNER_R, 3)

    # Inner void
    void = add_cube("BASE_void",
        (BASE_W - WALL*2, BASE_D - WALL*2, BASE_H - WALL),
        (0, 0, BASE_H/2 + WALL/2), col_base)
    boolean_diff(base, void)
    delete_obj(void)

    # 4x Servo pockets (corners, angled 45°)
    servo_offset = 16  # Distance from center to servo pocket center
    for i, (x_sign, y_sign) in enumerate([(-1,1), (1,1), (-1,-1), (1,-1)]):
        pocket = add_cube(f"BASE_servo_pocket_{i}",
            (SERVO_L + TOLERANCE, SERVO_W + TOLERANCE, SERVO_H),
            (x_sign * servo_offset, y_sign * servo_offset, BASE_H/2), col_base)
        # Rotate 45 degrees to fit in corner
        pocket.rotation_euler.z = math.radians(45 * x_sign * y_sign)
        bpy.ops.object.transform_apply(rotation=True)
        boolean_diff(base, pocket)
        delete_obj(pocket)

        # Shaft hole through bottom
        shaft = add_cylinder(f"BASE_shaft_{i}",
            SERVO_SHAFT_DIA/2, WALL + 2,
            (x_sign * servo_offset, y_sign * servo_offset, -1), col_base)
        boolean_diff(base, shaft)
        delete_obj(shaft)

    # Battery compartment (center)
    batt = add_cube("BASE_battery",
        (BATT_W, BATT_D, BATT_H),
        (0, 0, WALL + BATT_H/2), col_base)
    boolean_diff(base, batt)
    delete_obj(batt)

    # USB-C access hole (rear wall)
    usb = add_cube("BASE_usb",
        (USB_W, WALL + 2, USB_H),
        (0, -BASE_D/2, WALL + USB_H/2 + 2), col_base)
    boolean_diff(base, usb)
    delete_obj(usb)

    # Speaker holes (bottom face, circle pattern)
    for i in range(SPEAKER_HOLES_N):
        angle = i * (2 * math.pi / SPEAKER_HOLES_N)
        x = math.cos(angle) * SPEAKER_HOLES_R
        y = math.sin(angle) * SPEAKER_HOLES_R
        hole = add_cylinder(f"BASE_speaker_{i}",
            SPEAKER_HOLE_DIA/2, WALL + 1,
            (x, y, -0.5), col_base)
        boolean_diff(base, hole)
        delete_obj(hole)

    # Alignment peg holes (top rim, matches HEAD pegs)
    peg_offset = BASE_W/2 - 6
    for x_sign in [-1, 1]:
        for y_sign in [-1, 1]:
            hole = add_cylinder("BASE_peg_hole",
                PEG_HOLE_DIA/2, PEG_H + 1,
                (x_sign * peg_offset, y_sign * peg_offset, BASE_H - PEG_H/2), col_base)
            boolean_diff(base, hole)
            delete_obj(hole)

    # Screw bosses (4 corners, for M2 screws from bottom)
    for x_sign in [-1, 1]:
        for y_sign in [-1, 1]:
            boss = add_cylinder("BASE_screw_boss",
                SCREW_BOSS_DIA/2, BASE_H - WALL,
                (x_sign * (BASE_W/2 - 5), y_sign * (BASE_D/2 - 5), BASE_H/2 + WALL/2), col_base)
            boolean_union(base, boss)
            delete_obj(boss)

            screw_hole = add_cylinder("BASE_screw_hole",
                SCREW_DIA/2, BASE_H + 2,
                (x_sign * (BASE_W/2 - 5), y_sign * (BASE_D/2 - 5), BASE_H/2), col_base)
            boolean_diff(base, screw_hole)
            delete_obj(screw_hole)

    set_material(base, '#d07830', 'Orange_Dark')
    base.location.z = -0.5  # Slight offset for visibility
    return base

# ══════════════════════════════════════════
#  PARTS 3-6: LEGS (x4)
# ══════════════════════════════════════════

def build_leg(name_suffix="", collection=None):
    col = collection or col_legs

    # Main leg block
    leg = add_cube(f"LEG_{name_suffix}",
        (LEG_W, LEG_D, LEG_H),
        (0, 0, LEG_H/2 + FOOT_H), col)
    add_bevel(leg, 1.0, 2)

    # Foot pad (wider)
    foot = add_cube(f"LEG_foot_{name_suffix}",
        (FOOT_W, FOOT_D, FOOT_H),
        (0, 1, FOOT_H/2), col)
    add_bevel(foot, 0.8, 2)
    boolean_union(leg, foot)
    delete_obj(foot)

    # Servo horn cross-shaped slot (top of leg)
    slot_z = LEG_H + FOOT_H - 1.5
    slot1 = add_cube(f"LEG_slot1_{name_suffix}",
        (HORN_SLOT_W, HORN_SLOT_L, 4),
        (0, 0, slot_z), col)
    boolean_diff(leg, slot1)
    delete_obj(slot1)

    slot2 = add_cube(f"LEG_slot2_{name_suffix}",
        (HORN_SLOT_L, HORN_SLOT_W, 4),
        (0, 0, slot_z), col)
    boolean_diff(leg, slot2)
    delete_obj(slot2)

    # Center screw hole (for M2 to servo shaft)
    screw = add_cylinder(f"LEG_screw_{name_suffix}",
        SCREW_DIA/2, LEG_H,
        (0, 0, LEG_H/2 + FOOT_H), col)
    boolean_diff(leg, screw)
    delete_obj(screw)

    set_material(leg, '#e8944a', 'Orange_Body')
    return leg

def build_all_legs():
    legs = []
    # Spread them out for printing layout
    positions = [(-40, 0), (-15, 0), (15, 0), (40, 0)]
    names = ['FL', 'FR', 'BL', 'BR']
    for (x, y), name in zip(positions, names):
        leg = build_leg(name)
        leg.location.x = x
        leg.location.y = y + 80  # Offset from main body
        legs.append(leg)
    return legs

# ══════════════════════════════════════════
#  PART 7: HATS
# ══════════════════════════════════════════

def build_hat_wizard():
    # Brim
    brim = add_cube("WIZARD_brim", (60, 60, 4), (0, 0, 2), col_hat_wizard)
    add_bevel(brim, 2, 2)

    # Mid section
    mid = add_cube("WIZARD_mid", (30, 28, 18), (0, 0, 4 + 9), col_hat_wizard)
    add_bevel(mid, 2, 2)
    boolean_union(brim, mid)
    delete_obj(mid)

    # Top narrow (bent tip)
    top = add_cube("WIZARD_top", (18, 18, 14), (4, 0, 4 + 18 + 7), col_hat_wizard)
    add_bevel(top, 2, 2)
    boolean_union(brim, top)
    delete_obj(top)

    # Tip
    tip = add_cone("WIZARD_tip", 6, 1, 10, (8, 0, 4 + 18 + 14 + 5), col_hat_wizard)
    tip.rotation_euler.y = math.radians(15)
    bpy.ops.object.transform_apply(rotation=True)
    boolean_union(brim, tip)
    delete_obj(tip)

    # Snap-fit pegs (bottom)
    for x_off in [-8, 8]:
        peg = add_cylinder("WIZARD_peg", PEG_DIA/2 - 0.1, PEG_H,
            (x_off, 0, -PEG_H/2), col_hat_wizard)
        boolean_union(brim, peg)
        delete_obj(peg)

    # Star decorations (small bumps)
    for pos in [(-10, 0, 15), (8, 0, 20), (-5, 0, 28)]:
        star = add_cylinder("WIZARD_star", 1.5, 1.5, pos, col_hat_wizard)
        star.rotation_euler.x = math.radians(90)
        bpy.ops.object.transform_apply(rotation=True)
        boolean_union(brim, star)
        delete_obj(star)

    set_material(brim, '#7b5ea7', 'Purple_Hat')
    brim.location = (0, -80, 0)  # Offset for layout
    return brim

def build_hat_crown():
    # Band
    band = add_cube("CROWN_band", (52, 52, 12), (0, 0, 6), col_hat_crown)
    add_bevel(band, 2, 2)

    # Hollow inside
    void = add_cube("CROWN_void", (48, 48, 10), (0, 0, 7), col_hat_crown)
    boolean_diff(band, void)
    delete_obj(void)

    # Points (5 triangular)
    for i in range(5):
        angle = i * (2 * math.pi / 5)
        x = math.cos(angle) * 20
        y = math.sin(angle) * 20
        point = add_cone("CROWN_point", 6, 1, 10, (x, y, 12 + 5), col_hat_crown)
        boolean_union(band, point)
        delete_obj(point)

    # Snap pegs
    for x_off in [-8, 8]:
        peg = add_cylinder("CROWN_peg", PEG_DIA/2 - 0.1, PEG_H,
            (x_off, 0, -PEG_H/2), col_hat_crown)
        boolean_union(band, peg)
        delete_obj(peg)

    set_material(band, '#f0c848', 'Gold_Crown')
    band.location = (80, -80, 0)
    return band

def build_hat_catears():
    # Base plate
    base = add_cube("CATEARS_base", (50, 25, 3), (0, 0, 1.5), col_hat_catears)
    add_bevel(base, 1, 2)

    # Left ear
    ear_l = add_cone("CATEARS_left", 10, 1, 22, (-15, 0, 3 + 11), col_hat_catears)
    boolean_union(base, ear_l)
    delete_obj(ear_l)

    # Right ear
    ear_r = add_cone("CATEARS_right", 10, 1, 22, (15, 0, 3 + 11), col_hat_catears)
    boolean_union(base, ear_r)
    delete_obj(ear_r)

    # Inner ear recesses (for painting pink)
    for x in [-15, 15]:
        inner = add_cone("CATEARS_inner", 5, 0.5, 12, (x, 2, 3 + 10), col_hat_catears)
        boolean_diff(base, inner)
        delete_obj(inner)

    # Snap pegs
    for x_off in [-8, 8]:
        peg = add_cylinder("CATEARS_peg", PEG_DIA/2 - 0.1, PEG_H,
            (x_off, 0, -PEG_H/2), col_hat_catears)
        boolean_union(base, peg)
        delete_obj(peg)

    set_material(base, '#e8944a', 'Orange_Ears')
    base.location = (-80, -80, 0)
    return base

# ══════════════════════════════════════════
#  ASSEMBLED PREVIEW
# ══════════════════════════════════════════

def build_assembled_preview():
    """Build a complete assembled view for visualization."""
    # HEAD
    head = add_cube("PREVIEW_head", (HEAD_W, HEAD_D, HEAD_H),
        (0, 0, BASE_H + HEAD_H/2), col_assembled)
    add_bevel(head, CORNER_R, 3)
    # Screen hole
    sh = add_cylinder("PREVIEW_sh", SCREEN_DIA/2, WALL+2,
        (0, HEAD_D/2, BASE_H + HEAD_H/2 + 2), col_assembled)
    sh.rotation_euler.x = math.radians(90)
    bpy.ops.object.transform_apply(rotation=True)
    boolean_diff(head, sh)
    delete_obj(sh)
    # Screen disc (dark)
    screen = add_cylinder("PREVIEW_screen", SCREEN_DIA/2 - 1, 0.5,
        (0, HEAD_D/2 - 0.5, BASE_H + HEAD_H/2 + 2), col_assembled)
    screen.rotation_euler.x = math.radians(90)
    bpy.ops.object.transform_apply(rotation=True)
    set_material(screen, '#1a1e28', 'Screen_Dark')
    set_material(head, '#e8944a', 'Preview_Orange')

    # BASE
    base = add_cube("PREVIEW_base", (BASE_W, BASE_D, BASE_H),
        (0, 0, BASE_H/2), col_assembled)
    add_bevel(base, CORNER_R, 3)
    set_material(base, '#d07830', 'Preview_DarkOrange')

    # LEGS (4)
    leg_positions = [
        (-16, 16, "FL"), (16, 16, "FR"),
        (-16, -16, "BL"), (16, -16, "BR"),
    ]
    for lx, ly, ln in leg_positions:
        leg = add_cube(f"PREVIEW_leg_{ln}",
            (LEG_W, LEG_D, LEG_H + FOOT_H),
            (lx, ly, -(LEG_H + FOOT_H)/2), col_assembled)
        add_bevel(leg, 1, 2)
        set_material(leg, '#e8944a', f'Preview_Leg_{ln}')

    # WIZARD HAT
    hat = add_cube("PREVIEW_hat_brim", (58, 58, 4),
        (0, 0, BASE_H + HEAD_H + 2), col_assembled)
    add_bevel(hat, 2, 2)
    hat_mid = add_cube("PREVIEW_hat_mid", (28, 26, 16),
        (0, 0, BASE_H + HEAD_H + 4 + 8), col_assembled)
    add_bevel(hat_mid, 2, 2)
    boolean_union(hat, hat_mid)
    delete_obj(hat_mid)
    hat_top = add_cube("PREVIEW_hat_top", (16, 16, 12),
        (4, 0, BASE_H + HEAD_H + 4 + 16 + 6), col_assembled)
    add_bevel(hat_top, 2, 2)
    boolean_union(hat, hat_top)
    delete_obj(hat_top)
    set_material(hat, '#7b5ea7', 'Preview_Purple')

# ══════════════════════════════════════════
#  BUILD ALL
# ══════════════════════════════════════════

print("Building HEAD...")
build_head()

print("Building BASE...")
build_base()

print("Building LEGS...")
build_all_legs()

print("Building WIZARD HAT...")
build_hat_wizard()

print("Building CROWN...")
build_hat_crown()

print("Building CAT EARS...")
build_hat_catears()

print("Building ASSEMBLED PREVIEW...")
build_assembled_preview()

# ── Camera & Lighting ──
bpy.ops.object.light_add(type='SUN', location=(3, -3, 5))
sun = bpy.context.active_object
sun.data.energy = 3
sun.rotation_euler = (math.radians(45), math.radians(15), math.radians(30))

bpy.ops.object.camera_add(location=(80, -100, 70))
cam = bpy.context.active_object
cam.rotation_euler = (math.radians(55), 0, math.radians(35))
bpy.context.scene.camera = cam

# Frame all objects
bpy.ops.object.select_all(action='SELECT')
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        override = bpy.context.copy()
        override['area'] = area
        override['region'] = area.regions[-1]
        break

print("")
print("=" * 50)
print("  ALL PARTS GENERATED!")
print("=" * 50)
print("")
print("  Collections in Outliner:")
print("    Part1_HEAD          → Main body top shell")
print("    Part2_BASE          → Bottom with servo pockets")
print("    Parts3-6_LEGS       → 4 identical legs (spread out)")
print("    Part7_HAT_Wizard    → Purple wizard hat")
print("    Part7_HAT_Crown     → Gold crown")
print("    Part7_HAT_CatEars   → Cat ear attachment")
print("    _ASSEMBLED_PREVIEW  → How it looks together")
print("")
print("  To export STL per part:")
print("    1. Select all objects in a collection")
print("    2. File → Export → STL")
print("    3. Check 'Selection Only'")
print("    4. Save as PartX_NAME.stl")
print("")
print("  ⚠️ MEASURE YOUR REAL BOARD before printing!")
print("     Adjust SCREEN_DIA and internal dimensions if needed.")
print("")
