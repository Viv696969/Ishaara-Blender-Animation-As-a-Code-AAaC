import bpy

def apply_mixamo_finger_constraints():
    # Ensure we are in Pose Mode
    obj = bpy.context.active_object
    if not obj or obj.type != 'ARMATURE' or bpy.context.mode != 'POSE':
        print("Error: You must be in Pose Mode with an Armature selected.")
        return

    # Get currently selected pose bones
    selected_bones = bpy.context.selected_pose_bones
    
    if len(selected_bones) < 2:
        print("Error: Please select at least two bones (e.g., Nakle/Proximal and Middle finger bones).")
        return

    # Sort bones based on selection order if possible, 
    # or rely on the order you clicked them.
    # We will pair them up sequentially: (Bone1 -> Bone2), (Bone2 -> Bone3), etc.
    for i in range(len(selected_bones) - 1):
        target_bone = selected_bones[i]      # The 'driver' bone (e.g., Knuckle)
        owner_bone = selected_bones[i + 1]   # The 'driven' bone (e.g., Middle joint)

        print(f"Applying Copy Rotation: {target_bone.name} -> {owner_bone.name}")

        # 1. Add the Copy Rotation constraint to the owner bone
        constraint = owner_bone.constraints.new(type='COPY_ROTATION')
        constraint.name = f"Copy_Rot_{target_bone.name}"

        # 2. Set the Target armature and the specific target bone
        constraint.target = obj
        constraint.subtarget = target_bone.name

        # 3. Diselect Y and Z axes (Only X remains enabled)
        constraint.use_x = True
        constraint.use_y = False
        constraint.use_z = False

        # 4. Set Target and Owner space to Local Space
        constraint.target_space = 'LOCAL'
        constraint.owner_space = 'LOCAL'

apply_mixamo_finger_constraints()