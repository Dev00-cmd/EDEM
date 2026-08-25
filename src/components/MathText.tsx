// ═══════════════════════════════════════════════════════════════
//  RENDU MATHÉMATIQUE
//
//  Un élève n'apprend rien en lisant « 17/12 ». Il a besoin de
//  voir la barre de fraction, comme au tableau :
//
//        3     2     9     8     17
//        ─  +  ─  =  ──  + ──  = ──
//        4     3     12    12    12
//
//  Ce fichier lit un sous-ensemble de LaTeX et le dessine avec
//  de simples Vues React Native — sans WebView ni librairie
//  mathématique. Deux raisons : l'APK reste léger (important sur
//  un téléphone d'entrée de gamme haïtien) et l'affichage est
//  instantané, sans page web à charger pour chaque formule.
//
//  Sous-ensemble reconnu :
//    \frac{a}{b}   fraction empilée
//    x^{2}  x^2    exposant
//    x_{1}  x_1    indice
//    \sqrt{x}      racine carrée
//    \times \div \pm \le \ge \ne \approx \to \pi \infty ...
//
//  Tout ce qui n'est pas reconnu s'affiche tel quel : une formule
//  exotique reste lisible au lieu de casser l'écran.
// ═══════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { FONTS } from '@/theme/typography';

// ─── Symboles ─────────────────────────────────────────────────

const SYMBOLS: Record<string, string> = {
  times: '×', div: '÷', cdot: '·', pm: '±', mp: '∓',
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠',
  approx: '≈', equiv: '≡', sim: '∼',
  to: '→', rightarrow: '→', Rightarrow: '⇒', leftarrow: '←',
  infty: '∞', degree: '°', circ: '°', percent: '%',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ',
  theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ',
  sigma: 'σ', Sigma: 'Σ', phi: 'φ', omega: 'ω', Omega: 'Ω',
  in: '∈', notin: '∉', subset: '⊂', cup: '∪', cap: '∩',
  forall: '∀', exists: '∃', emptyset: '∅',
  sum: '∑', prod: '∏', int: '∫', partial: '∂', nabla: '∇',
  angle: '∠', perp: '⊥', parallel: '∥', triangle: '△',
  ldots: '…', cdots: '⋯', quad: '  ', ',': ' ', ';': ' ',
  left: '', right: '', displaystyle: '', text: '',
};

// ─── Arbre ────────────────────────────────────────────────────

type Node =
  | { k: 'txt'; v: string }
  | { k: 'frac'; num: Node[]; den: Node[] }
  | { k: 'sqrt'; body: Node[] }
  | { k: 'sup'; body: Node[] }
  | { k: 'sub'; body: Node[] }
  | { k: 'row'; body: Node[] };

/** Lecteur de chaîne avec curseur — plus lisible qu'un index nu. */
class Cursor {
  constructor(public s: string, public i = 0) {}
  get done() { return this.i >= this.s.length; }
  peek() { return this.s[this.i]; }
  next() { return this.s[this.i++]; }
}

/**
 * Lit ce qui suit `^`, `_`, `\frac`… : soit un groupe { … },
 * soit un unique caractère (`x^2` équivaut à `x^{2}`).
 */
