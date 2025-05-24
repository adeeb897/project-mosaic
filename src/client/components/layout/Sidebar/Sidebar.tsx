import React, { useState } from 'react';
import { useAccessibility } from '../../../contexts/AccessibilityContext';
import styles from './Sidebar.module.css';

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { announce } = useAccessibility();

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    announce(isCollapsed ? 'Sidebar expanded' : 'Sidebar collapsed');
  };

  const navigationItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/chat', label: 'Chat', icon: '💬' },
    { href: '/modules', label: 'Modules', icon: '🧩' },
    { href: '/profiles', label: 'Profiles', icon: '👤' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside
      className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}
      role="navigation"
      aria-label="Sidebar navigation"
    >
      <div className={styles.sidebarHeader}>
        <button
          className={styles.toggleButton}
          onClick={handleToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
        >
          <span className={styles.toggleIcon} aria-hidden="true">
            {isCollapsed ? '▶' : '◀'}
          </span>
        </button>
      </div>

      <nav className={styles.navigation}>
        <ul className={styles.navList}>
          {navigationItems.map(item => (
            <li key={item.href} className={styles.navItem}>
              <a
                href={item.href}
                className={styles.navLink}
                aria-label={item.label}
                title={isCollapsed ? item.label : undefined}
              >
                <span className={styles.navIcon} aria-hidden="true">
                  {item.icon}
                </span>
                {!isCollapsed && <span className={styles.navLabel}>{item.label}</span>}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.quickActions}>
          <button
            className={styles.quickActionButton}
            aria-label="Quick chat"
            title={isCollapsed ? 'Quick chat' : undefined}
          >
            <span className={styles.quickActionIcon} aria-hidden="true">
              ⚡
            </span>
            {!isCollapsed && <span className={styles.quickActionLabel}>Quick Chat</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
