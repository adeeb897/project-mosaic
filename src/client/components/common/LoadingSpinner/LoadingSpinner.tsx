import React from 'react';
import styles from './LoadingSpinner.module.css';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  label = 'Loading...',
  className = '',
}) => {
  const spinnerClasses = [styles.spinner, styles[size], styles[color], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.container} role="status" aria-label={label}>
      <div className={spinnerClasses}>
        <div className={styles.circle}></div>
        <div className={styles.circle}></div>
        <div className={styles.circle}></div>
        <div className={styles.circle}></div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
};
