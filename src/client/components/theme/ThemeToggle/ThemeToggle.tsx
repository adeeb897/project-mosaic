import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAccessibility } from '../../../contexts/AccessibilityContext';
import styles from './ThemeToggle.module.css';

export const ThemeToggle: React.FC = () => {
  const { state, toggleTheme, setMode } = useTheme();
  const { announce } = useAccessibility();

  const handleToggle = () => {
    toggleTheme();
    const newTheme = state.effectiveTheme === 'light' ? 'dark' : 'light';
    announce(`Switched to ${newTheme} theme`);
  };

  const handleSystemMode = () => {
    setMode('system');
    announce('Switched to system theme preference');
  };

  return (
    <div className={styles.themeToggle}>
      <button
        className={styles.toggleButton}
        onClick={handleToggle}
        aria-label={`Switch to ${state.effectiveTheme === 'light' ? 'dark' : 'light'} theme`}
        title={`Current theme: ${state.mode === 'system' ? 'system' : state.effectiveTheme}`}
      >
        <span className={styles.icon} aria-hidden="true">
          {state.effectiveTheme === 'light' ? '🌙' : '☀️'}
        </span>
      </button>

      {state.mode !== 'system' && (
        <button
          className={styles.systemButton}
          onClick={handleSystemMode}
          aria-label="Use system theme preference"
          title="Use system theme"
        >
          <span className={styles.icon} aria-hidden="true">
            🖥️
          </span>
        </button>
      )}
    </div>
  );
};
