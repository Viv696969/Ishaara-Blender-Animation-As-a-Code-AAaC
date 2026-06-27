bl_info = {
    "name": "Ishaara Animation Tools",
    "author": "Ishaara",
    "version": (1, 0, 0),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > Ishaara",
    "description": "Retargeting, pose tools, and FBX export for Mixamo rigs",
    "category": "Animation",
}

import bpy
import json
import os
import math
import mathutils


# ─────────────────────────────────────────────────────────────────────────────
# SCENE PROPERTIES
# ─────────────────────────────────────────────────────────────────────────────

class IsharaProps(bpy.types.PropertyGroup):
    # Retarget
    source_armature: bpy.props.StringProperty(name="Source Armature", description="Armature with the animation (mixamorig bones)")
    target_armature: bpy.props.StringProperty(name="Target Armature", description="Your model's armature (mixamorig2 bones)")
    baked_action_name: bpy.props.StringProperty(name="Baked Action Name", default="RetargetedAnim")

    # Pose JSON
    pose_json_path: bpy.props.StringProperty(name="Pose JSON", subtype='FILE_PATH', description="Path to the bone rotations JSON file")
    pose_start_frame: bpy.props.IntProperty(name="Start Frame", default=1, min=0)
    pose_end_frame: bpy.props.IntProperty(name="End Frame", default=60, min=1)
    pose_mirror: bpy.props.BoolProperty(name="Mirror Left/Right", default=False)

    # Collect Bones
    collect_dir: bpy.props.StringProperty(name="Output Directory", subtype='DIR_PATH')
    collect_filename: bpy.props.StringProperty(name="Filename", default="bone_rotations.json")

    # Export FBX
    export_dir: bpy.props.StringProperty(name="Output Directory", subtype='DIR_PATH')
    export_filename: bpy.props.StringProperty(name="Filename", default="export.fbx")
    export_start_frame: bpy.props.IntProperty(name="Start Frame", default=0, min=0)
    export_end_frame: bpy.props.IntProperty(name="End Frame", default=60, min=1)
    export_rig_only: bpy.props.BoolProperty(name="Rig Only (no mesh)", default=False)


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def get_fcurves(action):
    fcurves = []
    if not action.layers:
        return fcurves
    for layer in action.layers:
        for strip in layer.strips:
            for channelbag in strip.channelbags:
                fcurves.extend(channelbag.fcurves)
    return fcurves


def shift_keyframes(action, offset):
    for fcurve in get_fcurves(action):
        for kp in fcurve.keyframe_points:
            kp.co.x += offset
            kp.handle_left.x += offset
            kp.handle_right.x += offset
        fcurve.update()


def mirror_bone_name(name):
    if "Left" in name:
        return name.replace("Left", "Right")
    elif "Right" in name:
        return name.replace("Right", "Left")
    return name


# ─────────────────────────────────────────────────────────────────────────────
# OPERATOR: Retarget
# ─────────────────────────────────────────────────────────────────────────────

class ISHAARA_OT_Retarget(bpy.types.Operator):
    bl_idname = "ishaara.retarget"
    bl_label = "Run Retarget"
    bl_description = "Copy animation from source rig to target rig and bake"

    def execute(self, context):
        props = context.scene.ishaara_props
        source = bpy.data.objects.get(props.source_armature)
        target = bpy.data.objects.get(props.target_armature)

        if not source or not target:
            self.report({'ERROR'}, "Could not find one or both armatures. Check the names.")
            return {'CANCELLED'}

        context.view_layer.objects.active = target
        bpy.ops.object.mode_set(mode='POSE')

        constrained = 0
        for bone in target.pose.bones:
            src_bone_name = bone.name.replace("mixamorig2", "mixamorig")
            if src_bone_name in source.pose.bones:
                c = bone.constraints.new('COPY_ROTATION')
                c.name = "RETARGET_ROT"
                c.target = source
                c.subtarget = src_bone_name
                c.mix_mode = 'REPLACE'
                c.owner_space = 'LOCAL'
                c.target_space = 'LOCAL'

                if "Hips" in bone.name:
                    cl = bone.constraints.new('COPY_LOCATION')
                    cl.name = "RETARGET_LOC"
                    cl.target = source
                    cl.subtarget = src_bone_name
                    cl.owner_space = 'LOCAL'
                    cl.target_space = 'LOCAL'

                constrained += 1

        src_action = source.animation_data.action if source.animation_data else None
        frame_start = int(src_action.frame_range[0]) if src_action else context.scene.frame_start
        frame_end = int(src_action.frame_range[1]) if src_action else context.scene.frame_end

        bpy.ops.nla.bake(
            frame_start=frame_start,
            frame_end=frame_end,
            only_selected=False,
            visual_keying=True,
            clear_constraints=True,
            clear_parents=False,
            use_current_action=False,
            bake_types={'POSE'}
        )

        if target.animation_data and target.animation_data.action:
            target.animation_data.action.name = props.baked_action_name

        bpy.ops.object.mode_set(mode='OBJECT')

        # Delete source model and its meshes
        bpy.ops.object.select_all(action='DESELECT')
        for obj in [source] + list(source.children):
            obj.select_set(True)
        bpy.ops.object.delete()
        bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)

        self.report({'INFO'}, f"Retargeted {constrained} bones. Action: '{props.baked_action_name}'")
        return {'FINISHED'}


