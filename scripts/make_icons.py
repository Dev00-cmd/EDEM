#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════
 GÉNÉRATEUR D'ICÔNES TI PWOF

 Redessine toutes les icônes de l'application à partir du même
 tracé que le logo SVG de `src/components/LogoMark.tsx` :
 un livre ouvert surmonté d'une étincelle.

 Pourquoi un script plutôt que des fichiers figés ? Parce que
 l'icône doit pouvoir être régénérée à l'identique quand la
 marque bouge, dans toutes les tailles que réclament Android,
 iOS et le web.

 Usage :  python scripts/make_icons.py
═══════════════════════════════════════════════════════════════
"""

from pathlib import Path
from PIL import Image, ImageDraw

# ── Couleurs de marque (identiques à src/theme/colors.ts) ─────
BLUE = (37, 99, 235)
BLUE_DEEP = (30, 58, 138)
SKY = (56, 189, 248)
WHITE = (255, 255, 255)
INK = (13, 27, 42)

# On dessine 4× trop grand puis on réduit : c'est ce qui donne
# des bords lisses sans moteur d'antialiasing vectoriel.
SS = 4

ASSETS = Path(__file__).resolve().parent.parent / "assets"


def bezier(p0, p1, p2, p3, steps=60):
    """Échantillonne une courbe de Bézier cubique."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def book_pages():
    """Les deux pages du livre, en coordonnées 96×96 (comme le SVG)."""
    left = (
        bezier((20, 34.5), (28.5, 30.3), (36, 30.3), (44, 34.5))
        + [(44, 67.5)]
        + bezier((44, 67.5), (36, 63.3), (28.5, 63.3), (20, 67.5))
        + [(20, 34.5)]
    )
    right = (
        bezier((76, 34.5), (67.5, 30.3), (60, 30.3), (52, 34.5))
        + [(52, 67.5)]
        + bezier((52, 67.5), (60, 63.3), (67.5, 63.3), (76, 67.5))
        + [(76, 34.5)]
    )
    return left, right


SPARK = [
    (48, 12), (51.6, 21.4), (61, 25), (51.6, 28.6),
    (48, 38), (44.4, 28.6), (35, 25), (44.4, 21.4),
]


def stroke_path(draw, pts, color, width):
    """
    Trace un chemin épais en tamponnant un disque le long du tracé.

    PIL sait dessiner des polylignes épaisses, mais ses jointures
    laissent de petites pointes sur les courbes serrées. Le tampon
    circulaire donne des extrémités et des angles parfaitement
    ronds, sans artefact — c'est ce que fait `stroke-linejoin:
    round` en SVG.
    """
    r = width / 2
    step = max(r * 0.35, 0.6)  # assez serré pour ne pas laisser de trous

    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        dx, dy = x1 - x0, y1 - y0
        dist = (dx * dx + dy * dy) ** 0.5
        n = max(1, int(dist / step))
        for i in range(n + 1):
            t = i / n
            cx, cy = x0 + dx * t, y0 + dy * t
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)


def draw_motif(draw, size, motif_color, spark_color, scale=1.0, offset=(0, 0)):
    """
    Dessine le livre + l'étincelle, centrés.

    `scale` < 1 rétrécit le motif — utile pour l'icône adaptative
    Android, dont le centre seul est garanti visible.
    """
    k = size / 96 * scale
    ox = offset[0] + (size - 96 * k) / 2
    oy = offset[1] + (size - 96 * k) / 2

    def to_px(pts):
        return [(ox + x * k, oy + y * k) for x, y in pts]

    stroke = max(1.0, 4.6 * k)

    for page in book_pages():
        stroke_path(draw, to_px(page), motif_color, stroke)

    draw.polygon(to_px(SPARK), fill=spark_color)


def gradient_square(size, radius_ratio=0.22):
    """Pastille de marque : dégradé bleu en diagonale, coins arrondis."""
    grad = Image.new("RGB", (size, size))
    px = grad.load()
    for y in range(size):
        for x in range(size):
            # Diagonale : 0 en haut-gauche → 1 en bas-droite
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(
                int(BLUE[i] + (BLUE_DEEP[i] - BLUE[i]) * t) for i in range(3)
            )

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255
    )

    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    return out


def make_icon(size, radius_ratio=0.22):
    """Icône pleine : pastille bleue + motif blanc."""
    s = size * SS
    img = gradient_square(s, radius_ratio)
    draw_motif(ImageDraw.Draw(img), s, WHITE, SKY)
    return img.resize((size, size), Image.LANCZOS)


def make_foreground(size, color=WHITE, spark=SKY):
    """
    Calque avant de l'icône adaptative Android : fond transparent.
    Le motif est réduit à 60 % pour rester dans la zone sûre, quelle
    que soit la forme découpée par le lanceur (rond, carré, goutte).
    """
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw_motif(ImageDraw.Draw(img), s, color, spark, scale=0.60)
    return img.resize((size, size), Image.LANCZOS)


def make_solid(size, color):
    """Aplat de couleur (fond de l'icône adaptative)."""
    return Image.new("RGBA", (size, size), color + (255,))


def make_splash(size=1024):
    """Écran de démarrage : motif seul, fond transparent."""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw_motif(ImageDraw.Draw(img), s, WHITE, SKY, scale=0.55)
    return img.resize((size, size), Image.LANCZOS)


def main():
    ASSETS.mkdir(exist_ok=True)
    outputs = {
        # iOS + magasins : pleine, sans transparence
        "icon.png": make_icon(1024),
        # Android adaptatif
        "android-icon-foreground.png": make_foreground(432),
        "android-icon-background.png": make_solid(432, BLUE_DEEP),
        "android-icon-monochrome.png": make_foreground(432, color=WHITE, spark=WHITE),
        # Démarrage
        "splash-icon.png": make_splash(1024),
        # Web
        "favicon.png": make_icon(64, radius_ratio=0.18),
    }

    for name, img in outputs.items():
        path = ASSETS / name
        img.save(path, "PNG")
        print(f"  OK {name}  ({img.size[0]}x{img.size[1]})")

    print(f"\n{len(outputs)} icones ecrites dans {ASSETS}")


if __name__ == "__main__":
    main()
