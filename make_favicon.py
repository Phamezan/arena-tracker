"""Render the gold spartan helmet favicon at multiple sizes with Pillow."""
from PIL import Image, ImageDraw

BG = "#0b0e14"
GOLD_TOP = "#f0d060"
GOLD_BOT = "#d4af37"


def lerp_color(c1, c2, t):
    a = tuple(int(c1[i:i + 2], 16) for i in (1, 3, 5))
    b = tuple(int(c2[i:i + 2], 16) for i in (1, 3, 5))
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def render(size):
    S = 4  # supersample
    W = size * S
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = W / 64.0

    def sc(points):
        return [(x * s, y * s) for x, y in points]

    # rounded-square background
    d.rounded_rectangle([0, 0, W - 1, W - 1], radius=12 * s, fill=BG)

    # helmet silhouette mask (dome + cheek guards + crest blade)
    mask = Image.new("L", (W, W), 0)
    m = ImageDraw.Draw(mask)
    m.polygon(sc([(32, 3), (34.5, 13), (29.5, 13)]), fill=255)          # crest
    m.ellipse([14 * s, 10 * s, 50 * s, 46 * s], fill=255)                # dome
    m.polygon(sc([(14, 32), (50, 32), (50, 45), (48, 48), (45, 48),
                  (43, 55), (38, 59), (32, 59), (26, 59), (21, 55),
                  (19, 48), (16, 48), (14, 45)]), fill=255)              # cheeks

    # vertical gold gradient inside mask
    grad = Image.new("RGBA", (W, W))
    gd = ImageDraw.Draw(grad)
    for y in range(W):
        gd.line([(0, y), (W, y)], fill=lerp_color(GOLD_TOP, GOLD_BOT, y / W))
    img.paste(grad, (0, 0), mask)

    # T-shaped face opening (painted in bg color on top)
    d = ImageDraw.Draw(img)
    d.rectangle([22 * s, 25 * s, 42 * s, 30 * s], fill=BG)               # eye bar
    d.rectangle([29 * s, 30 * s, 35 * s, 50 * s], fill=BG)               # nose slit

    return img.resize((size, size), Image.LANCZOS)


for size, name in [(16, None), (32, None), (48, None),
                   (96, "favicon-96x96.png"),
                   (180, "apple-touch-icon.png"),
                   (192, "web-app-manifest-192x192.png"),
                   (512, "web-app-manifest-512x512.png")]:
    img = render(size)
    if name:
        img.save(name)
        print("wrote", name)

# multi-resolution favicon.ico
render(48).save("favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("wrote favicon.ico")