# ─────────────────────────────────────────────────────────────────────────────
# OPERATOR: Apply Pose JSON over Frame Range
# ─────────────────────────────────────────────────────────────────────────────

class ISHAARA_OT_ApplyPoseJSON(bpy.types.Operator):
    bl_idname = "ishaara.apply_pose_json"
    bl_label = "Apply Pose over Range"
    bl_description = "Smoothly interpolate bone rotations from a JSON file over the given frame range"

    def execute(self, context):
        props = context.scene.ishaara_props
        obj = context.active_object

        if not obj or obj.type != 'ARMATURE' or context.mode != 'POSE':
            self.report({'ERROR'}, "Select an Armature and enter Pose Mode first.")
            return {'CANCELLED'}

        filepath = bpy.path.abspath(props.pose_json_path)
        if not os.path.exists(filepath):
            self.report({'ERROR'}, f"JSON file not found: {filepath}")
            return {'CANCELLED'}

        start = props.pose_start_frame
        end = props.pose_end_frame
        if end <= start:
            self.report({'ERROR'}, "End Frame must be greater than Start Frame.")
            return {'CANCELLED'}

        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        pose_bones = obj.pose.bones
        total_steps = end - start
        start_rotations = {}
        target_rotations = {}

        context.scene.frame_set(start)
        context.view_layer.update()

        for saved_name, rot_data in data["bones"].items():
            bone_name = mirror_bone_name(saved_name) if props.pose_mirror else saved_name
            if bone_name in pose_bones:
                start_rotations[bone_name] = pose_bones[bone_name].rotation_quaternion.copy()
                q = rot_data["quaternion"]
                tq = mathutils.Quaternion((q["w"], q["x"], q["y"], q["z"]))
                if props.pose_mirror:
                    tq.x = -tq.x
                    tq.w = -tq.w
                target_rotations[bone_name] = tq

        total_keys = 0
        for frame in range(start, end + 1):
            context.scene.frame_set(frame)
            factor = (frame - start) / total_steps
            for bone_name, tq in target_rotations.items():
                bone = pose_bones[bone_name]
                sq = start_rotations[bone_name]
                bone.rotation_quaternion = sq.slerp(tq, factor)
                bone.keyframe_insert(data_path="rotation_quaternion", frame=frame)
                total_keys += 1

        context.scene.frame_set(start)
        context.view_layer.update()
        self.report({'INFO'}, f"Applied pose JSON: {total_keys} keyframes inserted ({start}→{end})")
        return {'FINISHED'}


# ─────────────────────────────────────────────────────────────────────────────
# OPERATOR: Collect Selected Bone Rotations
# ─────────────────────────────────────────────────────────────────────────────

class ISHAARA_OT_CollectBones(bpy.types.Operator):
    bl_idname = "ishaara.collect_bones"
    bl_label = "Save Selected Bone Rotations"
    bl_description = "Export selected pose bone rotations to a JSON file"

    def execute(self, context):
        props = context.scene.ishaara_props
        obj = context.active_object

        if not obj or obj.type != 'ARMATURE' or context.mode != 'POSE':
            self.report({'ERROR'}, "Select an Armature and enter Pose Mode first.")
            return {'CANCELLED'}

        selected = context.selected_pose_bones
        if not selected:
            self.report({'ERROR'}, "No bones selected.")
            return {'CANCELLED'}

        out_dir = bpy.path.abspath(props.collect_dir)
        if not out_dir:
            self.report({'ERROR'}, "Set an output directory first.")
            return {'CANCELLED'}

        os.makedirs(out_dir, exist_ok=True)

        data = {
            "armature_name": obj.name,
            "current_frame": context.scene.frame_current,
            "bones": {}
        }

        for bone in selected:
            quat = bone.rotation_quaternion
            euler = quat.to_euler('XYZ')
            euler_deg = [math.degrees(a) for a in euler]
            data["bones"][bone.name] = {
                "quaternion": {"w": quat.w, "x": quat.x, "y": quat.y, "z": quat.z},
                "euler_degrees": {"x": euler_deg[0], "y": euler_deg[1], "z": euler_deg[2]}
            }

        filepath = os.path.join(out_dir, props.collect_filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)

        self.report({'INFO'}, f"Saved {len(selected)} bones to: {filepath}")
        return {'FINISHED'}


