import bpy

def apply_mixamo_finger_constraints():
    # Ensure we are in Pose Mode
    obj = bpy.context.active_object
    if not obj or obj.type != 'ARMATURE' or bpy.context.mode != 'POSE':
        print("❌ Error: You must be in Pose Mode with an Armature selected.")
        return

    # Get currently selected pose_bones
    selected_bones = bpy.context.selected_pose_bones
    if not selected_bones:
        print("❌ Error: Please select the finger bones.")
        return

    # 1. Group bones by finger names (e.g., LeftHandIndex1, LeftHandIndex2 go into the 'Index' group)
    # Mixamo naming pattern: "mixamorig:LeftHand[FingerName][JointNumber]" or "mixamorig2:..."
    finger_groups = {}

    # List of standard Mixamo finger keywords to look for
    finger_keywords = ["Thumb", "Index", "Middle", "Ring", "Pinky"]

    for bone in selected_bones:
        for keyword in finger_keywords:
            if keyword in bone.name:
                # Group by the specific finger (e.g., "LeftHandIndex" or "RightHandThumb")
                # We split off the trailing joint number to get the finger prefix
                prefix = bone.name.split(keyword)[0] + keyword
                
                if prefix not in finger_groups:
                    finger_groups[prefix] = []
                
                finger_groups[prefix].append(bone)
                break

    if not finger_groups:
        print("⚠️ No standard Mixamo finger bones found in your selection.")
        return

    # 2. Process each finger group individually
    for finger_prefix, bones in finger_groups.items():
        # Sort bones by their trailing name numbers so joint 1 is first, then 2, then 3
        # Mixamo usually ends in 1, 2, 3 (e.g., LeftHandIndex1, LeftHandIndex2...)
        bones.sort(key=lambda b: b.name)

        print(f"\n🖐️ Processing Finger Chain: {finger_prefix} ({len(bones)} bones)")

        # Link parent joint to child joint sequentially down the chain
        for i in range(len(bones) - 1):
            target_bone = bones[i]       # The parent joint (driver)
            owner_bone = bones[i + 1]    # The child joint (driven)

            # Check if constraint already exists to avoid stacking duplicates
            constraint_name = f"Copy_Rot_{target_bone.name}"
            if constraint_name in owner_bone.constraints:
                print(f"   ⏭️ Skipping (already exists): {target_bone.name} -> {owner_bone.name}")
                continue

            print(f"   🔗 Linking: {target_bone.name} -> {owner_bone.name}")

            # Create the constraint
            constraint = owner_bone.constraints.new(type='COPY_ROTATION')
            constraint.name = constraint_name
            constraint.target = obj
            constraint.subtarget = target_bone.name

            # Enforce single axis controls (Mixamo curling is typically Local X axis)
            constraint.use_x = True
            constraint.use_y = False
            constraint.use_z = False

            # Use local spaces
            constraint.target_space = 'LOCAL'
            constraint.owner_space = 'LOCAL'

    print("\n✅ Setup complete! All selected finger chains linked successfully.")

apply_mixamo_finger_constraints()