function readArgument(c: Cursor): Node[] {
  while (!c.done && c.peek() === ' ') c.i++;
  if (c.done) return [];

  if (c.peek() === '{') {
    c.i++; // ouvre
    const start = c.i;
    let depth = 1;
    while (!c.done && depth > 0) {
      const ch = c.next();
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    return parseNodes(c.s.slice(start, c.i - 1));
  }

  // Une commande peut aussi servir d'argument : \sqrt\pi
  if (c.peek() === '\\') {
    const start = c.i;
    c.i++;
    while (!c.done && /[a-zA-Z]/.test(c.peek())) c.i++;
    return parseNodes(c.s.slice(start, c.i));
  }

  return [{ k: 'txt', v: c.next() }];
}

function parseNodes(src: string): Node[] {
  const c = new Cursor(src);
  const out: Node[] = [];
  let buffer = '';

  const flush = () => {
    if (buffer) {
      out.push({ k: 'txt', v: buffer });
      buffer = '';
    }
  };

  while (!c.done) {
    const ch = c.peek();

    if (ch === '\\') {
      c.i++;
      let name = '';
      while (!c.done && /[a-zA-Z]/.test(c.peek())) name += c.next();

      // Commande d'un seul caractère : \, \; \{ …
      if (!name && !c.done) name = c.next();

      if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
        flush();
        const num = readArgument(c);
        const den = readArgument(c);
        out.push({ k: 'frac', num, den });
      } else if (name === 'sqrt') {
        flush();
        out.push({ k: 'sqrt', body: readArgument(c) });
      } else if (name in SYMBOLS) {
        buffer += SYMBOLS[name];
      } else {
        // Commande inconnue : on la montre plutôt que de l'avaler
        buffer += name;
      }
      continue;
    }

    if (ch === '^' || ch === '_') {
      c.i++;
      flush();
      const body = readArgument(c);
      out.push(ch === '^' ? { k: 'sup', body } : { k: 'sub', body });
      continue;
    }

    if (ch === '{' || ch === '}') { c.i++; continue; }

    buffer += c.next();
  }

  flush();
  return out;
}

// ─── Rendu ────────────────────────────────────────────────────

interface RenderProps {
  nodes: Node[];
  size: number;
  color: string;
}

function Nodes({ nodes, size, color }: RenderProps) {
  return (
    <>
      {nodes.map((n, i) => (
        <Atom key={i} node={n} size={size} color={color} />
      ))}
    </>
  );
}

function Atom({ node, size, color }: { node: Node; size: number; color: string }) {
  const base: TextStyle = {
    fontFamily: FONTS.medium,
    fontSize: size,
    color,
    // Un interligne serré : la formule doit rester compacte
    lineHeight: size * 1.15,
  };

  switch (node.k) {
    case 'txt':
      return <Text style={base}>{node.v}</Text>;

    case 'frac': {
      // Le numérateur et le dénominateur rétrécissent légèrement,
      // pour que les fractions imbriquées restent lisibles.
      const inner = size * 0.94;
      return (
        <View style={styles.frac}>
          <View style={styles.fracPart}>
            <Nodes nodes={node.num} size={inner} color={color} />
          </View>
          <View
            style={[
              styles.fracBar,
              { backgroundColor: color, marginVertical: size * 0.12 },
            ]}
          />
          <View style={styles.fracPart}>
            <Nodes nodes={node.den} size={inner} color={color} />
          </View>
        </View>
      );
    }

    case 'sqrt':
      return (
        <View style={styles.sqrt}>
          <Text style={[base, { fontSize: size * 1.15 }]}>√</Text>
          <View
            style={[
              styles.sqrtBody,
              { borderTopColor: color, paddingTop: size * 0.1 },
            ]}
          >
            <Nodes nodes={node.body} size={size} color={color} />
          </View>
        </View>
      );

    case 'sup':
      return (
        <View style={[styles.script, { marginBottom: size * 0.42 }]}>
          <Nodes nodes={node.body} size={size * 0.68} color={color} />
        </View>
      );

    case 'sub':
      return (
        <View style={[styles.script, { marginTop: size * 0.42 }]}>
          <Nodes nodes={node.body} size={size * 0.68} color={color} />
        </View>
      );

    default:
      return (
        <View style={styles.row}>
          <Nodes nodes={node.body} size={size} color={color} />
        </View>
      );
  }
}

