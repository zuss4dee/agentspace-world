"""Viewport / lighting setup for architectural review. Does not change world coordinates."""
from __future__ import annotations

import math

import bpy
from mathutils import Euler, Vector


def setup_world_sky():
    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.sky_type = "HOSEK_WILKIE"
    if "Sun Direction" in sky.inputs:
        sky.inputs["Sun Direction"].default_value = (0.35, -0.55, 0.75)
    if "Turbidity" in sky.inputs:
        sky.inputs["Turbidity"].default_value = 2.2
    if "Ground Albedo" in sky.inputs:
        sky.inputs["Ground Albedo"].default_value = 0.28
    bg.inputs["Strength"].default_value = 0.95
    nt.links.new(sky.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])


def setup_sun(ox, oy):
    light = bpy.data.objects.get("Light")
    if light is None:
        data = bpy.data.lights.new("Sun", "SUN")
        light = bpy.data.objects.new("Light", data)
        bpy.context.scene.collection.objects.link(light)
    light.data.type = "SUN"
    light.data.energy = 3.6
    if hasattr(light.data, "angle"):
        light.data.angle = math.radians(0.45)
    light.data.color = (1.0, 0.96, 0.90)
    light.location = (ox + 70, oy - 95, 140)
    light.rotation_euler = (math.radians(48), math.radians(12), math.radians(38))
    return light


def setup_eevee():
    s = bpy.context.scene
    engines = bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items.keys()
    if "BLENDER_EEVEE_NEXT" in engines:
        s.render.engine = "BLENDER_EEVEE_NEXT"
    elif "BLENDER_EEVEE" in engines:
        s.render.engine = "BLENDER_EEVEE"
    ee = getattr(s, "eevee", None)
    if ee is None:
        return
    for attr, val in (
        ("use_raytracing", True),
        ("use_shadows", True),
        ("use_gtao", True),
        ("gtao_quality", 0.5),
        ("use_ssr", True),
        ("use_ssr_refraction", True),
        ("ssr_quality", 0.5),
        ("use_bloom", True),
    ):
        if hasattr(ee, attr):
            try:
                setattr(ee, attr, val)
            except Exception:
                pass


def frame_street_view(ox, oy):
    for area in bpy.context.screen.areas:
        if area.type != "VIEW_3D":
            continue
        for space in area.spaces:
            if space.type != "VIEW_3D":
                continue
            space.clip_start = 0.2
            space.clip_end = 8000
            space.shading.type = "MATERIAL"
            if hasattr(space.shading, "use_scene_lights"):
                space.shading.use_scene_lights = True
                space.shading.use_scene_world = True
            ov = space.overlay
            ov.show_relationship_lines = False
            ov.show_extras = False
            ov.show_bones = False
            r3d = space.region_3d
            r3d.view_perspective = "PERSP"
            r3d.view_location = Vector((ox - 8.0, oy - 18.0, 10.0))
            r3d.view_distance = 155.0
            r3d.view_rotation = Euler((1.05, 0.0, 0.62)).to_quaternion()
    cam = bpy.data.objects.get("Camera")
    if cam:
        cam.location = (ox - 18, oy - 78, 16)
        cam.rotation_euler = (math.radians(72), 0, math.radians(18))
