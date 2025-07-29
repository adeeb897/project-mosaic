import React, { useState } from 'react';
import { useAccessibility } from '../../../contexts/AccessibilityContext';
import styles from './Sidebar.module.css';

// SVG Icon Components
const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
  </svg>
);

const ModuleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
  </svg>
);

const QuickChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
    <path d="M13,14C9.64,14 8.54,15.35 8.18,16.24C9.25,16.7 10,17.76 10,19A3,3 0 0,1 7,22A3,3 0 0,1 4,19C4,17.69 4.83,16.58 6,16.17V7.5A2.5,2.5 0 0,1 8.5,5A2.5,2.5 0 0,1 11,7.5V16C11,15.62 11.38,15.25 11.75,15.25C12.12,15.25 12.5,15.62 12.5,16V14.5C12.5,14.22 12.72,14 13,14Z" />
  </svg>
);

const ChevronIcon = ({ direction }: { direction: 'left' | 'right' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
    <path
      d={
        direction === 'left'
          ? 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z'
          : 'M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z'
      }
    />
  </svg>
);

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { announce } = useAccessibility();

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    announce(isCollapsed ? 'Sidebar expanded' : 'Sidebar collapsed');
  };

  const navigationItems = [
    { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
    { href: '/chat', label: 'Chat', icon: ChatIcon },
    { href: '/modules', label: 'Modules', icon: ModuleIcon },
    { href: '/profiles', label: 'Profiles', icon: ProfileIcon },
    { href: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside
      className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} slide-in-left`}
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
            <ChevronIcon direction={isCollapsed ? 'right' : 'left'} />
          </span>
        </button>
      </div>

      <nav className={styles.navigation}>
        <ul className={styles.navList}>
          {navigationItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <li key={item.href} className={styles.navItem}>
                <a
                  href={item.href}
                  className={`${styles.navLink} fade-in`}
                  style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                  aria-label={item.label}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className={styles.navIcon} aria-hidden="true">
                    <IconComponent />
                  </span>
                  {!isCollapsed && <span className={styles.navLabel}>{item.label}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.quickActions}>
          <button
            className={`${styles.quickActionButton} scale-in`}
            style={{ animationDelay: '0.4s' }}
            aria-label="Quick chat"
            title={isCollapsed ? 'Quick chat' : undefined}
          >
            <span className={styles.quickActionIcon} aria-hidden="true">
              <QuickChatIcon />
            </span>
            {!isCollapsed && <span className={styles.quickActionLabel}>Quick Chat</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
