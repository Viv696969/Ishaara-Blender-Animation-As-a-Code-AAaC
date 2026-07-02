import os
import subprocess
import tempfile

# Extensions to include
EXTENSIONS = (".mp4", ".mov", ".mkv", ".avi", ".m4v")

# Settings
CLIP_DURATION = 6
BATCH_SIZE = 12

# Get all videos alphabetically
videos = sorted([
    f for f in os.listdir(".")
    if f.lower().endswith(EXTENSIONS)
])

print(f"Found {len(videos)} videos")

for batch_num, start in enumerate(range(0, len(videos), BATCH_SIZE), start=1):
    batch = videos[start:start+BATCH_SIZE]

    temp_files = []

    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt") as concat_list:
        concat_path = concat_list.name

        for i, video in enumerate(batch):
            temp_clip = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4").name

            subprocess.run([
                "ffmpeg",
                "-y",
                "-i", video,
                "-t", str(CLIP_DURATION),
                "-c:v", "libx264",
                "-c:a", "aac",
                temp_clip
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

            temp_files.append(temp_clip)
            concat_list.write(f"file '{os.path.abspath(temp_clip)}'\n")

    output = f"merged_{batch_num:02d}.mp4"

    subprocess.run([
        "ffmpeg",
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_path,
        "-c", "copy",
        output
    ])

    print(f"Created {output}")

    os.remove(concat_path)

    for f in temp_files:
        os.remove(f)

print("Done!")
