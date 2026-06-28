from moviepy import VideoFileClip, ColorClip, concatenate_videoclips
import os

VIDEO_FOLDER = "sign-videos"
OUTPUT_PREFIX = "human-and-body-parts"

VIDEO_EXTENSIONS = (".mp4", ".mov", ".avi", ".mkv", ".webm")
BATCH_SIZE = 12

# Get all videos
video_files = sorted([
    os.path.join(VIDEO_FOLDER, f)
    for f in os.listdir(VIDEO_FOLDER)
    if f.lower().endswith(VIDEO_EXTENSIONS)
])

if not video_files:
    raise Exception("No videos found!")

# Process in batches of 12
for batch_num, start in enumerate(range(0, len(video_files), BATCH_SIZE), start=1):
    batch = video_files[start:start + BATCH_SIZE]

    print(f"\nCreating batch {batch_num} ({len(batch)} videos)")

    clips = []

    for i, video in enumerate(batch):
        print(f"Loading: {os.path.basename(video)}")

        clip = VideoFileClip(video)
        clips.append(clip)

        # Add 1-second black gap except after the last video
        if i != len(batch) - 1:
            gap = ColorClip(
                size=clip.size,
                color=(0, 0, 0),
                duration=1
            ).with_fps(clip.fps)

            clips.append(gap)

    final = concatenate_videoclips(clips, method="compose")

    output_file = f"{OUTPUT_PREFIX}_{batch_num}.mp4"

    final.write_videofile(
        output_file,
        codec="libx264",
        audio_codec="aac",
        fps=clips[0].fps
    )

    # Cleanup
    final.close()
    for clip in clips:
        clip.close()

    print(f"Saved: {output_file}")

print("Done!")