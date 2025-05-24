import React, { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useUser } from '../../../contexts/UserContext';
import { useAccessibility } from '../../../contexts/AccessibilityContext';
import { ThemeToggle } from '../../theme/ThemeToggle/ThemeToggle';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  useTheme();
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
              🧩
            </span>
            Project Mosaic
          </h1>
        </div>

        {/* Navigation */}
        <nav className={styles.nav} role="navigation" aria-label="Main navigation" id="navigation">
          <ul className={styles.navList}>
            <li>
              <a href="/dashboard" className={styles.navLink}>
                Dashboard
              </a>
            </li>
            <li>
              <a href="/chat" className={styles.navLink}>
                Chat
              </a>
            </li>
            <li>
              <a href="/modules" className={styles.navLink}>
                Modules
              </a>
            </li>
            <li>
              <a href="/profiles" className={styles.navLink}>
                Profiles
              </a>
            </li>
          </ul>
        </nav>

        {/* Actions */}
        <div className={styles.actions}>
          {/* Theme Toggle */}
          <ThemeToggle />

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
                {userState.user?.displayName?.[0] || userState.user?.username?.[0] || 'U'}
              </span>
              <span className={styles.userName}>
                {userState.user?.displayName || userState.user?.username}
              </span>
              <span className={styles.chevron} aria-hidden="true">
                ▼
              </span>
            </button>

            {isUserMenuOpen && (
              <div className={styles.userMenuDropdown} role="menu">
                <a href="/settings" className={styles.menuItem} role="menuitem">
                  Settings
                </a>
                <a href="/profile" className={styles.menuItem} role="menuitem">
                  Profile
                </a>
                <hr className={styles.menuDivider} />
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
