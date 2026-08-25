import { fr, type Lang, type Messages } from './fr';
import { ht } from './ht';

export type { Lang };

const dictionaries: Record<Lang, Messages> = { fr, ht };

/**
 * Traduit une clé du type 'home.askTitle' dans la langue choisie.
 * Si la clé n'existe pas en créole, on retombe sur le français.
 */
function deepGet(obj: any, path: string): string | undefined {
  const val = path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  return typeof val === 'string' ? val : undefined;
}

export function translate(lang: Lang, path: string, vars?: Record<string, string>): string {
  let str = deepGet(dictionaries[lang], path) ?? deepGet(dictionaries.fr, path) ?? path;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }
  return str;
}
