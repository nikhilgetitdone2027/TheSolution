"""
Injects mouthOpen, jawOpen, viseme_aa, viseme_O, eyeBlinkLeft, eyeBlinkRight morph targets
into the Avaturn mesh in frontend/public/models/saathi.glb.
"""
import json
import struct
import numpy as np
from pathlib import Path

GLB_PATH = Path("frontend/public/models/saathi.glb")

def inject_morphs():
    with open(GLB_PATH, "rb") as f:
        magic, version, length = struct.unpack("<4sII", f.read(12))
        chunk0_len, chunk0_type = struct.unpack("<II", f.read(8))
        data = json.loads(f.read(chunk0_len).decode("utf-8"))
        chunk1_len, chunk1_type = struct.unpack("<II", f.read(8))
        bin_bytes = bytearray(f.read(chunk1_len))

    mesh0 = data["meshes"][0]
    prim0 = mesh0["primitives"][0]
    pos_acc_idx = prim0["attributes"]["POSITION"]
    pos_acc = data["accessors"][pos_acc_idx]
    bv_pos = data["bufferViews"][pos_acc["bufferView"]]
    offset = bv_pos.get("byteOffset", 0) + pos_acc.get("byteOffset", 0)
    count = pos_acc["count"]
    
    positions = np.frombuffer(bin_bytes[offset : offset + count * 12], dtype=np.float32).reshape(-1, 3).copy()

    target_names = [
        "mouthOpen",
        "jawOpen",
        "viseme_aa",
        "viseme_O",
        "eyeBlinkLeft",
        "eyeBlinkRight",
        "eyeBlink"
    ]
    target_disps = {name: np.zeros((count, 3), dtype=np.float32) for name in target_names}

    for i in range(count):
        x, y, z = positions[i]
        
        # Mouth region (lips)
        in_mouth = (1.53 <= y <= 1.595) and (z > 0.01) and (abs(x) < 0.038)
        if in_mouth:
            factor = (1.0 - abs(x) / 0.038) * (1.0 - abs(y - 1.56) / 0.035)
            if y < 1.57:
                target_disps["mouthOpen"][i, 1] = -0.022 * factor
                target_disps["jawOpen"][i, 1] = -0.028 * factor
                target_disps["viseme_aa"][i, 1] = -0.025 * factor
            else:
                target_disps["mouthOpen"][i, 1] = 0.006 * factor
                target_disps["jawOpen"][i, 1] = -0.005 * factor
                target_disps["viseme_aa"][i, 1] = 0.008 * factor
                
            target_disps["viseme_O"][i, 2] = 0.014 * factor
            target_disps["viseme_O"][i, 0] = -0.2 * x * factor

        # Chin / Jaw
        in_chin = (1.50 <= y < 1.54) and (z > -0.02) and (abs(x) < 0.04)
        if in_chin:
            c_factor = (1.0 - abs(x) / 0.04)
            target_disps["jawOpen"][i, 1] = -0.020 * c_factor
            target_disps["viseme_aa"][i, 1] = -0.018 * c_factor

        # Left eye: x in [-0.065, -0.015], y in [1.64, 1.675], z > 0.045
        in_left_eye = (-0.065 <= x <= -0.015) and (1.642 <= y <= 1.675) and (z > 0.048)
        if in_left_eye:
            target_disps["eyeBlinkLeft"][i, 1] = -0.016
            target_disps["eyeBlink"][i, 1] = -0.016
            
        # Right eye: x in [0.015, 0.065], y in [1.64, 1.675], z > 0.045
        in_right_eye = (0.015 <= x <= 0.065) and (1.642 <= y <= 1.675) and (z > 0.048)
        if in_right_eye:
            target_disps["eyeBlinkRight"][i, 1] = -0.016
            target_disps["eyeBlink"][i, 1] = -0.016

    target_accessors = []
    for name in target_names:
        disp_bytes = target_disps[name].tobytes()
        bv_offset = len(bin_bytes)
        bin_bytes.extend(disp_bytes)
        pad = (4 - (len(bin_bytes) % 4)) % 4
        bin_bytes.extend(b"\x00" * pad)

        bv_idx = len(data["bufferViews"])
        data["bufferViews"].append({
            "buffer": 0,
            "byteOffset": bv_offset,
            "byteLength": len(disp_bytes),
            "target": 34962
        })

        acc_idx = len(data["accessors"])
        data["accessors"].append({
            "bufferView": bv_idx,
            "byteOffset": 0,
            "componentType": 5126,
            "count": count,
            "type": "VEC3",
            "min": target_disps[name].min(axis=0).tolist(),
            "max": target_disps[name].max(axis=0).tolist()
        })
        target_accessors.append({"POSITION": acc_idx})

    prim0["targets"] = target_accessors
    mesh0["weights"] = [0.0] * len(target_names)
    mesh0.setdefault("extras", {})["targetNames"] = target_names
    data["buffers"][0]["byteLength"] = len(bin_bytes)

    # Encode JSON
    json_bytes = json.dumps(data, separators=(",", ":")).encode("utf-8")
    json_pad = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b" " * json_pad

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)
    header = struct.pack("<4sII", b"glTF", 2, total_len)
    chunk0_header = struct.pack("<II", len(json_bytes), 0x4E4F534A)
    chunk1_header = struct.pack("<II", len(bin_bytes), 0x004E4942)

    new_glb = header + chunk0_header + json_bytes + chunk1_header + bin_bytes
    GLB_PATH.write_bytes(new_glb)
    print(f"Successfully injected {len(target_names)} morph targets into {GLB_PATH} ({len(new_glb):,} bytes)")

if __name__ == "__main__":
    inject_morphs()
