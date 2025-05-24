import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AccessibilitySettings } from '../../core/models/AccessibilitySettings';

export interface AccessibilityState {
  settings: AccessibilitySettings;
  isScreenReaderActive: boolean;
  focusedElement: string | null;
  announcements: string[];
}

export type AccessibilityAction =
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AccessibilitySettings> }
  | { type: 'SET_SCREEN_READER_ACTIVE'; payload: boolean }
  | { type: 'SET_FOCUSED_ELEMENT'; payload: string | null }
  | { type: 'ADD_ANNOUNCEMENT'; payload: string }
  | { type: 'CLEAR_ANNOUNCEMENTS' }
  | { type: 'RESET_SETTINGS' };

const defaultSettings: AccessibilitySettings = {
  font: {
    size: 16,
    family: 'system',
    weight: 'normal',
  },
  color: {
    highContrast: false,
    colorBlindnessMode: 'none',
  },
  motion: {
    reduceMotion: false,
    animationSpeed: 1,
  },
  screenReader: {
    optimized: false,
    enhancedDescriptions: false,
  },
  keyboard: {
    shortcuts: true,
    navigationMode: 'standard',
  },
  other: {
    autoPlayMedia: true,
    showCaptions: false,
    enhancedFocus: false,
  },
};

const initialState: AccessibilityState = {
  settings: defaultSettings,
  isScreenReaderActive: false,
  focusedElement: null,
  announcements: [],
};

function accessibilityReducer(
  state: AccessibilityState,
  action: AccessibilityAction
): AccessibilityState {
  switch (action.type) {
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };

    case 'SET_SCREEN_READER_ACTIVE':
      return {
        ...state,
        isScreenReaderActive: action.payload,
      };

    case 'SET_FOCUSED_ELEMENT':
      return {
        ...state,
        focusedElement: action.payload,
      };

    case 'ADD_ANNOUNCEMENT':
      return {
        ...state,
        announcements: [...state.announcements, action.payload],
      };

    case 'CLEAR_ANNOUNCEMENTS':
      return {
        ...state,
        announcements: [],
      };

    case 'RESET_SETTINGS':
      return {
        ...state,
        settings: defaultSettings,
      };

    default:
      return state;
  }
}

export interface AccessibilityContextValue {
  state: AccessibilityState;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  announce: (message: string) => void;
  clearAnnouncements: () => void;
  setFocusedElement: (elementId: string | null) => void;
  resetSettings: () => void;
  // Keyboard navigation helpers
  handleKeyboardNavigation: (event: KeyboardEvent) => boolean;
  // Focus management
  moveFocus: (direction: 'next' | 'previous' | 'first' | 'last') => void;
  trapFocus: (containerElement: HTMLElement) => () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

export interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(accessibilityReducer, initialState);

