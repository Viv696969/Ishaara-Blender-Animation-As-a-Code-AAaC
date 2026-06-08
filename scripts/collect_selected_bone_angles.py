import bpy
import json
import os
import math

# --- CONFIGURATION ---
# Define the output directory and filename
output_dir = r"D:\blender_json_data"
filename = "mixamo_bone_rotations.json"
# ---------------------

def get_selected_bone_rotations():
    # Ensure the active object is an armature and we are in Pose Mode
    obj = bpy.context.active_object
    
    if not obj or obj.type != 'ARMATURE':
        print("Error: Please select a Mixamo Armature object.")
        return None
        
    if bpy.context.mode != 'POSE':
        print("Error: Please switch to POSE MODE to select bones.")
        return None

    selected_bones = bpy.context.selected_pose_bones
    
    if not selected_bones:
        print("Error: No bones selected. Please select at least one bone in Pose Mode.")
        return None

    data = {
        "armature_name": obj.name,
        "current_frame": bpy.context.scene.frame_current,
        "bones": {}
    }

    for bone in selected_bones:
        # Get local rotation matrix relative to parent bone
        # Mixamo rigs use Quaternions by default
        quat = bone.rotation_quaternion
        
        # Convert to Euler angles (in degrees) for easier human readability
        euler = quat.to_euler('XYZ')
        euler_deg = [math.degrees(angle) for angle in euler]
        
        data["bones"][bone.name] = {
            "quaternion": {
                "w": quat.w,
                "x": quat.x,
                "y": quat.y,
                "z": quat.z
            },
            "euler_degrees": {
                "x": euler_deg[0],
                "y": euler_deg[1],
                "z": euler_deg[2]
            }
        }
        
    return data

def save_to_json(data):
    # Create the directory if it doesn't exist
    if not os.path.exists(output_dir):
        try:
            os.makedirs(output_dir)
        except Exception as e:
            print(f"Error creating directory {output_dir}: {e}")
            return

    filepath = os.path.join(output_dir, filename)
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        print(f"Successfully exported bone data to: {filepath}")
    except Exception as e:
        print(f"Failed to write JSON file: {e}")

# Run the extraction and export
bone_data = get_selected_bone_rotations()
if bone_data:
    save_to_json(bone_data)