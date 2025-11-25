import React, { useEffect } from 'react';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import App from '../App';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useTheme } from '../contexts/useTheme';
import { theme } from '../styles/theme';

// Component that connects ThemeContext to MantineProvider
export const MantineProviderWithTheme: React.FC = () => {
  console.log('MantineProviderWithTheme - Component rendering...');

  useEffect(() => {
    console.log('MantineProviderWithTheme - Component mounted');
  }, []);

  try {
    const { colorScheme } = useTheme();
    console.log('MantineProviderWithTheme - Color scheme:', colorScheme);

    return (
      <MantineProvider theme={theme} defaultColorScheme="light" forceColorScheme={colorScheme}>
        <ModalsProvider>
          <Notifications position="top-right" zIndex={1000} />
          <App />
        </ModalsProvider>
      </MantineProvider>
    );
  } catch (error) {
    console.error('MantineProviderWithTheme - Error:', error);
    return <div>Error loading application: {(error as Error).message}</div>;
  }
};

export const AppWithTheme: React.FC = () => {
  return (
    <ThemeProvider>
      <MantineProviderWithTheme />
    </ThemeProvider>
  );
};
