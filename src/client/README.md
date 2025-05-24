# Project Mosaic - Client Application

This directory contains the React-based client application for Project Mosaic, featuring a comprehensive UI component library with accessibility, theming, and responsive design.

## Architecture Overview

The client application follows a modular architecture with the following key components:

### Core Structure

```
src/client/
├── components/          # Reusable UI components
│   ├── accessibility/   # Accessibility-focused components
│   ├── common/         # Common utility components
│   ├── layout/         # Layout and navigation components
│   └── theme/          # Theme-related components
├── contexts/           # React context providers
├── styles/            # Global styles and CSS variables
└── index.tsx          # Application entry point
```

## Key Features

### 🎨 Theme System
- **Multi-theme support**: Light, dark, and system preference detection
- **High contrast modes**: Enhanced accessibility with high contrast themes
- **CSS custom properties**: Consistent theming across all components
- **Persistent preferences**: Theme settings saved to localStorage

### ♿ Accessibility
- **WCAG 2.1 AA compliance**: Comprehensive accessibility standards
- **Keyboard navigation**: Full keyboard support with focus management
- **Screen reader optimization**: ARIA labels, landmarks, and live regions
- **Motion preferences**: Respects user's reduced motion preferences
- **Enhanced focus indicators**: Customizable focus styles for better visibility

### 📱 Responsive Design
- **Mobile-first approach**: Optimized for all screen sizes
- **Flexible layouts**: CSS Grid and Flexbox for adaptive designs
- **Touch-friendly**: Appropriate touch targets and interactions
- **Progressive enhancement**: Works across different device capabilities

### 🧩 Component Library

#### Layout Components

**AppContainer**
- Root application container with routing
- Authentication state management
- Loading states and error boundaries

**Header**
- Sticky navigation header
- User menu with dropdown
- Theme toggle integration
- Responsive design with mobile adaptations

**Sidebar**
- Collapsible navigation sidebar
- Icon-based navigation with labels
- Quick action buttons
- Mobile-friendly overlay behavior

**MainContent**
- Semantic main content area
- Skip link target for accessibility
- Scrollable content with custom scrollbars

#### Accessibility Components

**SkipLinks**
- Skip to main content, navigation, and search
- Keyboard-accessible with proper focus management
- Hidden until focused for screen reader users

**AccessibilityProvider**
- Global accessibility state management
- Keyboard navigation helpers
- Focus management utilities
- Screen reader announcements

#### Common Components

**LoadingSpinner**
- Accessible loading indicator
- Multiple sizes and color variants
- Respects reduced motion preferences
- Screen reader announcements

**ErrorBoundary**
- React error boundary with user-friendly fallbacks
- Development error details
- Retry functionality
- Graceful error handling

**ThemeToggle**
- Theme switching between light/dark/system
- Visual indicators for current theme
- Keyboard accessible
- Screen reader announcements

## Context Providers

### ThemeContext
Manages application theming with support for:
- Light/dark/system theme modes
- High contrast accessibility modes
- Font size and motion preferences
- Persistent theme storage

### UserContext
Handles user authentication and preferences:
- Authentication state management
- User preference synchronization
- Login/logout functionality
- Profile management

### AccessibilityContext
Provides accessibility features:
- Global keyboard navigation
- Focus management utilities
- Screen reader announcements
- Accessibility setting persistence

## Styling Architecture

### CSS Custom Properties
The application uses CSS custom properties for consistent theming:

```css
:root {
  /* Colors */
  --color-primary: #2563eb;
  --color-background: #ffffff;
  --color-text-primary: #0f172a;

  /* Spacing */
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;

  /* Typography */
  --font-size-base: 1rem;
  --font-weight-medium: 500;

  /* Transitions */
  --transition-fast: 150ms ease-in-out;
}
```

### CSS Modules
Components use CSS Modules for scoped styling:
- Prevents style conflicts
- Enables component-specific styling
- Supports theme-aware styles
- Maintains performance

### Responsive Breakpoints
```css
/* Mobile */
@media (max-width: 768px) { }

/* Tablet */
@media (min-width: 768px) and (max-width: 1024px) { }

/* Desktop */
@media (min-width: 1024px) { }
```

## Accessibility Standards

### WCAG 2.1 AA Compliance
- **Perceivable**: High contrast ratios, scalable text, alternative text
- **Operable**: Keyboard navigation, no seizure-inducing content
- **Understandable**: Clear navigation, consistent interface
- **Robust**: Compatible with assistive technologies

### Keyboard Navigation
- Tab order follows logical flow
- All interactive elements are keyboard accessible
- Custom keyboard shortcuts (Alt+1 for main content, Alt+2 for navigation)
- Escape key closes modals and dropdowns

### Screen Reader Support
- Semantic HTML structure
- ARIA labels and descriptions
- Live regions for dynamic content
- Skip links for efficient navigation

### Focus Management
- Visible focus indicators
- Focus trapping in modals
- Logical focus order
- Enhanced focus mode for better visibility

## Performance Considerations

### Code Splitting
- Route-based code splitting
- Component lazy loading
- Dynamic imports for large dependencies

### Optimization
- CSS custom properties for efficient theming
- Minimal re-renders with React.memo
- Efficient event handling
- Optimized bundle sizes

### Loading States
- Progressive loading with skeleton screens
- Graceful degradation for slow connections
- Offline support considerations

## Testing

### Unit Tests
- Component rendering tests
- Accessibility testing with jest-axe
- User interaction testing
- Context provider testing

### Integration Tests
- Theme switching functionality
- Navigation flow testing
- Accessibility compliance testing

### E2E Tests
- Complete user workflows
- Cross-browser compatibility
- Responsive design validation

## Browser Support

### Modern Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Progressive Enhancement
- Core functionality works without JavaScript
- Enhanced features with JavaScript enabled
- Graceful degradation for older browsers

## Development Guidelines

### Component Creation
1. Use TypeScript for type safety
2. Implement proper accessibility attributes
3. Include CSS Modules for styling
4. Add comprehensive tests
5. Document props and usage

### Accessibility Checklist
- [ ] Semantic HTML structure
- [ ] ARIA labels where needed
- [ ] Keyboard navigation support
- [ ] Focus management
- [ ] Screen reader testing
- [ ] Color contrast validation
- [ ] Motion preference respect

### Performance Checklist
- [ ] Minimize bundle size
- [ ] Optimize images and assets
- [ ] Implement code splitting
- [ ] Use React.memo for expensive components
- [ ] Avoid unnecessary re-renders

## Getting Started

### Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Environment Variables
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_THEME_STORAGE_KEY=mosaic-theme-mode
```

## Contributing

When contributing to the client application:

1. Follow the established component patterns
2. Ensure accessibility compliance
3. Add comprehensive tests
4. Update documentation
5. Test across different devices and browsers

## Future Enhancements

### Planned Features
- Advanced theme customization
- Component library documentation site
- Storybook integration
- Advanced accessibility features
- Performance monitoring
- Internationalization support

### Architecture Improvements
- Micro-frontend architecture
- Advanced state management
- Service worker integration
- Advanced caching strategies
