import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import { Header } from '../Header/Header';
import { SkipLinks } from '../../accessibility/SkipLinks/SkipLinks';
import { LoadingSpinner } from '../../common/LoadingSpinner/LoadingSpinner';
import styles from './AppContainer.module.css';

import { ChatInterface } from '../../chat/ChatInterface/ChatInterface';
import { Dashboard } from '../../dashboard/Dashboard/Dashboard';
import { Settings } from '../../settings/Settings';

// Floating Action Buttons Component
const FloatingActions: React.FC<{
  onDashboardClick: () => void;
  onSettingsClick: () => void;
}> = ({ onDashboardClick, onSettingsClick }) => (
  <div className={styles.floatingActions}>
    <button
      className={styles.fabButton}
      onClick={onDashboardClick}
      aria-label="Open Dashboard"
      title="Dashboard"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
      </svg>
    </button>
    <button
      className={styles.fabButton}
      onClick={onSettingsClick}
      aria-label="Open Settings"
      title="Settings"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
      </svg>
    </button>
  </div>
);

// Modal Overlay Component
const ModalOverlay: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          {title && <h2>{title}</h2>}
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
};

const Login = () => <div>Login Page</div>;

export const AppContainer: React.FC = () => {
  const { state: userState } = useUser();
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Show loading spinner while checking authentication
  if (userState.isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <p>Loading Project Mosaic...</p>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!userState.isAuthenticated) {
    return (
      <div className={styles.loginContainer}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  // Main authenticated app layout - Chat-first design
  return (
    <div className={styles.appContainer}>
      <SkipLinks />
      <Header />

      {/* Main content area - Chat interface */}
      <main className={styles.mainContent}>
        <Routes>
          <Route path="/" element={<ChatInterface />} />
          <Route path="/chat" element={<ChatInterface />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Floating Action Buttons */}
      <FloatingActions
        onDashboardClick={() => setIsDashboardOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

      {/* Dashboard Modal */}
      <ModalOverlay
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        title="Dashboard"
      >
        <Dashboard />
      </ModalOverlay>

      {/* Settings Modal */}
      <ModalOverlay
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Settings"
      >
        <Settings />
      </ModalOverlay>
    </div>
  );
};
