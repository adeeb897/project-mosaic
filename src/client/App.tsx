import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider } from './contexts/UserContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { AppContainer } from './components/layout/AppContainer/AppContainer';
import { ErrorBoundary } from './components/common/ErrorBoundary/ErrorBoundary';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <UserProvider>
            <AccessibilityProvider>
              <AppContainer />
            </AccessibilityProvider>
          </UserProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};
