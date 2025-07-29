import React, { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useUser } from '../../../contexts/UserContext';
import { useAccessibility } from '../../../contexts/AccessibilityContext';
import styles from './Header.module.css';

// Simple Theme Toggle Component
const SimpleThemeToggle: React.FC = () => {
  const { state, toggleTheme } = useTheme();
  const { announce } = useAccessibility();

  const handleToggle = () => {
    toggleTheme();
    announce(`Switched to ${state.effectiveTheme === 'light' ? 'dark' : 'light'} theme`);
  };

  return (
    <button
      className={styles.themeToggle}
      onClick={handleToggle}
      aria-label={`Switch to ${state.effectiveTheme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${state.effectiveTheme === 'light' ? 'dark' : 'light'} theme`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        {state.effectiveTheme === 'light' ? (
          // Moon icon for dark mode
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        ) : (
          // Sun icon for light mode
          <path d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />
        )}
      </svg>
    </button>
  );
};

export const Header: React.FC = () => {
  const { state: userState, logout } = useUser();
  const { announce } = useAccessibility();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleUserMenuToggle = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
    announce(isUserMenuOpen ? 'User menu closed' : 'User menu opened');
  };

  const handleLogout = () => {
    logout();
    announce('Logged out successfully');
  };

  return (
    <header className={styles.header} role="banner">
      <div className={styles.container}>
        {/* Logo and Brand */}
        <div className={styles.brand}>
          <h1 className={styles.logo}>
            <span className={styles.logoIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </span>
            Project Mosaic
          </h1>
        </div>

        {/* Actions - Simplified */}
        <div className={styles.actions}>
          {/* Theme Toggle */}
          <SimpleThemeToggle />

          {/* User Menu */}
          <div className={styles.userMenu}>
            <button
              className={styles.userMenuButton}
              onClick={handleUserMenuToggle}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
              aria-label={`User menu for ${userState.user?.displayName || userState.user?.username}`}
            >
              <span className={styles.userAvatar} aria-hidden="true">
                {userState.user?.displayName?.[0] || userState.user?.username?.[0] || 'd'}
              </span>
              <span className={styles.userName}>
                {userState.user?.displayName || userState.user?.username || 'dev'}
              </span>
              <span className={styles.chevron} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </span>
            </button>

            {isUserMenuOpen && (
              <div className={styles.userMenuDropdown} role="menu">
                <button className={styles.menuItem} onClick={handleLogout} role="menuitem">
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