# ─────────────────────────────────────────────────────────────────────────────
# OPERATOR: Export FBX
# ─────────────────────────────────────────────────────────────────────────────

class ISHAARA_OT_ExportFBX(bpy.types.Operator):
    bl_idname = "ishaara.export_fbx"
    bl_label = "Export FBX"
    bl_description = "Export selected object(s) as FBX, trimmed to the given frame range (remapped to start at 0)"

    def execute(self, context):
        props = context.scene.ishaara_props
        out_dir = bpy.path.abspath(props.export_dir)

        if not out_dir:
            self.report({'ERROR'}, "Set an output directory first.")
            return {'CANCELLED'}

        os.makedirs(out_dir, exist_ok=True)
        filepath = os.path.join(out_dir, props.export_filename)

        start = props.export_start_frame
        end = props.export_end_frame
        if end <= start:
            self.report({'ERROR'}, "End Frame must be greater than Start Frame.")
            return {'CANCELLED'}

        duration = end - start
        orig_start = context.scene.frame_start
        orig_end = context.scene.frame_end
        context.scene.frame_start = 0
        context.scene.frame_end = duration

        obj = context.active_object
        action = obj.animation_data.action if (obj and obj.animation_data) else None
        if action:
            shift_keyframes(action, -start)

        obj_types = {'ARMATURE'} if props.export_rig_only else {'ARMATURE', 'MESH'}

        try:
            bpy.ops.export_scene.fbx(
                filepath=filepath,
                check_existing=False,
                use_selection=True,
                object_types=obj_types,
                global_scale=1.0,
                apply_unit_scale=True,
                bake_space_transform=False,
                axis_forward='-Z',
                axis_up='Y',
                mesh_smooth_type='OFF',
                use_mesh_modifiers=True,
                use_armature_deform_only=True,
                add_leaf_bones=False,
                bake_anim=True,
                bake_anim_step=1.0,
                bake_anim_simplify_factor=0.0,
                bake_anim_use_all_actions=False,
                bake_anim_use_nla_strips=False,
            )
            self.report({'INFO'}, f"Exported to: {filepath}  (frames {start}–{end} → 0–{duration})")
        except Exception as e:
            self.report({'ERROR'}, str(e))
        finally:
            context.scene.frame_start = orig_start
            context.scene.frame_end = orig_end
            if action:
                shift_keyframes(action, +start)

        return {'FINISHED'}


# ─────────────────────────────────────────────────────────────────────────────
# OPERATOR: Copy Rotation Constraint (finger chains — selected bones)
# ─────────────────────────────────────────────────────────────────────────────

class ISHAARA_OT_CopyRotConstraint(bpy.types.Operator):
    bl_idname = "ishaara.copy_rot_constraint"
    bl_label = "Add Copy Rotation (Finger Chain)"
    bl_description = "Link selected finger bones sequentially with Copy Rotation constraints (Local X only)"

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'ARMATURE' or context.mode != 'POSE':
            self.report({'ERROR'}, "Select an Armature and enter Pose Mode first.")
            return {'CANCELLED'}

        selected = context.selected_pose_bones
        if len(selected) < 2:
            self.report({'ERROR'}, "Select at least two bones.")
            return {'CANCELLED'}

        finger_keywords = ["Thumb", "Index", "Middle", "Ring", "Pinky"]
        finger_groups = {}

        for bone in selected:
            for kw in finger_keywords:
                if kw in bone.name:
                    prefix = bone.name.split(kw)[0] + kw
                    finger_groups.setdefault(prefix, []).append(bone)
                    break

        if not finger_groups:
            # Fallback: treat selection as one chain in order
            finger_groups = {"selection": list(selected)}

        count = 0
        for prefix, bones in finger_groups.items():
            bones.sort(key=lambda b: b.name)
            for i in range(len(bones) - 1):
                driver_bone = bones[i]
                driven_bone = bones[i + 1]
                cname = f"Copy_Rot_{driver_bone.name}"
                if cname in driven_bone.constraints:
                    continue
                c = driven_bone.constraints.new('COPY_ROTATION')
                c.name = cname
                c.target = obj
                c.subtarget = driver_bone.name
                c.use_x = True
                c.use_y = False
                c.use_z = False
                c.target_space = 'LOCAL'
                c.owner_space = 'LOCAL'
                count += 1

        self.report({'INFO'}, f"Added {count} Copy Rotation constraints across {len(finger_groups)} finger chain(s)")
        return {'FINISHED'}


