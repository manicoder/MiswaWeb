import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppWithTheme } from './components/AppWithTheme';

// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import './styles/globals.css';

// Note: Shopify credentials are now managed by the backend from database
// No need for localStorage credential management

// Add console logging for debugging
console.log('MLT Admin Web - Starting application...');
console.log('Environment:', import.meta.env.MODE);
console.log('API URL:', import.meta.env.VITE_API_URL);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // 30 minutes - much longer stale time for aggressive caching
      gcTime: 1000 * 60 * 60 * 2, // 2 hours - keep data in memory much longer
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch when returning to window
      refetchOnReconnect: false, // Don't refetch when reconnecting
      refetchOnMount: false, // Don't refetch when component remounts if data is still fresh
    },
  },
});

const container = document.getElementById('root')!;
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

// Add error boundary for the entire app
// Determine basename based on environment
const getBasename = () => {
  // Check if we're running on miswainternational.com
  if (window.location.hostname === 'miswainternational.com' || 
      window.location.hostname.includes('miswainternational.com')) {
    return '/mltadmin';
  }
  // For development and other environments, use root
  return '/';
};

root.render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter basename={getBasename()}>
      <AppWithTheme />
    </BrowserRouter>
  </QueryClientProvider>,
);
