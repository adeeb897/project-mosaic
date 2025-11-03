import React, { ReactNode } from 'react';
import styles from './MainContent.module.css';

export interface MainContentProps {
  children: ReactNode;
  className?: string;
}

export const MainContent: React.FC<MainContentProps> = ({ children, className = '' }) => {
  return (
    <main
      className={`${styles.mainContent} ${className}`}
      role="main"
      id="main-content"
      tabIndex={-1}
    >
      <div className={styles.contentWrapper}>{children}</div>
    </main>
  );
};
