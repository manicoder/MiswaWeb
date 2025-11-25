import React, { createContext, useState } from 'react';
import type { ReactNode } from 'react';

type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
  colorScheme: ColorScheme;
  toggleColorScheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export { ThemeContext };

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize state from localStorage or default to 'light'
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    const savedScheme = localStorage.getItem('mlt-admin-color-scheme');
    return (savedScheme as ColorScheme) || 'light';
  });

  const toggleColorScheme = () => {
    setColorSchemeState((current) => {
      const newColorScheme = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('mlt-admin-color-scheme', newColorScheme);
      return newColorScheme;
    });
  };

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    localStorage.setItem('mlt-admin-color-scheme', scheme);
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleColorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
