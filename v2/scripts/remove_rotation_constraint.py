import bpy

def remove_constraints_and_reset():
    # Ensure we are in Pose Mode
    obj = bpy.context.active_object
    if not obj or obj.type != 'ARMATURE' or bpy.context.mode != 'POSE':
        print("Error: You must be in Pose Mode with an Armature selected.")
        return

    # Get all currently selected pose bones
    selected_bones = bpy.context.selected_pose_bones
    
    if not selected_bones:
        print("Error: No bones selected. Please select the bones you want to reset.")
        return

    print(f"--- Resetting {len(selected_bones)} bones back to normal ---")

    for bone in selected_bones:
        # 1. Find and remove any Copy Rotation constraints
        # We loop backwards through the constraints to safely remove them while iterating
        for constraint in reversed(bone.constraints):
            if constraint.type == 'COPY_ROTATION':
                print(f"Removing constraint '{constraint.name}' from {bone.name}")
                bone.constraints.remove(constraint)

        # 2. Reset the rotation on the X-axis back to 0
        if bone.rotation_mode in ['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX']:
            bone.rotation_euler.x = 0.0
        else:
            # If it was left in Quaternion mode, reset the whole rotation to default
            bone.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
            
        print(f"Reset rotation to default for: {bone.name}")

# Run the function
remove_constraints_and_reset()