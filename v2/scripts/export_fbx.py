import bpy
import os

# --- CONFIGURATION ---
output_dir = r"D:\Projects\Ishaara-Blender-Animation-As-a-Code-AAaC\data"
fbx_filename = "test.fbx"
START_FRAME = 20
END_FRAME = 80
# ---------------------

def get_fcurves(action, obj):
    """Compatible fcurve getter for Blender 5.x layered action API"""
    fcurves = []
    if not action.layers:
        return fcurves
    for layer in action.layers:
        for strip in layer.strips:
            # strip.channelbags is a list of ChannelBag objects
            for channelbag in strip.channelbags:
                fcurves.extend(channelbag.fcurves)
    return fcurves

def shift_keyframes(action, obj, offset):
    """Shift all keyframes by offset amount"""
    fcurves = get_fcurves(action, obj)
    for fcurve in fcurves:
        for kp in fcurve.keyframe_points:
            kp.co.x += offset
            kp.handle_left.x += offset
            kp.handle_right.x += offset
        fcurve.update()

def export_fbx_range():
    if not os.path.exists(output_dir):
        try:
            os.makedirs(output_dir)
        except Exception as e:
            print(f"Error creating directory {output_dir}: {e}")
            return

    filepath = os.path.join(output_dir, fbx_filename)

    original_start = bpy.context.scene.frame_start
    original_end = bpy.context.scene.frame_end

    duration = END_FRAME - START_FRAME
    bpy.context.scene.frame_start = 0
    bpy.context.scene.frame_end = duration

    obj = bpy.context.active_object
    action = None
    if obj and obj.animation_data and obj.animation_data.action:
        action = obj.animation_data.action
        shift_keyframes(action, obj, -START_FRAME)
        print(f"Shifted keyframes by -{START_FRAME}")
    else:
        print("⚠️ No action found on active object — exporting without keyframe shift")

    print(f"Exporting FBX remapped to frames 0–{duration} (originally {START_FRAME}–{END_FRAME})...")

    try:
        bpy.ops.export_scene.fbx(
            filepath=filepath,
            check_existing=False,

            use_selection=True,
            object_types={'ARMATURE', 'MESH'},

            global_scale=1.0,
            apply_unit_scale=True,
            bake_space_transform=False,

            axis_forward='-Z',
            axis_up='Y',

            mesh_smooth_type='OFF',
            use_mesh_modifiers=True,

            use_armature_deform_only=True,
            add_leaf_bones=False,

            bake_anim=True,
            bake_anim_step=1.0,
            bake_anim_simplify_factor=0.0,
            bake_anim_use_all_actions=False,
            bake_anim_use_nla_strips=False
        )
        print(f"✅ Successfully exported FBX to: {filepath}")

    except Exception as e:
        print(f"❌ Failed to export FBX: {e}")

    finally:
        bpy.context.scene.frame_start = original_start
        bpy.context.scene.frame_end = original_end

        if action:
            shift_keyframes(action, obj, +START_FRAME)
            print("🔁 Keyframes restored to original positions.")

export_fbx_range()