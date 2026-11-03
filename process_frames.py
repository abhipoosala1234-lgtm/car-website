import os
import sys
import glob
import re
import time
from concurrent.futures import ProcessPoolExecutor
from PIL import Image

def natural_sort_key(s):
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', s)]

def process_single_frame(args):
    src_path, dst_desktop, dst_mobile = args
    try:
        with Image.open(src_path) as im:
            rgb_im = im.convert('RGB')
            # Desktop 1600px wide (16:9 -> 1600x900)
            im_desk = rgb_im.resize((1600, 900), Image.Resampling.LANCZOS)
            im_desk.save(dst_desktop, 'WEBP', quality=78)
            # Mobile 960px wide (16:9 -> 960x540)
            im_mob = rgb_im.resize((960, 540), Image.Resampling.LANCZOS)
            im_mob.save(dst_mobile, 'WEBP', quality=72)
        return True
    except Exception as e:
        print(f"Error processing {src_path}: {e}")
        return False

def main():
    os.makedirs('assets/frames/hero', exist_ok=True)
    os.makedirs('assets/frames/hero-mobile', exist_ok=True)
    os.makedirs('assets/frames/dismantle', exist_ok=True)
    os.makedirs('assets/frames/dismantle-mobile', exist_ok=True)
    os.makedirs('assets/cars', exist_ok=True)

    # Hero clips
    c1 = sorted(glob.glob('frames/hero section/clip 1/*.png'), key=natural_sort_key)
    c2 = sorted(glob.glob('frames/hero section/clip 2/*.png'), key=natural_sort_key)
    c3 = sorted(glob.glob('frames/hero section/clip 3/*.png'), key=natural_sort_key)

    print(f"Found clip 1: {len(c1)}, clip 2: {len(c2)}, clip 3: {len(c3)}")

    # Join with deduplication: skip first frame of clip 2 and clip 3
    hero_frames = list(c1) + list(c2[1:]) + list(c3[1:])
    print(f"Total hero frames joined: {len(hero_frames)}")

    # Dismantle
    dismantle_frames = sorted(glob.glob('frames/dismantle/*.png'), key=natural_sort_key)
    print(f"Total dismantle frames: {len(dismantle_frames)}")

    tasks = []
    for idx, src in enumerate(hero_frames, start=1):
        num_str = f"{idx:04d}"
        dst_desk = f"assets/frames/hero/frame_{num_str}.webp"
        dst_mob = f"assets/frames/hero-mobile/frame_{num_str}.webp"
        tasks.append((src, dst_desk, dst_mob))

    for idx, src in enumerate(dismantle_frames, start=1):
        num_str = f"{idx:04d}"
        dst_desk = f"assets/frames/dismantle/frame_{num_str}.webp"
        dst_mob = f"assets/frames/dismantle-mobile/frame_{num_str}.webp"
        tasks.append((src, dst_desk, dst_mob))

    print(f"Total frame conversion tasks: {len(tasks)}")
    t0 = time.time()
    workers = max(1, os.cpu_count() or 4)
    print(f"Running with {workers} parallel workers...")

    with ProcessPoolExecutor(max_workers=workers) as executor:
        results = list(executor.map(process_single_frame, tasks, chunksize=10))

    t1 = time.time()
    print(f"Conversion complete in {t1 - t0:.2f} seconds!")

    # Verify counts and folder sizes
    folders = [
        ('assets/frames/hero', len(hero_frames)),
        ('assets/frames/hero-mobile', len(hero_frames)),
        ('assets/frames/dismantle', len(dismantle_frames)),
        ('assets/frames/dismantle-mobile', len(dismantle_frames)),
    ]

    print("\n--- SUMMARY OF OUTPUT FOLDERS ---")
    for folder, expected_count in folders:
        files = glob.glob(f"{folder}/*.webp")
        total_size = sum(os.path.getsize(f) for f in files)
        size_mb = total_size / (1024 * 1024)
        print(f"{folder}: {len(files)} frames (expected {expected_count}), total size: {size_mb:.2f} MB")

if __name__ == '__main__':
    main()
