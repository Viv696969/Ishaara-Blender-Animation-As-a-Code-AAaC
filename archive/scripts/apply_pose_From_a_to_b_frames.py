import bpy

# ── CONFIG ──────────────────────────────────────────────────────────────
START_FRAME = 1       # The frame where the pose should start
END_FRAME = 24        # The frame where the pose should end
# ────────────────────────────────────────────────────────────────────────

def keyframe_current_pose_over_range():
    # Ensure we are in Pose Mode
    obj = bpy.context.active_object
    if not obj or obj.type != 'ARMATURE' or bpy.context.mode != 'POSE':
        print("❌ Error: You must be in Pose Mode with an Armature selected.")
        return

    # Get currently selected pose bones
    selected_bones = bpy.context.selected_pose_bones
    if not selected_bones:
        print("❌ Error: Please select the bones you want to keyframe.")
        return

    print(f"🎬 Copying and keyframing pose for {len(selected_bones)} bones from frame {START_FRAME} to {END_FRAME}...")

    # Store the original frame so we can return the timeline back to where it was
    original_frame = bpy.context.scene.frame_current

    # Loop through every frame in your specified range
    for frame in range(START_FRAME, END_FRAME + 1):
        # Move the timeline cursor to the target frame
        bpy.context.scene.frame_set(frame)
        
        # Insert rotation keyframes for every selected bone
        for bone in selected_bones:
            # Looks at the bone's rotation mode (Quaternion vs Euler) and keys it correctly
            if bone.rotation_mode == 'QUATERNION':
                bone.keyframe_insert(data_path="rotation_quaternion", index=-1)
            elif bone.rotation_mode == 'AXIS_ANGLE':
                bone.keyframe_insert(data_path="rotation_axis_angle", index=-1)
            else:
                bone.keyframe_insert(data_path="rotation_euler", index=-1)

    # Restore timeline back to where the user had it
    bpy.context.scene.frame_set(original_frame)
    print("✅ Done! Animation successfully baked over the specified frame range.")

keyframe_current_pose_over_range()