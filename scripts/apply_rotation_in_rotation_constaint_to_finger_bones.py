import bpy
import math

# --- CONFIGURATION ---
# Change this variable to scale your rotation calculation
level = 6
# ---------------------

def rotate_all_selected_bones(level_val):
    # Ensure we are in Pose Mode
    obj = bpy.context.active_object
    if not obj or obj.type != 'ARMATURE' or bpy.context.mode != 'POSE':
        print("Error: You must be in Pose Mode with an Armature selected.")
        return

    # Get all currently selected pose bones
    selected_bones = bpy.context.selected_pose_bones
    
    if not selected_bones:
        print("Error: No bones selected. Please select one or more bones to rotate.")
        return

    # Calculate angle: level * 10 degrees, converted to radians for Blender
    degrees = level_val * 10
    radians = math.radians(degrees)

    print(f"--- Rotating {len(selected_bones)} bones by {degrees}° (Level: {level_val}) ---")

    # Loop through each selected bone and apply the rotation
    for bone in selected_bones:
        # Ensure the bone's rotation mode uses Euler angles (so we can explicitly target X)
        if bone.rotation_mode not in ['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX']:
            bone.rotation_mode = 'XYZ'

        # Apply the rotation to the X-axis (the red ring)
        bone.rotation_euler.x = radians
        print(f"Applied to: {bone.name}")

# Run the function
rotate_all_selected_bones(level)