import React from 'react';
import { useUser } from '../../../contexts/UserContext';
import styles from './Dashboard.module.css';

export const Dashboard: React.FC = () => {
  const { state: userState } = useUser();

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Welcome to Project Mosaic</h1>
        <p>Hello, {userState.user?.username || 'User'}! Ready to build something amazing?</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardIcon}>💬</div>
          <h3>Chat Interface</h3>
          <p>Engage with AI assistants using our advanced chat system with multi-modal support.</p>
          <a href="/chat" className={styles.cardLink}>
            Start Chatting →
          </a>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon}>🧩</div>
          <h3>Module Management</h3>
          <p>Install, configure, and manage AI modules to extend your assistant's capabilities.</p>
          <a href="/modules" className={styles.cardLink}>
            Manage Modules →
          </a>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon}>👤</div>
          <h3>Profile System</h3>
          <p>Create and customize AI profiles with different personalities and configurations.</p>
          <a href="/profiles" className={styles.cardLink}>
            Manage Profiles →
          </a>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon}>⚙️</div>
          <h3>Settings</h3>
          <p>Configure your preferences, themes, and system settings.</p>
          <a href="/settings" className={styles.cardLink}>
            Open Settings →
          </a>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <h4>System Status</h4>
          <div className={styles.statusIndicator}>
            <span className={styles.statusDot}></span>
            All systems operational
          </div>
        </div>

        <div className={styles.statCard}>
          <h4>Quick Stats</h4>
          <ul>
            <li>Active Modules: 0</li>
            <li>Profiles Created: 0</li>
            <li>Chat Sessions: 1</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
