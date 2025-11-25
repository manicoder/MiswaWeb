import { createTheme } from '@mantine/core';

// Create enhanced Mantine theme
export const theme = createTheme({
  fontFamily:
    'Inter, "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
  primaryColor: 'blue',
  defaultRadius: 'md',

  // Enhanced font sizes for better readability
  fontSizes: {
    xs: '0.75rem', // 12px - for labels and small text
    sm: '0.875rem', // 14px - for body text
    md: '1rem', // 16px - for main content (base size)
    lg: '1.125rem', // 18px - for emphasized text
    xl: '1.25rem', // 20px - for large text
  },

  // Consistent heading hierarchy
  headings: {
    sizes: {
      h1: { fontSize: '2rem', lineHeight: '1.2', fontWeight: '600' }, // 32px
      h2: { fontSize: '1.75rem', lineHeight: '1.25', fontWeight: '600' }, // 28px
      h3: { fontSize: '1.5rem', lineHeight: '1.3', fontWeight: '600' }, // 24px
      h4: { fontSize: '1.25rem', lineHeight: '1.35', fontWeight: '500' }, // 20px
      h5: { fontSize: '1.125rem', lineHeight: '1.4', fontWeight: '500' }, // 18px
      h6: { fontSize: '1rem', lineHeight: '1.45', fontWeight: '500' }, // 16px
    },
  },

  // Enhanced spacing scale
  spacing: {
    xs: '0.5rem', // 8px
    sm: '0.75rem', // 12px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
  },

  // Consistent radius scale
  radius: {
    xs: '0.25rem', // 4px
    sm: '0.375rem', // 6px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
  },

  // Enhanced shadows for better depth
  shadows: {
    xs: '0 1px 3px rgba(0, 0, 0, 0.1)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
  },
});
