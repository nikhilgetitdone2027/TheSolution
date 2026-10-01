"""
Generates a culturally resonant, rigged 3D human avatar bust for Saathi
with ARKit-compatible viseme blendshapes/morph targets and bone hierarchy.
Outputs: frontend/public/models/saathi.glb
"""
import json
import struct
import math
import numpy as np
from pathlib import Path

OUTPUT_DIR = Path("frontend/public/models")
OUTPUT_FILE = OUTPUT_DIR / "saathi.glb"

def build_avatar():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    bin_data = bytearray()
    buffer_views = []
    accessors = []
    
    def add_buffer_data(data_bytes, target=None):
        offset = len(bin_data)
        bin_data.extend(data_bytes)
        # Pad to 4-byte boundary
        pad = (4 - (len(bin_data) % 4)) % 4
        bin_data.extend(b"\x00" * pad)
        view_idx = len(buffer_views)
        view = {
            "buffer": 0,
            "byteOffset": offset,
            "byteLength": len(data_bytes)
        }
        if target:
            view["target"] = target
        buffer_views.append(view)
        return view_idx

    def add_accessor(view_idx, comp_type, count, acc_type, min_val=None, max_val=None):
        acc_idx = len(accessors)
        acc = {
            "bufferView": view_idx,
            "byteOffset": 0,
            "componentType": comp_type,
            "count": count,
            "type": acc_type
        }
        if min_val is not None:
            acc["min"] = min_val
        if max_val is not None:
            acc["max"] = max_val
        accessors.append(acc)
        return acc_idx

    # -------------------------------------------------------------
    # 1. HEAD MESH WITH ARKIT VISEME MORPH TARGETS
    # -------------------------------------------------------------
    lat_bands = 28
    long_bands = 36
    head_pos = []
    head_norm = []
    head_uv = []
    
    for i in range(lat_bands + 1):
        theta = i * math.pi / lat_bands
        sin_t = math.sin(theta)
        cos_t = math.cos(theta)
        for j in range(long_bands + 1):
            phi = j * 2 * math.pi / long_bands
            sin_p = math.sin(phi)
            cos_p = math.cos(phi)
            
            x = cos_p * sin_t
            y = cos_t
            z = sin_p * sin_t
            
            # Sculpt into human face/head proportions
            if y < 0: # lower jaw and chin
                x *= (1.0 + 0.18 * y)
                z *= (1.0 + 0.12 * y)
                z += 0.14 * (-y) # chin protrusion
            if y > 0.2: # forehead
                x *= 1.04
                z *= 1.02
            # Nose bridge subtle ridge
            if z > 0.5 and abs(x) < 0.18 and -0.1 < y < 0.2:
                z += (0.18 - abs(x)) * 0.4 * (1.0 - abs(y) / 0.2)
            
            y *= 1.25
            scale = 0.38
            px = x * scale * 0.72
            py = y * scale * 0.88 + 0.38
            pz = z * scale * 0.76
            
            head_pos.append([px, py, pz])
            nx = px
            ny = py - 0.38
            nz = pz
            mag = math.sqrt(nx*nx + ny*ny + nz*nz) or 1.0
            head_norm.append([nx/mag, ny/mag, nz/mag])
            head_uv.append([j / long_bands, i / lat_bands])

    head_indices = []
    for i in range(lat_bands):
        for j in range(long_bands):
            p1 = i * (long_bands + 1) + j
            p2 = p1 + long_bands + 1
            head_indices.extend([p1, p2, p1 + 1])
            head_indices.extend([p2, p2 + 1, p1 + 1])

    # Morph Targets definition for Head (displacements)
    # Target 0: viseme_aa (open jaw wide)
    # Target 1: viseme_E (lips pull wide and smile)
    # Target 2: viseme_I (lips open slightly, corners back)
    # Target 3: viseme_O (lips round forward)
    # Target 4: viseme_U (lips tight circle forward)
    # Target 5: viseme_PP (lips pressed tight)
    # Target 6: viseme_SS (teeth together, smile)
    # Target 7: eyeBlinkLeft (left eyelid closes down)
    # Target 8: eyeBlinkRight (right eyelid closes down)
    targets_disp = {
        "viseme_aa": [],
        "viseme_E": [],
        "viseme_I": [],
        "viseme_O": [],
        "viseme_U": [],
        "viseme_PP": [],
        "viseme_SS": [],
        "eyeBlinkLeft": [],
        "eyeBlinkRight": []
    }
    
    for px, py, pz in head_pos:
        # Mouth region: py in [0.24, 0.34], pz > 0.12, abs(px) < 0.10
        in_mouth = (0.24 <= py <= 0.35) and (pz > 0.12) and (abs(px) < 0.12)
        mouth_factor = 1.0 - (abs(px) / 0.12) if in_mouth else 0.0
        
        # Left eye: px < -0.02, py in [0.42, 0.52], pz > 0.12
        in_left_eye = (px < -0.02) and (abs(px + 0.06) < 0.05) and (0.42 <= py <= 0.52) and (pz > 0.12)
        # Right eye: px > 0.02, py in [0.42, 0.52], pz > 0.12
        in_right_eye = (px > 0.02) and (abs(px - 0.06) < 0.05) and (0.42 <= py <= 0.52) and (pz > 0.12)
        
        # viseme_aa: jaw down
        if in_mouth:
            targets_disp["viseme_aa"].append([0.0, -0.055 * mouth_factor, 0.015 * mouth_factor])
        else:
            targets_disp["viseme_aa"].append([0.0, 0.0, 0.0])
            
        # viseme_E: corners outward and slightly up
        if in_mouth:
            sign = 1.0 if px >= 0 else -1.0
            targets_disp["viseme_E"].append([sign * 0.025 * mouth_factor, 0.015 * mouth_factor, -0.005 * mouth_factor])
        else:
            targets_disp["viseme_E"].append([0.0, 0.0, 0.0])
            
        # viseme_I: teeth open slightly, corners wide
        if in_mouth:
            sign = 1.0 if px >= 0 else -1.0
            targets_disp["viseme_I"].append([sign * 0.02 * mouth_factor, -0.012 * mouth_factor, -0.005 * mouth_factor])
        else:
            targets_disp["viseme_I"].append([0.0, 0.0, 0.0])
            
        # viseme_O: lips round forward
        if in_mouth:
            targets_disp["viseme_O"].append([-0.3 * px * mouth_factor, -0.02 * mouth_factor, 0.035 * mouth_factor])
        else:
            targets_disp["viseme_O"].append([0.0, 0.0, 0.0])
            
        # viseme_U: tight round forward
        if in_mouth:
            targets_disp["viseme_U"].append([-0.5 * px * mouth_factor, -0.015 * mouth_factor, 0.045 * mouth_factor])
        else:
            targets_disp["viseme_U"].append([0.0, 0.0, 0.0])
            
        # viseme_PP: compress lips
        if in_mouth:
            targets_disp["viseme_PP"].append([0.0, 0.01 * (1.0 if py < 0.29 else -1.0) * mouth_factor, -0.01 * mouth_factor])
        else:
            targets_disp["viseme_PP"].append([0.0, 0.0, 0.0])
            
        # viseme_SS: teeth closed, slight smile
        if in_mouth:
            sign = 1.0 if px >= 0 else -1.0
            targets_disp["viseme_SS"].append([sign * 0.015 * mouth_factor, -0.005 * mouth_factor, 0.0])
        else:
            targets_disp["viseme_SS"].append([0.0, 0.0, 0.0])
            
        # eyeBlinkLeft
        if in_left_eye and py >= 0.46:
            targets_disp["eyeBlinkLeft"].append([0.0, -0.032, 0.005])
        else:
            targets_disp["eyeBlinkLeft"].append([0.0, 0.0, 0.0])
            
        # eyeBlinkRight
        if in_right_eye and py >= 0.46:
            targets_disp["eyeBlinkRight"].append([0.0, -0.032, 0.005])
        else:
            targets_disp["eyeBlinkRight"].append([0.0, 0.0, 0.0])

    # Convert head mesh to binary
    head_pos_np = np.array(head_pos, dtype=np.float32)
    head_norm_np = np.array(head_norm, dtype=np.float32)
    head_uv_np = np.array(head_uv, dtype=np.float32)
    head_ind_np = np.array(head_indices, dtype=np.uint16)

    head_pos_acc = add_accessor(add_buffer_data(head_pos_np.tobytes(), 34962), 5126, len(head_pos), "VEC3",
                                head_pos_np.min(axis=0).tolist(), head_pos_np.max(axis=0).tolist())
    head_norm_acc = add_accessor(add_buffer_data(head_norm_np.tobytes(), 34962), 5126, len(head_norm), "VEC3",
                                 head_norm_np.min(axis=0).tolist(), head_norm_np.max(axis=0).tolist())
    head_uv_acc = add_accessor(add_buffer_data(head_uv_np.tobytes(), 34962), 5126, len(head_uv), "VEC2")
    head_ind_acc = add_accessor(add_buffer_data(head_ind_np.tobytes(), 34963), 5123, len(head_indices), "SCALAR")

    # Add morph target accessors
    target_names = list(targets_disp.keys())
    target_accessors = []
    for name in target_names:
        disp_np = np.array(targets_disp[name], dtype=np.float32)
        acc_idx = add_accessor(add_buffer_data(disp_np.tobytes(), 34962), 5126, len(disp_np), "VEC3",
                               disp_np.min(axis=0).tolist(), disp_np.max(axis=0).tolist())
        target_accessors.append({"POSITION": acc_idx})

    # -------------------------------------------------------------
    # 2. TORSO / BUST MESH (Professional Nehru / Blazer Collar)
    # -------------------------------------------------------------
    bust_pos = []
    bust_norm = []
    bust_uv = []
    bust_indices = []
    
    # Collar/Shoulder trapezoid cylinder
    rings = 16
    segments = 32
    for r in range(rings + 1):
        v = r / rings
        cy = 0.28 - v * 0.65 # from neck down to chest
        # width expands downwards
        rx = 0.12 + v * 0.40
        rz = 0.10 + v * 0.22
        for s in range(segments + 1):
            u = s / segments
            ang = u * 2 * math.pi
            cx = math.cos(ang) * rx
            cz = math.sin(ang) * rz
            bust_pos.append([cx, cy, cz])
            bust_norm.append([math.cos(ang), 0.2, math.sin(ang)])
            bust_uv.append([u, v])
            
    for r in range(rings):
        for s in range(segments):
            p1 = r * (segments + 1) + s
            p2 = p1 + segments + 1
            bust_indices.extend([p1, p2, p1 + 1])
            bust_indices.extend([p2, p2 + 1, p1 + 1])

    bust_pos_np = np.array(bust_pos, dtype=np.float32)
    bust_norm_np = np.array(bust_norm, dtype=np.float32)
    bust_uv_np = np.array(bust_uv, dtype=np.float32)
    bust_ind_np = np.array(bust_indices, dtype=np.uint16)

    bust_pos_acc = add_accessor(add_buffer_data(bust_pos_np.tobytes(), 34962), 5126, len(bust_pos), "VEC3",
                                bust_pos_np.min(axis=0).tolist(), bust_pos_np.max(axis=0).tolist())
    bust_norm_acc = add_accessor(add_buffer_data(bust_norm_np.tobytes(), 34962), 5126, len(bust_norm), "VEC3")
    bust_uv_acc = add_accessor(add_buffer_data(bust_uv_np.tobytes(), 34962), 5126, len(bust_uv), "VEC2")
    bust_ind_acc = add_accessor(add_buffer_data(bust_ind_np.tobytes(), 34963), 5123, len(bust_indices), "SCALAR")

    # -------------------------------------------------------------
    # 3. HAIR MESH (Stylized Professional Haircut)
    # -------------------------------------------------------------
    hair_pos = []
    hair_norm = []
    hair_uv = []
    hair_indices = []
    
    hair_lat = 18
    hair_long = 24
    for i in range(hair_lat + 1):
        theta = i * (math.pi * 0.55) / hair_lat # only covers upper 55% of head
        sin_t = math.sin(theta)
        cos_t = math.cos(theta)
        for j in range(hair_long + 1):
            phi = j * 2 * math.pi / hair_long
            sin_p = math.sin(phi)
            cos_p = math.cos(phi)
            
            # Hair volume sits slightly outside head
            hx = cos_p * sin_t * 0.285
            hy = cos_t * 0.32 + 0.40
            hz = sin_p * sin_t * 0.295
            
            # Styled puff on top
            if hy > 0.50:
                hy += 0.035 * (1.0 - abs(hx)/0.25)
                hz += 0.02
                
            hair_pos.append([hx, hy, hz])
            hair_norm.append([hx, hy - 0.4, hz])
            hair_uv.append([j / hair_long, i / hair_lat])
            
    for i in range(hair_lat):
        for j in range(hair_long):
            p1 = i * (hair_long + 1) + j
            p2 = p1 + hair_long + 1
            hair_indices.extend([p1, p2, p1 + 1])
            hair_indices.extend([p2, p2 + 1, p1 + 1])

    hair_pos_np = np.array(hair_pos, dtype=np.float32)
    hair_norm_np = np.array(hair_norm, dtype=np.float32)
    hair_uv_np = np.array(hair_uv, dtype=np.float32)
    hair_ind_np = np.array(hair_indices, dtype=np.uint16)

    hair_pos_acc = add_accessor(add_buffer_data(hair_pos_np.tobytes(), 34962), 5126, len(hair_pos), "VEC3",
                                hair_pos_np.min(axis=0).tolist(), hair_pos_np.max(axis=0).tolist())
    hair_norm_acc = add_accessor(add_buffer_data(hair_norm_np.tobytes(), 34962), 5126, len(hair_norm), "VEC3")
    hair_uv_acc = add_accessor(add_buffer_data(hair_uv_np.tobytes(), 34962), 5126, len(hair_uv), "VEC2")
    hair_ind_acc = add_accessor(add_buffer_data(hair_ind_np.tobytes(), 34963), 5123, len(hair_indices), "SCALAR")

    # -------------------------------------------------------------
    # 4. MATERIALS (PBR Metallic Roughness)
    # -------------------------------------------------------------
    materials = [
        {
            "name": "Skin_Material",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.82, 0.65, 0.52, 1.0], # Warm natural Indian skin tone
                "roughnessFactor": 0.65,
                "metallicFactor": 0.05
            }
        },
        {
            "name": "Jacket_Material",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.08, 0.28, 0.28, 1.0], # Sustainable Emerald/Teal blazer
                "roughnessFactor": 0.70,
                "metallicFactor": 0.15
            }
        },
        {
            "name": "Hair_Material",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.10, 0.07, 0.05, 1.0], # Natural deep brown / black hair
                "roughnessFactor": 0.85,
                "metallicFactor": 0.05
            }
        }
    ]

    # -------------------------------------------------------------
    # 5. MESHES WITH TARGET NAMES
    # -------------------------------------------------------------
    meshes = [
        {
            "name": "HeadMesh",
            "primitives": [
                {
                    "attributes": {
                        "POSITION": head_pos_acc,
                        "NORMAL": head_norm_acc,
                        "TEXCOORD_0": head_uv_acc
                    },
                    "indices": head_ind_acc,
                    "material": 0,
                    "targets": target_accessors
                }
            ],
            "weights": [0.0] * len(target_names),
            "extras": {
                "targetNames": target_names
            }
        },
        {
            "name": "BustMesh",
            "primitives": [
                {
                    "attributes": {
                        "POSITION": bust_pos_acc,
                        "NORMAL": bust_norm_acc,
                        "TEXCOORD_0": bust_uv_acc
                    },
                    "indices": bust_ind_acc,
                    "material": 1
                }
            ]
        },
        {
            "name": "HairMesh",
            "primitives": [
                {
                    "attributes": {
                        "POSITION": hair_pos_acc,
                        "NORMAL": hair_norm_acc,
                        "TEXCOORD_0": hair_uv_acc
                    },
                    "indices": hair_ind_acc,
                    "material": 2
                }
            ]
        }
    ]

    # -------------------------------------------------------------
    # 6. NODE HIERARCHY / ARMATURE
    # -------------------------------------------------------------
    # Node 0: Root
    # Node 1: Spine (chest/torso rotation for breathing)
    # Node 2: Neck
    # Node 3: Head (mesh 0 + hair mesh 2)
    # Node 4: Torso (mesh 1)
    nodes = [
        {
            "name": "Saathi_Root",
            "children": [1, 4]
        },
        {
            "name": "Spine",
            "translation": [0.0, 0.0, 0.0],
            "children": [2]
        },
        {
            "name": "Neck",
            "translation": [0.0, 0.22, 0.0],
            "children": [3]
        },
        {
            "name": "Head",
            "translation": [0.0, 0.12, 0.0],
            "mesh": 0,
            "children": [5]
        },
        {
            "name": "TorsoBust",
            "mesh": 1
        },
        {
            "name": "Hair",
            "mesh": 2
        }
    ]

    gltf_json = {
        "asset": {
            "version": "2.0",
            "generator": "CHEM2ENERGY 3D Avatar Pipeline"
        },
        "scene": 0,
        "scenes": [
            {
                "name": "SaathiScene",
                "nodes": [0]
            }
        ],
        "nodes": nodes,
        "materials": materials,
        "meshes": meshes,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [
            {
                "byteLength": len(bin_data)
            }
        ]
    }

    # Encode JSON chunk
    json_bytes = json.dumps(gltf_json, separators=(",", ":")).encode("utf-8")
    json_pad = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b" " * json_pad

    # Build binary GLB
    # Header: magic (4), version (4), length (4)
    # Chunk 0: length (4), type (4), data
    # Chunk 1: length (4), type (4), data
    total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_data)
    
    header = struct.pack("<4sII", b"glTF", 2, total_length)
    chunk0_header = struct.pack("<II", len(json_bytes), 0x4E4F534A) # JSON
    chunk1_header = struct.pack("<II", len(bin_data), 0x004E4942) # BIN

    glb_bytes = header + chunk0_header + json_bytes + chunk1_header + bin_data
    OUTPUT_FILE.write_bytes(glb_bytes)
    print(f"Generated Saathi GLB at {OUTPUT_FILE} ({len(glb_bytes):,} bytes)")
    print(f"Target Names included: {target_names}")

if __name__ == "__main__":
    build_avatar()
