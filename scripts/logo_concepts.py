#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════
 PROPOSITIONS DE LOGO — Ti Pwof

 Chaque concept est dessiné dans la même grammaire que le reste
 de l'app : grille 96x96, trait arrondi, bleu de marque.

 La planche montre chaque logo en grand ET en 48 px : un logo
 d'application doit rester lisible à la taille où il vit
 vraiment, sur l'écran d'accueil d'un téléphone.

 Usage :  python scripts/logo_concepts.py
═══════════════════════════════════════════════════════════════
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BLUE = (37, 99, 235)
BLUE_DEEP = (30, 58, 138)
SKY = (56, 189, 248)
WHITE = (255, 255, 255)
PAPER = (245, 247, 250)
INK = (13, 27, 42)

SS = 4  # sur-échantillonnage : bords lisses après réduction

OUT = Path(__file__).resolve().parent.parent / "assets" / "concepts"


# ─── Outils de tracé ──────────────────────────────────────────

def bezier(p0, p1, p2, p3, steps=50):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        pts.append((
            u**3 * p0[0] + 3*u**2*t * p1[0] + 3*u*t**2 * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3*u**2*t * p1[1] + 3*u*t**2 * p2[1] + t**3 * p3[1],
        ))
    return pts


def stroke(draw, pts, color, width, closed=False):
    """Trace épais au tampon circulaire : jointures parfaitement rondes."""
    path = list(pts) + ([pts[0]] if closed else [])
    r = width / 2
    step = max(r * 0.3, 0.5)
    for (x0, y0), (x1, y1) in zip(path, path[1:]):
        dx, dy = x1 - x0, y1 - y0
        dist = (dx * dx + dy * dy) ** 0.5
        n = max(1, int(dist / step))
        for i in range(n + 1):
            t = i / n
            cx, cy = x0 + dx * t, y0 + dy * t
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)


def spark(cx, cy, size):
    """Étincelle à quatre branches — le signe « IA » de la marque."""
    a, b = size, size * 0.29
    return [
        (cx, cy - a), (cx + b, cy - b), (cx + a, cy), (cx + b, cy + b),
        (cx, cy + a), (cx - b, cy + b), (cx - a, cy), (cx - b, cy - b),
    ]


def rounded_pts(x0, y0, x1, y1, r, steps=12):
    """Contour d'un rectangle à coins ronds, en points."""
    pts = []
    corners = [
        (x1 - r, y0 + r, -90, 0), (x1 - r, y1 - r, 0, 90),
        (x0 + r, y1 - r, 90, 180), (x0 + r, y0 + r, 180, 270),
    ]
    import math
    for cx, cy, a0, a1 in corners:
        for i in range(steps + 1):
            a = math.radians(a0 + (a1 - a0) * i / steps)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


# ─── Les concepts ─────────────────────────────────────────────

def concept_livre(d, k, w):
    """1 — Livre ouvert & étincelle. L'école et l'IA en un signe."""
    left = (bezier((20, 36), (28.5, 31.8), (36, 31.8), (44, 36))
            + [(44, 69)]
            + bezier((44, 69), (36, 64.8), (28.5, 64.8), (20, 69)))
    right = (bezier((76, 36), (67.5, 31.8), (60, 31.8), (52, 36))
             + [(52, 69)]
             + bezier((52, 69), (60, 64.8), (67.5, 64.8), (76, 69)))
    for page in (left, right):
        stroke(d, [(x*k, y*k) for x, y in page], WHITE, w, closed=True)
    d.polygon([(x*k, y*k) for x, y in spark(48, 22, 13)], fill=SKY)


def concept_bulle(d, k, w):
    """2 — Bulle de dialogue & étincelle. Le tuteur qui parle."""
    body = rounded_pts(17, 20, 79, 62, 15)
    stroke(d, [(x*k, y*k) for x, y in body], WHITE, w, closed=True)
    tail = [(34, 61), (30, 78), (49, 61)]
    d.polygon([(x*k, y*k) for x, y in tail], fill=WHITE)
    d.polygon([(x*k, y*k) for x, y in spark(48, 41, 16)], fill=SKY)