/** Une formule mathématique isolée. */
export function MathExpression({
  latex,
  size = 15,
  color,
}: {
  latex: string;
  size?: number;
  color: string;
}) {
  const nodes = useMemo(() => parseNodes(latex), [latex]);
  return (
    <View style={styles.expr}>
      <Nodes nodes={nodes} size={size} color={color} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TEXTE ENRICHI — **gras** + $formules$ mêlés à la prose
// ═══════════════════════════════════════════════════════════════

type Piece =
  | { t: 'plain'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'math'; v: string };

/** Découpe un texte en morceaux : prose, gras, mathématiques. */
function splitRich(input: string): Piece[] {
  const pieces: Piece[] = [];
  // On capture d'abord les formules, puis le gras.
  const re = /(\$\$[^$]+\$\$|\$[^$\n]+\$|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(input)) !== null) {
    if (m.index > last) pieces.push({ t: 'plain', v: input.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('$$')) pieces.push({ t: 'math', v: tok.slice(2, -2) });
    else if (tok.startsWith('$')) pieces.push({ t: 'math', v: tok.slice(1, -1) });
    else pieces.push({ t: 'bold', v: tok.slice(2, -2) });
    last = m.index + tok.length;
  }
  if (last < input.length) pieces.push({ t: 'plain', v: input.slice(last) });

  return pieces;
}

interface RichTextProps {
  children: string;
  size?: number;
  color: string;
  /** Couleur des passages en gras (accent par défaut). */
  boldColor?: string;
  style?: TextStyle;
}

/**
 * Affiche un texte mêlant prose, **gras** et $formules$.
 *
 * Deux chemins de rendu, pour la performance : un paragraphe sans
 * formule est un simple <Text> (rapide, césure native). Dès qu'une
 * formule apparaît, on bascule sur une rangée qui passe à la ligne,
 * où chaque mot et chaque formule est un élément — c'est le seul
 * moyen d'aligner une fraction dessinée au milieu d'une phrase.
 */
export function RichText({
  children,
  size = 14.8,
  color,
  boldColor,
  style,
}: RichTextProps) {
  const { colors } = useTheme();
  const strong = boldColor ?? color;

  const pieces = useMemo(() => splitRich(children ?? ''), [children]);
  const hasMath = pieces.some((p) => p.t === 'math');

  const baseStyle: TextStyle = {
    fontFamily: FONTS.regular,
    fontSize: size,
    lineHeight: size * 1.5,
    color,
    ...style,
  };

  // Chemin rapide : aucun rendu mathématique nécessaire.
  if (!hasMath) {
    return (
      <Text style={baseStyle}>
        {pieces.map((p, i) =>
          p.t === 'bold' ? (
            <Text key={i} style={{ fontFamily: FONTS.bold, color: strong }}>
              {p.v}
            </Text>
          ) : (
            <Text key={i}>{p.v}</Text>
          ),
        )}
      </Text>
    );
  }

  // Chemin mathématique : rangée qui passe à la ligne.
  const atoms: React.ReactNode[] = [];
  pieces.forEach((p, pi) => {
    if (p.t === 'math') {
      atoms.push(
        <View key={`m${pi}`} style={styles.inlineMath}>
          <MathExpression latex={p.v} size={size} color={color} />
        </View>,
      );
      return;
    }
    // On découpe en mots pour que la césure fonctionne dans la rangée.
    const font = p.t === 'bold' ? FONTS.bold : FONTS.regular;
    const tint = p.t === 'bold' ? strong : color;
    p.v.split(/(\s+)/).forEach((w, wi) => {
      if (w === '') return;
      if (/^\s+$/.test(w)) {
        // Un saut de ligne explicite doit rester un saut de ligne.
        if (w.includes('\n')) {
          atoms.push(<View key={`br${pi}-${wi}`} style={styles.lineBreak} />);
        } else {
          atoms.push(
            <Text key={`s${pi}-${wi}`} style={[baseStyle, { fontFamily: font }]}>
              {' '}
            </Text>,
          );
        }
        return;
      }
      atoms.push(
        <Text
          key={`w${pi}-${wi}`}
          style={[baseStyle, { fontFamily: font, color: tint }]}
        >
          {w}
        </Text>,
      );
    });
  });

  return <View style={[styles.richRow, { minHeight: size }]}>{atoms}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  expr: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' },

  frac: { alignItems: 'center', justifyContent: 'center', marginHorizontal: 3 },
  fracPart: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3 },
  fracBar: { height: 1.6, alignSelf: 'stretch', borderRadius: 1 },

  sqrt: { flexDirection: 'row', alignItems: 'center' },
  sqrtBody: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1.4,
    paddingHorizontal: 2,
  },

  script: { flexDirection: 'row', alignItems: 'center' },

  richRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  inlineMath: { paddingVertical: 3, marginHorizontal: 1 },
  lineBreak: { width: '100%', height: 0 },
});
