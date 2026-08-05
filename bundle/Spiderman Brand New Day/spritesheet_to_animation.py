from PIL import Image
import os

SPRITESHEET = "SpiderMan_web.png"

# Change these values if your spritesheet differs.
FRAME_WIDTH = 82
FRAME_HEIGHT = 124
FPS = 20

sheet = Image.open(SPRITESHEET).convert("RGBA")
frames = []

for x in range(0, sheet.width, FRAME_WIDTH):
    frame = sheet.crop((x, 0, x + FRAME_WIDTH, FRAME_HEIGHT))
    frames.append(frame)

duration = int(1000 / FPS)

# APNG (keeps full alpha)
frames[0].save(
    "SpiderMan_web.apng",
    save_all=True,
    append_images=frames[1:],
    duration=duration,
    loop=0,
    optimize=False,
)

# Animated WebP (also keeps full alpha)
frames[0].save(
    "SpiderMan_web.webp",
    save_all=True,
    append_images=frames[1:],
    duration=duration,
    loop=0,
    lossless=True,
)

# GIF (1-bit transparency only)
frames[0].save(
    "SpiderMan_web.gif",
    save_all=True,
    append_images=frames[1:],
    duration=duration,
    loop=0,
    disposal=2,
)

print(f"Exported {len(frames)} frames.")