# ─────────────────────────────────────────────────────────────────────────────
# OPERATOR: Add Knuckle Drivers
# ─────────────────────────────────────────────────────────────────────────────

class ISHAARA_OT_AddKnuckleDrivers(bpy.types.Operator):
    bl_idname = "ishaara.add_knuckle_drivers"
    bl_label = "Add Knuckle Drivers"
    bl_description = "Add location drivers to knuckle bones driven by the next joint's rotation"

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'ARMATURE' or context.mode != 'POSE':
            self.report({'ERROR'}, "Select an Armature and enter Pose Mode first.")
            return {'CANCELLED'}

        selected = context.selected_pose_bones
        if not selected:
            self.report({'ERROR'}, "No bones selected.")
            return {'CANCELLED'}

        finger_keywords = ["Index", "Middle", "Ring", "Pinky"]
        finger_groups = {}

        for bone in selected:
            for kw in finger_keywords:
                if kw in bone.name:
                    prefix = bone.name.split(kw)[0] + kw
                    finger_groups.setdefault(prefix, []).append(bone)
                    break

        count = 0
        for prefix, bones in finger_groups.items():
            bones.sort(key=lambda b: b.name)
            if len(bones) < 2:
                continue
            knuckle = bones[0]
            trigger = bones[1]

            drv_x = knuckle.driver_add("location", 0).driver
            drv_x.type = 'SCRIPTED'
            drv_x.expression = "-var * 0.006"
            vx = drv_x.variables.new()
            vx.name = "var"
            vx.type = 'TRANSFORMS'
            vx.targets[0].id = obj
            vx.targets[0].bone_target = trigger.name
            vx.targets[0].transform_type = 'ROT_X'
            vx.targets[0].transform_space = 'LOCAL_SPACE'

            drv_z = knuckle.driver_add("location", 2).driver
            drv_z.type = 'SCRIPTED'
            drv_z.expression = "var * 0.007"
            vz = drv_z.variables.new()
            vz.name = "var"
            vz.type = 'TRANSFORMS'
            vz.targets[0].id = obj
            vz.targets[0].bone_target = trigger.name
            vz.targets[0].transform_type = 'ROT_X'
            vz.targets[0].transform_space = 'LOCAL_SPACE'

            knuckle.bone.id_data.update_tag()
            count += 1

        self.report({'INFO'}, f"Added knuckle drivers for {count} finger(s)")
        return {'FINISHED'}


# ─────────────────────────────────────────────────────────────────────────────
# OPERATOR: Remove Copy Rotation Constraints & Reset
# ─────────────────────────────────────────────────────────────────────────────

class ISHAARA_OT_RemoveConstraints(bpy.types.Operator):
    bl_idname = "ishaara.remove_constraints"
    bl_label = "Remove Constraints & Reset"
    bl_description = "Remove all Copy Rotation constraints from selected bones and reset their rotation"

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'ARMATURE' or context.mode != 'POSE':
            self.report({'ERROR'}, "Select an Armature and enter Pose Mode first.")
            return {'CANCELLED'}

        selected = context.selected_pose_bones
        if not selected:
            self.report({'ERROR'}, "No bones selected.")
            return {'CANCELLED'}

        count = 0
        for bone in selected:
            for c in reversed(bone.constraints):
                if c.type == 'COPY_ROTATION':
                    bone.constraints.remove(c)
                    count += 1
            if bone.rotation_mode in ['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX']:
                bone.rotation_euler.x = 0.0
            else:
                bone.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)

        self.report({'INFO'}, f"Removed {count} constraints and reset {len(selected)} bone(s)")
        return {'FINISHED'}


# ─────────────────────────────────────────────────────────────────────────────
# PANELS
# ─────────────────────────────────────────────────────────────────────────────

class ISHAARA_PT_MainPanel(bpy.types.Panel):
    bl_label = "Ishaara Tools"
    bl_idname = "ISHAARA_PT_MainPanel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Ishaara"

    def draw(self, context):
        pass


