import bpy

def apply_knuckle_drivers():
    obj = bpy.context.active_object
    if not obj or obj.type != 'ARMATURE' or bpy.context.mode != 'POSE':
        print("❌ Error: You must be in Pose Mode with an Armature selected.")
        return

    selected_bones = bpy.context.selected_pose_bones
    if not selected_bones:
        print("❌ Error: Please select the finger bones.")
        return

    # Group bones by finger names just like before
    finger_groups = {}
    finger_keywords = [ "Index", "Middle", "Ring", "Pinky"]

    for bone in selected_bones:
        for keyword in finger_keywords:
            if keyword in bone.name:
                prefix = bone.name.split(keyword)[0] + keyword
                if prefix not in finger_groups:
                    finger_groups[prefix] = []
                finger_groups[prefix].append(bone)
                break

    # Process each finger chain
    for finger_prefix, bones in finger_groups.items():
        # Sort so bones[0] is Joint 1 (Knuckle), bones[1] is Joint 2, etc.
        bones.sort(key=lambda b: b.name)
        
        if len(bones) < 2:
            continue
            
        knuckle_bone = bones[0]  # The bone that will MOVE down/sideways (e.g., Index1)
        trigger_bone = bones[1]  # The bone whose ROTATION triggers the movement (e.g., Index2)

        print(f"🎬 Setting up Royal Skies Knuckle Drivers for: {knuckle_bone.name}")

        # Mixamo coordinates differ from the video: 
        # Typically, Local X is bending, Local Y moves side-to-side, Local Z goes down/up.
        # We will set up X and Y location drivers driven by the trigger bone's Local X Rotation.
        
        # --- DRIVER 1: X Location (Moves knuckle forward/sideways) ---
        drv_x = knuckle_bone.driver_add("location", 0).driver
        drv_x.type = 'SCRIPTED'
        drv_x.expression = "-var * 0.006"  # Values from the video [00:00:44]
        
        var_x = drv_x.variables.new()
        var_x.name = "var"
        var_x.type = 'TRANSFORMS'
        
        target_x = var_x.targets[0]
        target_x.id = obj
        target_x.bone_target = trigger_bone.name
        target_x.transform_type = 'ROT_X'  # Driven by Mixamo's finger curl axis
        target_x.transform_space = 'LOCAL_SPACE'

        # --- DRIVER 2: Z Location (Moves knuckle DOWN) ---
        drv_z = knuckle_bone.driver_add("location", 2).driver
        drv_z.type = 'SCRIPTED'
        drv_z.expression = "var * 0.007"  # Values from the video [00:01:05]
        
        var_z = drv_z.variables.new()
        var_z.name = "var"
        var_z.type = 'TRANSFORMS'
        
        target_z = var_z.targets[0]
        target_z.id = obj
        target_z.bone_target = trigger_bone.name
        target_z.transform_type = 'ROT_X'
        target_z.transform_space = 'LOCAL_SPACE'

        # Force updates on the drivers [00:00:44]
        knuckle_bone.bone.id_data.update_tag()

    print("\n✅ Advanced Royal Skies Hand Drivers successfully applied to all selected knuckles!")

apply_knuckle_drivers()