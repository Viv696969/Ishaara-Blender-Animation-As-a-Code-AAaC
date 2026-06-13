import bpy

def mirror_pose_right_to_left():
    # Ensure we are in Pose Mode
    obj = bpy.context.active_object
    if not obj or obj.type != 'ARMATURE' or bpy.context.mode != 'POSE':
        print("Error: You must be in Pose Mode with an Armature selected.")
        return

    # 1. Copy the current pose of the selected Right-side bones
    bpy.ops.pose.copy()
    
    # 2. Deselect the right side bones
    right_bones = bpy.context.selected_pose_bones.copy()
    for bone in right_bones:
        bone.bone.select = False
        
    # 3. Find and select the matching Left-side bones
    # Mixamo typical format is "mixamorig:RightHandFinger..." -> "mixamorig:LeftHandFinger..."
    for bone in right_bones:
        r_name = bone.name
        if "Right" in r_name:
            l_name = r_name.replace("Right", "Left")
        elif "R" in r_name:
            l_name = r_name.replace("R", "L")
        else:
            continue
            
        # If the matching left bone exists, select it
        if l_name in obj.pose.bones:
            obj.pose.bones[l_name].bone.select = True
            print(f"Targeting mirrored bone: {l_name}")

    # 4. Paste the flipped pose onto the selection
    bpy.ops.pose.paste(flipped=True)
    print("Successfully mirrored pose to the left hand!")

# Run the script
mirror_pose_right_to_left()