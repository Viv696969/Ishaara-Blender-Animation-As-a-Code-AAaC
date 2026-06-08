import bpy
import json
import os
import mathutils

# --- CONFIGURATION ---
input_dir = r"D:\blender_json_data"
filename = "some_pose_json.json"

# YOUR FLAG: Set to True to mirror to the opposite side, False to apply normally
mirroring_on = False 
# ---------------------

def mirror_bone_name(name):
    """Swaps left/right Mixamo naming prefixes if mirroring is enabled."""
    if "Left" in name:
        return name.replace("Left", "Right")
    elif "Right" in name:
        return name.replace("Right", "Left")
    return name

def apply_json_rotations():
    # Ensure we are working with an armature in Pose Mode
    obj = bpy.context.active_object
    if not obj or obj.type != 'ARMATURE' or bpy.context.mode != 'POSE':
        print("Error: Please select your Mixamo Armature and enter POSE MODE.")
        return

    filepath = os.path.join(input_dir, filename)
    if not os.path.exists(filepath):
        print(f"Error: JSON file not found at {filepath}")
        return

    # Load JSON data
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    current_frame = bpy.context.scene.frame_current
    pose_bones = obj.pose.bones
    bones_mutated = 0

    # Apply rotations
    for saved_bone_name, rotation_data in data["bones"].items():
        # Determine target bone based on your mirroring flag
        target_bone_name = mirror_bone_name(saved_bone_name) if mirroring_on else saved_bone_name
        
        if target_bone_name in pose_bones:
            bone = pose_bones[target_bone_name]
            q = rotation_data["quaternion"]
            
            # Reconstruct Quaternion object
            quat_val = mathutils.Quaternion((q["w"], q["x"], q["y"], q["z"]))
            
            # If mirroring is on, invert X and W components to flip the orientation in local space
            if mirroring_on:
                quat_val.x = -quat_val.x
                quat_val.w = -quat_val.w
            
            # Apply to the bone
            bone.rotation_quaternion = quat_val
            
            # Insert a visual rotation keyframe at the current timeline playhead position
            bone.keyframe_insert(data_path="rotation_quaternion", frame=current_frame)
            bones_mutated += 1
        else:
            print(f"Warning: Bone '{target_bone_name}' not found on active armature.")

    if bones_mutated > 0:
        print(f"Successfully applied and keyframed {bones_mutated} bones on frame {current_frame} (Mirroring: {mirroring_on})")
        # Force viewport updates
        bpy.context.view_layer.update()

# Run the application script
apply_json_rotations()