def concept_chouette(d, k, w):
    """3 — Chouette. Le symbole du savoir, en géométrie simple."""
    head = rounded_pts(22, 22, 74, 76, 25)
    stroke(d, [(x*k, y*k) for x, y in head], WHITE, w, closed=True)
    # aigrettes
    stroke(d, [(30*k, 27*k), (36*k, 16*k), (44*k, 24*k)], WHITE, w)
    stroke(d, [(66*k, 27*k), (60*k, 16*k), (52*k, 24*k)], WHITE, w)
    # yeux
    for cx in (38, 58):
        d.ellipse([(cx-10)*k, 34*k, (cx+10)*k, 54*k], fill=WHITE)
        d.ellipse([(cx-4)*k, 40*k, (cx+4)*k, 48*k], fill=BLUE_DEEP)
    # bec
    d.polygon([(44*k, 57*k), (52*k, 57*k), (48*k, 65*k)], fill=SKY)


def concept_chapeau(d, k, w):
    """4 — Chapeau de diplômé & étincelle. L'objectif de l'élève."""
    board = [(48, 30), (80, 43), (48, 56), (16, 43)]
    d.polygon([(x*k, y*k) for x, y in board], fill=WHITE)
    # bandeau sous le chapeau
    band = bezier((30, 48), (30, 70), (66, 70), (66, 48))
    stroke(d, [(x*k, y*k) for x, y in band], WHITE, w)
    # gland
    stroke(d, [(76*k, 47*k), (76*k, 64*k)], WHITE, w * 0.7)
    d.ellipse([72*k, 62*k, 80*k, 70*k], fill=SKY)
    d.polygon([(x*k, y*k) for x, y in spark(26, 22, 10)], fill=SKY)


def concept_monogramme(d, k, w):
    """5 — Le T de Ti Pwof, posé sur un livre. Sobre et unique."""
    # barre et fût du T
    stroke(d, [(28*k, 28*k), (68*k, 28*k)], WHITE, w * 1.5)
    stroke(d, [(48*k, 28*k), (48*k, 60*k)], WHITE, w * 1.5)
    # le livre qui porte la lettre
    base = (bezier((22, 66), (34, 61), (42, 61), (48, 66))
            + bezier((48, 66), (54, 61), (62, 61), (74, 66)))
    stroke(d, [(x*k, y*k) for x, y in base], WHITE, w)
    stroke(d, [(22*k, 66*k), (22*k, 73*k)], WHITE, w)
    stroke(d, [(74*k, 66*k), (74*k, 73*k)], WHITE, w)
    base2 = (bezier((22, 73), (34, 68), (42, 68), (48, 73))
             + bezier((48, 73), (54, 68), (62, 68), (74, 73)))
    stroke(d, [(x*k, y*k) for x, y in base2], WHITE, w)
    d.polygon([(x*k, y*k) for x, y in spark(70, 20, 10)], fill=SKY)


CONCEPTS = [
    ("1. Livre & etincelle", concept_livre),
    ("2. Bulle & etincelle", concept_bulle),
    ("3. Chouette", concept_chouette),
    ("4. Chapeau & etincelle", concept_chapeau),
    ("5. Monogramme T", concept_monogramme),
]


# ─── Rendu ────────────────────────────────────────────────────

def gradient_tile(size, radius_ratio=0.22):
    grad = Image.new("RGB", (size, size))
    px = grad.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(int(BLUE[i] + (BLUE_DEEP[i] - BLUE[i]) * t) for i in range(3))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    return out


def render(fn, size):
    s = size * SS
    img = gradient_tile(s)
    d = ImageDraw.Draw(img)
    k = s / 96
    fn(d, k, max(1.0, 4.6 * k))
    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    BIG, SMALL, PAD = 190, 48, 26
    cols = len(CONCEPTS)
    W = PAD + cols * (BIG + PAD)
    H = PAD + 34 + BIG + 18 + SMALL + 34

    sheet = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(sheet)

    try:
        font = ImageFont.load_default(size=15)
        small_font = ImageFont.load_default(size=12)
    except TypeError:
        font = small_font = ImageFont.load_default()

    for i, (label, fn) in enumerate(CONCEPTS):
        x = PAD + i * (BIG + PAD)
        d.text((x, PAD), label, fill=INK, font=font)

        sheet.paste(render(fn, BIG), (x, PAD + 26), render(fn, BIG))

        y2 = PAD + 26 + BIG + 16
        sheet.paste(render(fn, SMALL), (x, y2), render(fn, SMALL))
        d.text((x + SMALL + 10, y2 + 16), "taille reelle", fill=(130, 145, 165),
               font=small_font)

        # Chaque concept est aussi exporté seul, en grand.
        render(fn, 512).save(OUT / f"concept-{i+1}.png")

    sheet.save(OUT / "planche.png")
    print(f"OK planche + {len(CONCEPTS)} concepts -> {OUT}")


if __name__ == "__main__":
    main()
