import bpy

# ── CONFIG ──────────────────────────────────────────────────────────────
# Set these to your actual armature names in Blender's outliner
SOURCE_ARMATURE = "Armature.001"        # the animation FBX armature (mixamorig bones)
TARGET_ARMATURE = "Armature"     # your model's armature (mixamorig2 bones)
BAKED_ACTION_NAME = "RetargetedAnim"
# ────────────────────────────────────────────────────────────────────────

def retarget():
    source = bpy.data.objects.get(SOURCE_ARMATURE)
    target = bpy.data.objects.get(TARGET_ARMATURE)

    if not source or not target:
        print("❌ Could not find armatures. Check SOURCE_ARMATURE and TARGET_ARMATURE names.")
        return

    print(f"✅ Source: {source.name} | Target: {target.name}")

    # Step 1: Go to pose mode on target
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.mode_set(mode='POSE')

    # Step 2: Add Copy Rotation constraints on each target bone
    # pointing to the matching source bone
    constrained_bones = []

    for bone in target.pose.bones:
        target_bone_name = bone.name  # e.g. mixamorig2Hips

        # Remap: mixamorig2Hips → mixamorigHips
        source_bone_name = target_bone_name.replace("mixamorig2", "mixamorig")

        if source_bone_name in source.pose.bones:
            # Add Copy Rotation constraint
            c = bone.constraints.new('COPY_ROTATION')
            c.name = "RETARGET_ROT"
            c.target = source
            c.subtarget = source_bone_name
            c.mix_mode = 'REPLACE'
            c.owner_space = 'LOCAL'
            c.target_space = 'LOCAL'

            # Also copy location for hips (root bone)
            if "Hips" in target_bone_name:
                cl = bone.constraints.new('COPY_LOCATION')
                cl.name = "RETARGET_LOC"
                cl.target = source
                cl.subtarget = source_bone_name
                cl.owner_space = 'LOCAL'
                cl.target_space = 'LOCAL'

            constrained_bones.append(bone.name)
        else:
            print(f"⚠️  No match for {target_bone_name} → {source_bone_name}")

    print(f"✅ Constrained {len(constrained_bones)} bones")

    # Step 3: Bake the animation onto the target armature
    # Get frame range from source action
    source_action = source.animation_data.action if source.animation_data else None
    if source_action:
        frame_start = int(source_action.frame_range[0])
        frame_end = int(source_action.frame_range[1])
    else:
        frame_start = bpy.context.scene.frame_start
        frame_end = bpy.context.scene.frame_end

    print(f"🎬 Baking frames {frame_start} → {frame_end}")

    # FIXED: Removed action_merge_type='NEW'
    bpy.ops.nla.bake(
        frame_start=frame_start,
        frame_end=frame_end,
        only_selected=False,
        visual_keying=True,
        clear_constraints=True,   # removes constraints after baking
        clear_parents=False,
        use_current_action=False, # This already forces a 'NEW' action by default
        bake_types={'POSE'}
    )
    # Step 4: Rename the baked action
    if target.animation_data and target.animation_data.action:
        target.animation_data.action.name = BAKED_ACTION_NAME
        print(f"✅ Baked action saved as '{BAKED_ACTION_NAME}'")

    bpy.ops.object.mode_set(mode='OBJECT')
    print("✅ Done! You can now export your model with the retargeted animation.")
    
# ── NEW STEP 5: DELETE THE SOURCE MODEL & ALL ATTACHED MESHES ───────────
    print(f"🗑️ Purging old animation model and its meshes...")
    
    # Switch back to object mode to perform deletions reliably
    if bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
        
    bpy.ops.object.select_all(action='DESELECT')
    
    # Gather the armature and all children objects (like Beta_Surface, Beta_Joints)
    objects_to_delete = [source]
    for obj in source.children:
        objects_to_delete.append(obj)
        
    # Select all gathered objects
    for obj in objects_to_delete:
        obj.select_set(True)
        print(f"   Selected for deletion: {obj.name}")
        
    # Delete them all in one fell swoop
    bpy.ops.object.delete()
    
    # Clear out unused mesh data from memory blocks to keep the file light
    bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
    # ────────────────────────────────────────────────────────────────────────

    print("✅ Done! Old model, Beta meshes, and hidden orphans completely removed.")

retarget()