  // Load saved accessibility settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('mosaic-accessibility-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
      } catch (error) {
        console.warn('Failed to parse saved accessibility settings:', error);
      }
    }
  }, []);

  // Detect screen reader usage
  useEffect(() => {
    const detectScreenReader = () => {
      // Check for common screen reader indicators
      const hasScreenReader =
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        navigator.userAgent.includes('VoiceOver') ||
        window.speechSynthesis?.getVoices().length > 0;

      dispatch({ type: 'SET_SCREEN_READER_ACTIVE', payload: hasScreenReader });
    };

    detectScreenReader();

    // Listen for speech synthesis voices (indicates screen reader capability)
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', detectScreenReader);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', detectScreenReader);
      };
    }
  }, []);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;

    // Apply font settings
    if (state.settings.font.size !== 16) {
      root.style.fontSize = `${state.settings.font.size}px`;
    } else {
      root.style.removeProperty('font-size');
    }

    // Apply color settings
    if (state.settings.color.highContrast) {
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-high-contrast');
    }

    if (state.settings.color.colorBlindnessMode !== 'none') {
      root.setAttribute('data-color-blindness', state.settings.color.colorBlindnessMode);
    } else {
      root.removeAttribute('data-color-blindness');
    }

    // Apply motion settings
    if (state.settings.motion.reduceMotion) {
      root.style.setProperty('--animation-duration', '0ms');
      root.style.setProperty('--transition-duration', '0ms');
    } else {
      const speed = state.settings.motion.animationSpeed;
      root.style.setProperty('--animation-duration', `${1000 / speed}ms`);
      root.style.setProperty('--transition-duration', `${250 / speed}ms`);
    }

    // Apply focus enhancement
    if (state.settings.other.enhancedFocus) {
      root.setAttribute('data-enhanced-focus', 'true');
    } else {
      root.removeAttribute('data-enhanced-focus');
    }

    // Save settings
    localStorage.setItem('mosaic-accessibility-settings', JSON.stringify(state.settings));
  }, [state.settings]);

  // Global keyboard navigation handler
  useEffect(() => {
    const handleGlobalKeydown = (event: KeyboardEvent) => {
      // Handle global keyboard shortcuts
      if (state.settings.keyboard.shortcuts) {
        // Alt + 1: Skip to main content
        if (event.altKey && event.key === '1') {
          event.preventDefault();
          const mainContent = document.querySelector('main, [role="main"]') as HTMLElement;
          if (mainContent) {
            mainContent.focus();
            announce('Skipped to main content');
          }
          return;
        }

        // Alt + 2: Skip to navigation
        if (event.altKey && event.key === '2') {
          event.preventDefault();
          const navigation = document.querySelector('nav, [role="navigation"]') as HTMLElement;
          if (navigation) {
            navigation.focus();
            announce('Skipped to navigation');
          }
          return;
        }

        // Escape: Clear focus trap or close modals
        if (event.key === 'Escape') {
          const activeModal = document.querySelector('[role="dialog"][aria-modal="true"]');
          if (activeModal) {
            const closeButton = activeModal.querySelector(
              '[aria-label*="close"], [aria-label*="Close"]'
            ) as HTMLElement;
            if (closeButton) {
              closeButton.click();
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeydown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [state.settings.keyboard.shortcuts]);

  const updateSettings = (settings: Partial<AccessibilitySettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  };

  const announce = (message: string) => {
    dispatch({ type: 'ADD_ANNOUNCEMENT', payload: message });

    // Create live region announcement
    const liveRegion = document.getElementById('accessibility-live-region');
    if (liveRegion) {
      liveRegion.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  };

  const clearAnnouncements = () => {
    dispatch({ type: 'CLEAR_ANNOUNCEMENTS' });
  };

  const setFocusedElement = (elementId: string | null) => {
    dispatch({ type: 'SET_FOCUSED_ELEMENT', payload: elementId });
  };

  const resetSettings = () => {
    dispatch({ type: 'RESET_SETTINGS' });
  };

  const handleKeyboardNavigation = (event: KeyboardEvent): boolean => {
    if (!state.settings.keyboard.shortcuts) return false;

    const { key } = event;

    // Tab navigation
    if (key === 'Tab') {
      // Let browser handle tab navigation, but track focus
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.id) {
          setFocusedElement(activeElement.id);
        }
      }, 0);
      return false;
    }

    // Arrow key navigation for enhanced mode
    if (state.settings.keyboard.navigationMode === 'enhanced') {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        const focusableElements = getFocusableElements();
        const currentIndex = focusableElements.findIndex(el => el === document.activeElement);

        let nextIndex = currentIndex;

        switch (key) {
          case 'ArrowDown':
          case 'ArrowRight':
            nextIndex = (currentIndex + 1) % focusableElements.length;
            break;
          case 'ArrowUp':
          case 'ArrowLeft':
            nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
            break;
        }

        if (nextIndex !== currentIndex) {
          event.preventDefault();
          focusableElements[nextIndex].focus();
          return true;
        }
      }
    }

    return false;
  };

  const moveFocus = (direction: 'next' | 'previous' | 'first' | 'last') => {
    const focusableElements = getFocusableElements();
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);

    let nextIndex = 0;

    switch (direction) {
      case 'next':
        nextIndex = (currentIndex + 1) % focusableElements.length;
        break;
      case 'previous':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
        break;
      case 'first':
        nextIndex = 0;
        break;
      case 'last':
        nextIndex = focusableElements.length - 1;
        break;
    }

    if (focusableElements[nextIndex]) {
      focusableElements[nextIndex].focus();
    }
  };

  const trapFocus = (containerElement: HTMLElement): (() => void) => {
    const focusableElements = getFocusableElements(containerElement);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    containerElement.addEventListener('keydown', handleKeydown);

    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    // Return cleanup function
    return () => {
      containerElement.removeEventListener('keydown', handleKeydown);
    };
  };

  const getFocusableElements = (container: HTMLElement = document.body): HTMLElement[] => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  };

  const value: AccessibilityContextValue = {
    state,
    updateSettings,
    announce,
    clearAnnouncements,
    setFocusedElement,
    resetSettings,
    handleKeyboardNavigation,
    moveFocus,
    trapFocus,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {/* Live region for screen reader announcements */}
      <div
        id="accessibility-live-region"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextValue => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
