"""Génère les icônes de PrimaPorts (exe, fenêtre, zone de notification) à partir d'un dessin vectoriel simple.

Usage : python build/make-icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
INK, PAPER, LED = (22, 24, 29, 255), (244, 242, 236, 255), (47, 212, 122, 255)
S = 1024  # dessin en haute définition, réduit ensuite


def draw(size_hint: int) -> Image.Image:
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Petites tailles : traits plus épais pour rester lisibles
    k = 1.35 if size_hint <= 32 else 1.0
    pad = 32 if size_hint > 32 else 8
    d.rounded_rectangle([pad, pad, S - pad, S - pad], radius=230, fill=INK)
    w = int(62 * k)
    # prise USB
    d.rounded_rectangle([272, 384, 752, 672], radius=80, outline=PAPER, width=w)
    d.rounded_rectangle([400, 505, 624, 551 + int(10 * k)], radius=24, fill=PAPER)
    # voyant « actif »
    r = int(78 * k)
    cx, cy = 736, 272
    d.ellipse([cx - r - 18, cy - r - 18, cx + r + 18, cy + r + 18], fill=INK)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=LED)
    return img


def render(size: int) -> Image.Image:
    return draw(size).resize((size, size), Image.LANCZOS)


def main():
    assets = ROOT / "app" / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    render(256).save(assets / "icon.png")
    render(16).save(assets / "tray.png")
    render(32).save(assets / "tray@2x.png")
    sizes = [16, 24, 32, 48, 64, 128, 256]
    big = render(256)
    big.save(ROOT / "build" / "icon.ico", sizes=[(s, s) for s in sizes],
             append_images=[render(s) for s in sizes[:-1]])
    big.save(ROOT / "build" / "icon.png")
    print("icônes générées")


if __name__ == "__main__":
    main()
