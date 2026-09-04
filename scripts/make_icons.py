#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════
 GÉNÉRATEUR D'ICÔNES EDEM

 Redessine toutes les icônes de l'application à partir du même
 tracé que le logo SVG de `src/components/LogoMark.tsx` :
 un E évidé dans un D.

 Pourquoi un script plutôt que des fichiers figés ? Parce que
 l'icône doit pouvoir être régénérée à l'identique quand la
 marque bouge, dans toutes les tailles que réclament Android,
 iOS et le web.

 ⚠️ CE QUE CE SCRIPT PRODUIT EST NATIF. Aucune mise à jour OTA
 ne repeint l'icône posée sur l'écran d'accueil : elle ne change
 qu'au prochain APK. Après une refonte de marque, l'app affiche
 donc le nouveau logo à l'intérieur et l'ancienne icône dehors,
 jusqu'à ce build.

 Usage :  python scripts/make_icons.py
═══════════════════════════════════════════════════════════════
"""

from pathlib import Path
from PIL import Image, ImageDraw

# ── Couleurs de marque (identiques à BRAND dans src/theme/colors.ts) ──
INK = (14, 22, 33)      # #0E1621 — la tuile, et le E évidé dedans
                        # (c'est le `background` du thème sombre)
BLUE = (59, 130, 246)   # #3B82F6 — le D

# On dessine 4× trop grand puis on réduit : c'est ce qui donne
# des bords lisses sans moteur d'antialiasing vectoriel.
SS = 4

ASSETS = Path(__file__).resolve().parent.parent / "assets"


# ═══════════════════════════════════════════════════════════════
#  LA MARQUE — un E dans un D.
#
#  Coordonnées en grille 96×96, identiques au tracé SVG utilisé
#  dans l'application (src/components/LogoMark.tsx) : les deux
#  doivent rester rigoureusement le même dessin.
#
#  Le D : trois coins largement arrondis, le quatrième carré en
#  bas à gauche. C'est ce coin unique qui donne son assise au
#  signe — quatre coins arrondis auraient donné une pastille de
#  plus, indistincte des dizaines d'autres sur un écran d'accueil.
# ═══════════════════════════════════════════════════════════════

D_BOX = (18, 18, 78, 78)
D_RADIUS = 20

# Le E : la hampe, puis trois barres. Celle du milieu est plus
# courte — sans cela le signe se lit comme trois traits empilés.
# (x, y, largeur, hauteur), extrémités arrondies à mi-hauteur.
E_BARS = [
    (30, 29.0, 9.0, 38.0),   # la hampe
    (30, 29.0, 35.5, 9.0),   # barre haute
    (30, 43.5, 22.5, 9.0),   # barre du milieu, plus courte
    (30, 58.0, 32.5, 9.0),   # barre basse
]


def draw_mark(draw, size, d_color, e_color, scale=1.0):
    """
    Dessine le D et le E évidé dedans, centrés.

    `scale` < 1 rétrécit le motif — utile pour l'icône adaptative
    Android, dont seul le centre est garanti visible.
    """
    k = size / 96 * scale
    ox = (size - 96 * k) / 2
    oy = (size - 96 * k) / 2

    def px(x, y):
        return (ox + x * k, oy + y * k)

    # ── Le D ────────────────────────────────────────────────────
    x0, y0, x1, y1 = D_BOX
    p0, p1 = px(x0, y0), px(x1, y1)
    draw.rounded_rectangle(
        [p0, p1],
        radius=D_RADIUS * k,
        fill=d_color,
        # Le coin bas-gauche reste carré : (haut-gauche, haut-droite,
        # bas-droite, bas-gauche).
        corners=(True, True, True, False),
    )

    # ── Le E, dans la couleur du fond ───────────────────────────
    for bx, by, bw, bh in E_BARS:
        a, b = px(bx, by), px(bx + bw, by + bh)
        draw.rounded_rectangle([a, b], radius=min(bw, bh) * k / 2, fill=e_color)


def make_icon(size, radius_ratio=0.0):
    """
    Icône pleine : tuile sombre, D bleu, E évidé.

    CARRÉE par défaut, et c'est voulu. iOS et les magasins posent
    eux-mêmes leur masque : une icône déjà arrondie ressort avec des
    coins noirs doublés, et ses angles transparents font refuser la
    fiche par l'App Store. C'est au système d'arrondir, pas à nous.
    """
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(
        [0, 0, s - 1, s - 1], radius=int(s * radius_ratio), fill=INK + (255,)
    )
    draw_mark(draw, s, BLUE + (255,), INK + (255,))
    return img.resize((size, size), Image.LANCZOS)


def make_foreground(size, d_color=BLUE, e_color=INK):
    """
    Calque avant de l'icône adaptative Android : fond transparent.

    Android ne garantit que le cercle central (≈61 % du cadre) :
    au-delà, le lanceur peut rogner selon la forme qu'il applique.
    À 0.72, le motif remplit bien l'icône tout en restant
    entièrement dans la zone sûre.

    Le E ne peut pas être troué ici — le calque est transparent,
    et un E transparent laisserait voir le fond ADAPTATIF, qui
    n'est pas la couleur de la tuile. Il est donc peint en INK,
    exactement comme sur la tuile.
    """
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw_mark(ImageDraw.Draw(img), s, d_color + (255,), e_color + (255,), scale=0.72)
    return img.resize((size, size), Image.LANCZOS)


def make_solid(size, color):
    """Aplat de couleur (fond de l'icône adaptative)."""
    return Image.new("RGBA", (size, size), color + (255,))


def make_splash(size=1024):
    """Écran de démarrage : motif seul, fond transparent."""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw_mark(ImageDraw.Draw(img), s, BLUE + (255,), INK + (255,), scale=0.55)
    return img.resize((size, size), Image.LANCZOS)


def main():
    ASSETS.mkdir(exist_ok=True)
    outputs = {
        # iOS + magasins : pleine, sans transparence
        "icon.png": make_icon(1024),
        # Android adaptatif
        "android-icon-foreground.png": make_foreground(432),
        "android-icon-background.png": make_solid(432, INK),
        # Le calque monochrome sert de POCHOIR : Android le repeint
        # entièrement d'une seule couleur. Un E d'une autre teinte y
        # disparaîtrait — on le laisse donc transparent, et c'est le
        # trou qui dessine la lettre.
        "android-icon-monochrome.png": make_monochrome(432),
        # Démarrage
        "splash-icon.png": make_splash(1024),
        # Notifications Android
        "notification-icon.png": make_notification(96),
        # Web
        # Carré lui aussi : ses coins arrondis étaient transparents,
        # et l'aplatissement en RGB les peignait en NOIR — quatre
        # angles noirs dans l'onglet du navigateur.
        "favicon.png": make_icon(64),
    }

    for name, img in outputs.items():
        path = ASSETS / name
        # iOS REFUSE une icône d'application porteuse d'un canal
        # alpha : la fiche est rejetée à l'envoi. Celles qui sont
        # pleines sont donc aplaties ; les calques Android, eux,
        # ont besoin de leur transparence.
        if name in ("icon.png", "favicon.png"):
            img = img.convert("RGB")
        img.save(path, "PNG")
        print(f"  OK {name}  ({img.size[0]}x{img.size[1]})")

    print(f"\n{len(outputs)} icones ecrites dans {ASSETS}")


def make_monochrome(size):
    """
    Calque monochrome (thème « icônes teintées » d'Android 13+).

    Android en garde uniquement l'alpha et le repeint. Le E est
    donc percé dans le D — un trou reste un trou quelle que soit
    la couleur appliquée, alors qu'une seconde teinte serait
    écrasée et la lettre effacée.
    """
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_mark(draw, s, BLUE + (255,), (0, 0, 0, 0), scale=0.72)
    return img.resize((size, size), Image.LANCZOS)


def make_notification(size):
    """
    Icône de la barre de notifications Android (96x96).

    Android n'en garde QUE l'alpha et la repeint — exactement
    comme le calque monochrome. On la dessine donc en blanc, ce
    que documente Google, en sachant que la couleur ne survivra
    pas ; c'est la SILHOUETTE qui doit être lisible.

    D'où le E percé plutôt que peint d'une seconde teinte : un
    trou reste un trou après repeinte, une couleur non. Sans ça,
    la lettre disparaîtrait et il ne resterait qu'un D plein
    dans la barre d'état.

    Un peu plus grand que le monochrome (0,80 contre 0,72) : la
    barre de notifications est déjà petite, et la marge que
    réclame l'écran d'accueil n'a pas lieu d'être ici.
    """
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_mark(draw, s, (255, 255, 255, 255), (0, 0, 0, 0), scale=0.80)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    main()