class ISHAARA_PT_Retarget(bpy.types.Panel):
    bl_label = "Retarget Animation"
    bl_idname = "ISHAARA_PT_Retarget"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Ishaara"
    bl_parent_id = "ISHAARA_PT_MainPanel"

    def draw(self, context):
        layout = self.layout
        props = context.scene.ishaara_props

        col = layout.column(align=True)
        col.label(text="Source (animation FBX):")
        col.prop_search(props, "source_armature", bpy.data, "objects", text="")
        col.separator()
        col.label(text="Target (your model):")
        col.prop_search(props, "target_armature", bpy.data, "objects", text="")
        col.separator()
        col.prop(props, "baked_action_name")
        col.separator()
        col.operator("ishaara.retarget", icon='ARMATURE_DATA')


class ISHAARA_PT_PoseJSON(bpy.types.Panel):
    bl_label = "Apply Pose from JSON"
    bl_idname = "ISHAARA_PT_PoseJSON"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Ishaara"
    bl_parent_id = "ISHAARA_PT_MainPanel"

    def draw(self, context):
        layout = self.layout
        props = context.scene.ishaara_props

        col = layout.column(align=True)
        col.prop(props, "pose_json_path")
        col.separator()

        row = col.row(align=True)
        row.prop(props, "pose_start_frame")
        row.prop(props, "pose_end_frame")

        col.prop(props, "pose_mirror")
        col.separator()
        col.label(text="Select armature + enter Pose Mode first", icon='INFO')
        col.operator("ishaara.apply_pose_json", icon='POSE_HLT')


class ISHAARA_PT_CollectBones(bpy.types.Panel):
    bl_label = "Collect Bone Rotations"
    bl_idname = "ISHAARA_PT_CollectBones"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Ishaara"
    bl_parent_id = "ISHAARA_PT_MainPanel"

    def draw(self, context):
        layout = self.layout
        props = context.scene.ishaara_props

        col = layout.column(align=True)
        col.prop(props, "collect_dir")
        col.prop(props, "collect_filename")
        col.separator()
        col.label(text="Select bones in Pose Mode, then save", icon='INFO')
        col.operator("ishaara.collect_bones", icon='EXPORT')


class ISHAARA_PT_ExportFBX(bpy.types.Panel):
    bl_label = "Export FBX"
    bl_idname = "ISHAARA_PT_ExportFBX"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Ishaara"
    bl_parent_id = "ISHAARA_PT_MainPanel"

    def draw(self, context):
        layout = self.layout
        props = context.scene.ishaara_props

        col = layout.column(align=True)
        col.prop(props, "export_dir")
        col.prop(props, "export_filename")
        col.separator()

        row = col.row(align=True)
        row.prop(props, "export_start_frame")
        row.prop(props, "export_end_frame")

        col.prop(props, "export_rig_only")
        col.separator()
        col.label(text="Select armature (+ mesh if needed)", icon='INFO')
        col.operator("ishaara.export_fbx", icon='EXPORT')


class ISHAARA_PT_FingerTools(bpy.types.Panel):
    bl_label = "Finger / Hand Tools"
    bl_idname = "ISHAARA_PT_FingerTools"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Ishaara"
    bl_parent_id = "ISHAARA_PT_MainPanel"

    def draw(self, context):
        layout = self.layout
        col = layout.column(align=True)
        col.label(text="Select finger bones in Pose Mode:", icon='INFO')
        col.separator()
        col.operator("ishaara.copy_rot_constraint", icon='CONSTRAINT_BONE')
        col.operator("ishaara.add_knuckle_drivers", icon='DRIVER')
        col.separator()
        col.operator("ishaara.remove_constraints", icon='X')


# ─────────────────────────────────────────────────────────────────────────────
# REGISTER
# ─────────────────────────────────────────────────────────────────────────────

CLASSES = [
    IsharaProps,
    ISHAARA_OT_Retarget,
    ISHAARA_OT_ApplyPoseJSON,
    ISHAARA_OT_CollectBones,
    ISHAARA_OT_ExportFBX,
    ISHAARA_OT_CopyRotConstraint,
    ISHAARA_OT_AddKnuckleDrivers,
    ISHAARA_OT_RemoveConstraints,
    ISHAARA_PT_MainPanel,
    ISHAARA_PT_Retarget,
    ISHAARA_PT_PoseJSON,
    ISHAARA_PT_CollectBones,
    ISHAARA_PT_ExportFBX,
    ISHAARA_PT_FingerTools,
]


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)
    bpy.types.Scene.ishaara_props = bpy.props.PointerProperty(type=IsharaProps)


def unregister():
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
    del bpy.types.Scene.ishaara_props
