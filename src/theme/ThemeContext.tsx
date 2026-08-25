import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getColors, type Palette, type ThemeMode } from './colors';

interface ThemeState {
  colors: Palette;
  isDark: boolean;
  mode: ThemeMode;
}

const ThemeContext = createContext<ThemeState>({
  colors: getColors(false),
  isDark: false,
  mode: 'system',
});

/**
 * Donne le thème de toute l'app.
 * @param mode choix de l'utilisateur : 'system' | 'light' | 'dark'
 */
export function ThemeProvider({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  const systemScheme = useColorScheme();
  const value = useMemo<ThemeState>(() => {
    const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
    return { colors: getColors(isDark), isDark, mode };
  }, [mode, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Récupère les couleurs et le mode dans n'importe quel composant. */
export const useTheme = () => useContext(ThemeContext);
