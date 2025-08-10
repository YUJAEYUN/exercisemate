'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark'; // 실제 적용된 테마 (system일 때 해석된 값)
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  // 시스템 테마 감지
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // 실제 테마 계산
  const calculateActualTheme = (currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      return getSystemTheme();
    }
    return currentTheme;
  };

  // 테마 설정
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    
    const actual = calculateActualTheme(newTheme);
    setActualTheme(actual);
    
    // HTML 클래스 업데이트
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(actual);
    }
  };

  // 초기화 및 시스템 테마 변경 감지
  useEffect(() => {
    // 저장된 테마 불러오기
    const savedTheme = localStorage.getItem('theme') as Theme;
    const initialTheme = savedTheme || 'system';
    
    setThemeState(initialTheme);
    const actual = calculateActualTheme(initialTheme);
    setActualTheme(actual);
    
    // HTML 클래스 설정
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(actual);

    // 시스템 테마 변경 감지
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (initialTheme === 'system') {
        const newActual = getSystemTheme();
        setActualTheme(newActual);
        root.classList.remove('light', 'dark');
        root.classList.add(newActual);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const value: ThemeContextType = {
    theme,
    actualTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
