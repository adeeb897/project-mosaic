import React from 'react';
import styles from './SkipLinks.module.css';

export const SkipLinks: React.FC = () => {
  const handleSkipToMain = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const mainContent = document.querySelector('main, [role="main"]') as HTMLElement;
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSkipToNav = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const navigation = document.querySelector('nav, [role="navigation"]') as HTMLElement;
    if (navigation) {
      navigation.focus();
      navigation.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSkipToSearch = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const searchInput = document.querySelector(
      'input[type="search"], [role="search"] input'
    ) as HTMLElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.skipLinks} role="navigation" aria-label="Skip links">
      <a href="#main-content" className={styles.skipLink} onClick={handleSkipToMain}>
        Skip to main content
      </a>
      <a href="#navigation" className={styles.skipLink} onClick={handleSkipToNav}>
        Skip to navigation
      </a>
      <a href="#search" className={styles.skipLink} onClick={handleSkipToSearch}>
        Skip to search
      </a>
    </div>
  );
};
