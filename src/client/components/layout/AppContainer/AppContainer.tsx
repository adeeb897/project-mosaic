import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import { Header } from '../Header/Header';
import { Sidebar } from '../Sidebar/Sidebar';
import { MainContent } from '../MainContent/MainContent';
import { SkipLinks } from '../../accessibility/SkipLinks/SkipLinks';
import { LoadingSpinner } from '../../common/LoadingSpinner/LoadingSpinner';
import styles from './AppContainer.module.css';

import { ChatInterface } from '../../chat/ChatInterface/ChatInterface';
import { Dashboard } from '../../dashboard/Dashboard/Dashboard';
import { Settings } from '../../settings/Settings';

// Placeholder components for routes
const Chat = () => <ChatInterface />;
const Modules = () => <div>Module Management</div>;
const Profiles = () => <div>Profile Management</div>;
const Login = () => <div>Login Page</div>;

export const AppContainer: React.FC = () => {
  const { state: userState } = useUser();

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

  // Main authenticated app layout
  return (
    <div className={styles.appContainer}>
      <SkipLinks />

      <Header />

      <div className={styles.mainLayout}>
        <Sidebar />

        <MainContent>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/profiles" element={<Profiles />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </MainContent>
      </div>
    </div>
  );
};
