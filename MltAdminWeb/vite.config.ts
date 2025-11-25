import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '4173'),
    allowedHosts: [
      'healthcheck.railway.app',
      'mltadmin.mylittletales.com',
      'miswainternational.com',
      'mltadminweb-production.up.railway.app',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000, // Increased to allow larger chunks
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const parts = id.split('node_modules/')[1].split('/');
            const pkg = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
            
            // Group ALL React-related packages together to prevent dependency issues
            if (pkg.includes('react') || pkg.includes('@emotion') || pkg.includes('scheduler') || 
                pkg.includes('object-assign') || pkg.includes('prop-types') || pkg.includes('react-is') ||
                pkg.includes('react-router')) {
              return 'vendor-react';
            }
            
            // Group Mantine packages
            if (pkg.includes('@mantine')) {
              return 'vendor-mantine';
            }
            
            // Group TanStack packages
            if (pkg.includes('@tanstack')) {
              return 'vendor-tanstack';
            }
            
            // Group utility packages
            if (pkg.includes('axios') || pkg.includes('date-fns') || 
                pkg.includes('dayjs') || pkg.includes('lodash') || pkg.includes('moment')) {
              return 'vendor-utils';
            }
            
            // Group PDF libraries
            if (pkg.includes('jspdf') || pkg.includes('pdf-lib') || pkg.includes('xlsx') ||
                pkg.includes('pdfjs-dist')) {
              return 'vendor-pdf';
            }
            
            // Group other large packages
            if (pkg.includes('zustand') || pkg.includes('jsbarcode') || pkg.includes('@zxing')) {
              return 'vendor-other';
            }
            
            // Group CSV and data processing
            if (pkg.includes('papaparse') || pkg.includes('jszip')) {
              return 'vendor-data';
            }
            
            // Group icons
            if (pkg.includes('@tabler')) {
              return 'vendor-icons';
            }
            
            // Group core-js and polyfills
            if (pkg.includes('core-js') || pkg.includes('regenerator-runtime')) {
              return 'vendor-polyfills';
            }
            
            // Everything else goes to vendor-react to ensure React compatibility
            return 'vendor-react';
          }

          // Split major app features
          if (id.includes('/src/features/shopify')) return 'shopify';
          if (id.includes('/src/features/fulfillment')) return 'fulfillment';
          if (id.includes('/src/features/auth')) return 'auth';
          if (id.includes('/src/features/team')) return 'team';
          if (id.includes('/src/features/shipping')) return 'shipping';
          if (id.includes('/src/features/tools')) return 'tools';
          if (id.includes('/src/features/amazon')) return 'amazon';
          if (id.includes('/src/features/flipkart')) return 'flipkart';
          if (id.includes('/src/features/dashboard')) return 'dashboard';

          return undefined;
        },
      },
    },
  },
});
// Force redeploy - Sat Aug  2 23:08:30 +07 2025
