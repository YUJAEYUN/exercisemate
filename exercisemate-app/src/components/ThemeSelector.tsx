'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      value: 'light' as const,
      label: '라이트',
      icon: Sun,
      description: '밝은 테마'
    },
    {
      value: 'dark' as const,
      label: '다크',
      icon: Moon,
      description: '어두운 테마'
    },
    {
      value: 'system' as const,
      label: '시스템',
      icon: Monitor,
      description: '시스템 설정 따름'
    }
  ];

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">테마 설정</h3>
      <div className="grid grid-cols-3 gap-3">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isSelected = theme === themeOption.value;
          
          return (
            <button
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
                bg-white dark:bg-gray-800
              `}
            >
              <div className="flex flex-col items-center space-y-2">
                <Icon 
                  className={`w-6 h-6 ${
                    isSelected 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`} 
                />
                <div className="text-center">
                  <p className={`text-sm font-medium ${
                    isSelected 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {themeOption.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {themeOption.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
