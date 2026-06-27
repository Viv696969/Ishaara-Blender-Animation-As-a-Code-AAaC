import bpy
import json
import os
import mathutils

# --- CONFIGURATION ---
input_dir = r"D:\Projects\Ishaara-Blender-Animation-As-a-Code-AAaC\data"
filename = "mixamo_bone_rotations.json"  # Ensure this matches your file name

# FORCE EXACT FRAME RANGE
START_FRAME = 26   # Your 'n' frame
END_FRAME = 66    # Your 'm' frame

# MIRRORING
mirroring_on = False 
# ---------------------

def mirror_bone_name(name):
    """Swaps left/right Mixamo naming prefixes if mirroring is enabled."""
    if "Left" in name:
        return name.replace("Left", "Right")
    elif "Right" in name:
        return name.replace("Right", "Left")
    return name

def apply_json_rotations_over_range():
    obj = bpy.context.active_object
    if not obj or obj.type != 'ARMATURE' or bpy.context.mode != 'POSE':
        print("Error: Please select your Mixamo Armature and enter POSE MODE.")
        return

    filepath = os.path.join(input_dir, filename)
    if not os.path.exists(filepath):
        print(f"Error: JSON file not found at {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    pose_bones = obj.pose.bones
    total_keyframes_inserted = 0
    
    # Calculate exact frame steps
    total_steps = END_FRAME - START_FRAME
    if total_steps <= 0:
        print("Error: END_FRAME must be greater than START_FRAME.")
        return

    # STEP 1: Go to the start frame and snap a pristine copy of the starting poses
    bpy.context.scene.frame_set(START_FRAME)
    bpy.context.view_layer.update()
    
    start_rotations = {}
    target_rotations = {}
    
    # STEP 2: Parse and pre-calculate all target orientations
    for saved_bone_name, rotation_data in data["bones"].items():
        target_bone_name = mirror_bone_name(saved_bone_name) if mirroring_on else saved_bone_name
        
        if target_bone_name in pose_bones:
            # Store the current pose right at frame 26
            start_rotations[target_bone_name] = pose_bones[target_bone_name].rotation_quaternion.copy()
            
            # Reconstruct and store the target pose from JSON
            q = rotation_data["quaternion"]
            target_quat = mathutils.Quaternion((q["w"], q["x"], q["y"], q["z"]))
            if mirroring_on:
                target_quat.x = -target_quat.x
                target_quat.w = -target_quat.w
            target_rotations[target_bone_name] = target_quat

    print(f"Applying smooth transition from frame {START_FRAME} to {END_FRAME}...")

    # STEP 3: Step sequentially through every single frame in the window
    for frame in range(START_FRAME, END_FRAME + 1):
        # Move timeline head explicitly
        bpy.context.scene.frame_set(frame)
        
        # Linear factor: 0.0 at frame 26, 1.0 at frame 66
        factor = (frame - START_FRAME) / total_steps

        for bone_name, target_quat in target_rotations.items():
            bone = pose_bones[bone_name]
            start_quat = start_rotations[bone_name]
            
            # SLERP (Spherical Linear Interpolation) handles seamless rotational blending
            smooth_quat = start_quat.slerp(target_quat, factor)
            
            # Force apply directly to bone properties
            bone.rotation_quaternion = smooth_quat
            
            # Explicitly force-insert the keyframe exactly on this current frame sequence
            bone.keyframe_insert(data_path="rotation_quaternion", frame=frame)
            total_keyframes_inserted += 1

    if total_keyframes_inserted > 0:
        print(f"🎉 Success! Applied linear rotation blend across {START_FRAME}➔{END_FRAME}.")
        print(f"Total keys generated: {total_keyframes_inserted}")
        
        # Reset timeline to start frame and push a visual screen refresh
        bpy.context.scene.frame_set(START_FRAME)
        bpy.context.view_layer.update()

# Execute the updated loop
apply_json_rotations_over_range()