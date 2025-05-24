import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AccessibilitySettings } from '../../core/models/AccessibilitySettings';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'normal' | 'high-contrast' | 'high-contrast-dark';

export interface ThemeState {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  systemPrefersDark: boolean;
  effectiveTheme: 'light' | 'dark';
  accessibilitySettings: Partial<AccessibilitySettings>;
}

export type ThemeAction =
  | { type: 'SET_MODE'; payload: ThemeMode }
  | { type: 'SET_COLOR_SCHEME'; payload: ColorScheme }
  | { type: 'SET_SYSTEM_PREFERENCE'; payload: boolean }
  | { type: 'UPDATE_ACCESSIBILITY'; payload: Partial<AccessibilitySettings> }
  | { type: 'RESET_THEME' };

const initialState: ThemeState = {
  mode: 'system',
  colorScheme: 'normal',
  systemPrefersDark: false,
  effectiveTheme: 'light',
  accessibilitySettings: {
    color: {
      highContrast: false,
      colorBlindnessMode: 'none',
    },
    motion: {
      reduceMotion: false,
      animationSpeed: 1,
    },
    font: {
      size: 16,
      family: 'system',
      weight: 'normal',
    },
    other: {
      autoPlayMedia: true,
      showCaptions: false,
      enhancedFocus: false,
    },
  },
};

function themeReducer(state: ThemeState, action: ThemeAction): ThemeState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        effectiveTheme: getEffectiveTheme(action.payload, state.systemPrefersDark),
      };

    case 'SET_COLOR_SCHEME':
      return {
        ...state,
        colorScheme: action.payload,
      };

    case 'SET_SYSTEM_PREFERENCE':
      return {
        ...state,
        systemPrefersDark: action.payload,
        effectiveTheme: getEffectiveTheme(state.mode, action.payload),
      };

    case 'UPDATE_ACCESSIBILITY':
      return {
        ...state,
        accessibilitySettings: {
          ...state.accessibilitySettings,
          ...action.payload,
        },
      };

    case 'RESET_THEME':
      return {
        ...initialState,
        systemPrefersDark: state.systemPrefersDark,
        effectiveTheme: getEffectiveTheme('system', state.systemPrefersDark),
      };

    default:
      return state;
  }
}

function getEffectiveTheme(mode: ThemeMode, systemPrefersDark: boolean): 'light' | 'dark' {
  if (mode === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return mode;
}

export interface ThemeContextValue {
  state: ThemeState;
  setMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  updateAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => void;
  resetTheme: () => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  // Load saved preferences from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('mosaic-theme-mode') as ThemeMode;
    const savedColorScheme = localStorage.getItem('mosaic-color-scheme') as ColorScheme;
    const savedAccessibility = localStorage.getItem('mosaic-accessibility-settings');

    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      dispatch({ type: 'SET_MODE', payload: savedTheme });
    }

    if (
      savedColorScheme &&
      ['normal', 'high-contrast', 'high-contrast-dark'].includes(savedColorScheme)
    ) {
      dispatch({ type: 'SET_COLOR_SCHEME', payload: savedColorScheme });
    }

    if (savedAccessibility) {
      try {
        const accessibilitySettings = JSON.parse(savedAccessibility);
        dispatch({ type: 'UPDATE_ACCESSIBILITY', payload: accessibilitySettings });
      } catch (error) {
        console.warn('Failed to parse saved accessibility settings:', error);
      }
    }
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      dispatch({ type: 'SET_SYSTEM_PREFERENCE', payload: e.matches });
    };

    // Set initial value
    dispatch({ type: 'SET_SYSTEM_PREFERENCE', payload: mediaQuery.matches });

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Listen for system motion preferences
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      dispatch({
        type: 'UPDATE_ACCESSIBILITY',
        payload: {
          motion: {
            reduceMotion: e.matches,
            animationSpeed: state.accessibilitySettings.motion?.animationSpeed || 1,
          },
        },
      });
    };

    // Set initial value
    dispatch({
      type: 'UPDATE_ACCESSIBILITY',
      payload: {
        motion: {
          reduceMotion: mediaQuery.matches,
          animationSpeed: state.accessibilitySettings.motion?.animationSpeed || 1,
        },
      },
    });

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [state.accessibilitySettings.motion?.animationSpeed]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Determine theme attribute
    let themeAttr: string = state.effectiveTheme;
    if (state.colorScheme === 'high-contrast') {
      themeAttr = 'high-contrast';
    } else if (state.colorScheme === 'high-contrast-dark') {
      themeAttr = 'high-contrast-dark';
    }

    root.setAttribute('data-theme', themeAttr);

    // Apply accessibility settings
    if (state.accessibilitySettings.other?.enhancedFocus) {
      root.setAttribute('data-accessibility-enhanced-focus', 'true');
    } else {
      root.removeAttribute('data-accessibility-enhanced-focus');
    }

    // Apply font size
    if (state.accessibilitySettings.font?.size && state.accessibilitySettings.font.size !== 16) {
      root.style.fontSize = `${state.accessibilitySettings.font.size}px`;
    } else {
      root.style.removeProperty('font-size');
    }

    // Apply motion preferences
    if (state.accessibilitySettings.motion?.reduceMotion) {
      root.style.setProperty('--transition-fast', '0ms');
      root.style.setProperty('--transition-normal', '0ms');
      root.style.setProperty('--transition-slow', '0ms');
    } else {
      const speed = state.accessibilitySettings.motion?.animationSpeed || 1;
      root.style.setProperty('--transition-fast', `${150 / speed}ms`);
      root.style.setProperty('--transition-normal', `${250 / speed}ms`);
      root.style.setProperty('--transition-slow', `${350 / speed}ms`);
    }

    // Save preferences
    localStorage.setItem('mosaic-theme-mode', state.mode);
    localStorage.setItem('mosaic-color-scheme', state.colorScheme);
    localStorage.setItem(
      'mosaic-accessibility-settings',
      JSON.stringify(state.accessibilitySettings)
    );
  }, [state]);

  const setMode = (mode: ThemeMode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
  };

  const setColorScheme = (scheme: ColorScheme) => {
    dispatch({ type: 'SET_COLOR_SCHEME', payload: scheme });
  };

  const updateAccessibilitySettings = (settings: Partial<AccessibilitySettings>) => {
    dispatch({ type: 'UPDATE_ACCESSIBILITY', payload: settings });
  };

  const resetTheme = () => {
    dispatch({ type: 'RESET_THEME' });
  };

  const toggleTheme = () => {
    const newMode = state.effectiveTheme === 'light' ? 'dark' : 'light';
    setMode(newMode);
  };

  const value: ThemeContextValue = {
    state,
    setMode,
    setColorScheme,
    updateAccessibilitySettings,
    resetTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
